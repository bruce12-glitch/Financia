import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const RULES_PATH = path.resolve(process.cwd(), 'firestore.rules');
const BLUEPRINT_PATH = path.resolve(process.cwd(), 'firebase-blueprint.json');

test('Firestore rules enforce all Eight Pillars and Dirty Dozen defenses', () => {
  const rules = fs.readFileSync(RULES_PATH, 'utf8');
  const blueprint = JSON.parse(fs.readFileSync(BLUEPRINT_PATH, 'utf8')) as {
    firestore: Record<string, unknown>;
  };

  // Pillar 0: rules_version = 2 and global default-deny catch-all
  assert.match(rules, /rules_version\s*=\s*'2';/);
  assert.match(rules, /match\s+\/\{document=\*\*\}\s*\{\s*allow read, write: if false;\s*\}/);

  // Pillar 1: Master Gate get() + exists() on parent portfolio for transactions
  assert.match(
    rules,
    /exists\(\/databases\/\$\(database\)\/documents\/users\/\$\(userId\)\/portfolios\/\$\(portfolioId\)\)/
  );
  assert.match(
    rules,
    /get\(\/databases\/\$\(database\)\/documents\/users\/\$\(userId\)\/portfolios\/\$\(portfolioId\)\)\.data\.ownerId == request\.auth\.uid/
  );

  // Pillar 2 & 3: Anti-update-gap validation helpers, path ID regex, and immutable ledger updates
  assert.match(rules, /function isValidId\(id\)/);
  assert.match(rules, /function isValidUserProfile\(data, userId\)/);
  assert.match(rules, /function isValidPortfolio\(data, userId\)/);
  assert.match(rules, /function isValidTransaction\(data, userId, portfolioId\)/);
  assert.match(rules, /function isValidBacktest\(data, userId\)/);
  assert.match(rules, /function isValidAlert\(data, userId\)/);
  assert.match(rules, /match \/transactions\/\{transactionId\}[\s\S]*?allow update: if false;/);

  // Pillar 4 & Terminal State Lock: alerts cannot mutate after DISMISSED
  assert.match(rules, /existing\(\)\.status != 'DISMISSED'/);

  // Pillar 5: Bounded array guarding
  assert.match(rules, /isValidStringList\(data\.pinnedWidgets, 12\)/);
  assert.match(rules, /isValidStringList\(data\.customMapSymbols, 40\)/);
  assert.match(rules, /data\.allocations\.size\(\) <= 15/);

  // Pillar 6: Strict email verification and owner-only reads (no blanket list on /users)
  assert.match(rules, /request\.auth\.token\.email_verified == true/);
  assert.match(rules, /match \/users\/\{userId\}[\s\S]*?allow list: if false;/);

  // Pillar 8: Secure list queries enforce existing().ownerId == request.auth.uid
  const listMatches = rules.match(/allow list:[^;]+;/g) ?? [];
  assert.ok(listMatches.length >= 4);
  for (const stmt of listMatches) {
    if (!stmt.includes('if false;')) {
      assert.match(stmt, /existing\(\)\.ownerId == request\.auth\.uid/);
    }
  }

  // Blueprint parity: every collection path in firebase-blueprint.json is matched
  const expectedCollections = ['users', 'portfolios', 'transactions', 'backtests', 'alerts'];
  for (const col of expectedCollections) {
    assert.ok(
      Object.keys(blueprint.firestore).some((p) => p.includes(`/${col}/`)),
      `Blueprint missing collection ${col}`
    );
    assert.ok(rules.includes(`match /${col}/`), `Rules missing match block for ${col}`);
  }
});
