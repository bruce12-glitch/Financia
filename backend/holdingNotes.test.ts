import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { createBackendApp } from './app.ts';
import { createPersistenceStore } from './services/persistenceService.ts';

async function startTestServer() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'financia-notes-test-'));
  const storePath = path.join(tmpDir, 'store.json');
  const store = createPersistenceStore(storePath);
  const app = await createBackendApp(undefined, { store, skipVite: true });
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const addr = server.address();
  assert(addr && typeof addr === 'object');
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  return {
    baseUrl,
    cleanup: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      fs.rmSync(tmpDir, { recursive: true, force: true });
    },
  };
}

async function registerUser(baseUrl: string, email: string) {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Investor Test', email, password: 'StrongPassword123!' }),
  });
  assert.equal(res.status, 201);
  return (await res.json()) as { token: string; user: { id: string } };
}

test('holding notes API enforces auth, validates payloads, persists across requests, and isolates users', async () => {
  const { baseUrl, cleanup } = await startTestServer();
  try {
    // 1. Unauthenticated requests must be rejected with 401
    const unauthGet = await fetch(`${baseUrl}/api/holding-notes`);
    assert.equal(unauthGet.status, 401);

    const unauthPut = await fetch(`${baseUrl}/api/holding-notes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fundCode: 'PPFASFLEXICAP',
        securityName: 'HDFC BANK LIMITED',
        noteText: 'Should fail',
      }),
    });
    assert.equal(unauthPut.status, 401);

    // 2. Register two independent users
    const userA = await registerUser(baseUrl, 'notes_a@financia.test');
    const userB = await registerUser(baseUrl, 'notes_b@financia.test');

    // 3. Reject invalid/empty note text
    const invalidRes = await fetch(`${baseUrl}/api/holding-notes`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`,
      },
      body: JSON.stringify({
        fundCode: 'PPFASFLEXICAP',
        securityName: 'HDFC BANK LIMITED',
        noteText: '   ',
      }),
    });
    assert.equal(invalidRes.status, 400);

    // 4. Create holding note for User A
    const createRes = await fetch(`${baseUrl}/api/holding-notes`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`,
      },
      body: JSON.stringify({
        fundCode: 'PPFASFLEXICAP',
        securityName: 'HDFC BANK LIMITED',
        isin: 'INE040A01034',
        nseSymbol: 'HDFCBANK',
        noteText: 'Core private bank holding — track CASA & credit-deposit ratio.',
        stance: 'core',
      }),
    });
    assert.equal(createRes.status, 201);
    const createdPayload = (await createRes.json()) as {
      note: { id: string; holdingKey: string; stance: string; noteText: string };
    };
    assert.equal(createdPayload.note.holdingKey, 'PPFASFLEXICAP::INE040A01034');
    assert.equal(createdPayload.note.stance, 'core');

    // 5. Update same holding note idempotently via holdingKey
    const updateRes = await fetch(`${baseUrl}/api/holding-notes`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`,
      },
      body: JSON.stringify({
        fundCode: 'PPFASFLEXICAP',
        securityName: 'HDFC BANK LIMITED',
        isin: 'INE040A01034',
        nseSymbol: 'HDFCBANK',
        noteText: 'Updated note: strong deposit traction in Q3.',
        stance: 'watch',
      }),
    });
    assert.equal(updateRes.status, 200);
    const updatedPayload = (await updateRes.json()) as {
      note: { id: string; stance: string; noteText: string };
      notes: Array<{ id: string }>;
    };
    assert.equal(updatedPayload.note.id, createdPayload.note.id);
    assert.equal(updatedPayload.notes.length, 1);
    assert.equal(updatedPayload.note.stance, 'watch');

    // 6. Verify User B cannot read or delete User A's note
    const userBGet = await fetch(`${baseUrl}/api/holding-notes?fundCode=PPFASFLEXICAP`, {
      headers: { Authorization: `Bearer ${userB.token}` },
    });
    assert.equal(userBGet.status, 200);
    const userBData = (await userBGet.json()) as { notes: unknown[] };
    assert.equal(userBData.notes.length, 0);

    const userBDelete = await fetch(`${baseUrl}/api/holding-notes/${createdPayload.note.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userB.token}` },
    });
    assert.equal(userBDelete.status, 404);

    // 7. Verify User A can list and delete their own note
    const userAGet = await fetch(`${baseUrl}/api/holding-notes?fundCode=PPFASFLEXICAP`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    assert.equal(userAGet.status, 200);
    assert.equal(userAGet.headers.get('cache-control'), 'no-store, max-age=0');
    const userAData = (await userAGet.json()) as { notes: Array<{ id: string }> };
    assert.equal(userAData.notes.length, 1);

    const userADelete = await fetch(`${baseUrl}/api/holding-notes/${createdPayload.note.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    assert.equal(userADelete.status, 200);
    const afterDelete = (await userADelete.json()) as { ok: boolean; notes: unknown[] };
    assert.equal(afterDelete.ok, true);
    assert.equal(afterDelete.notes.length, 0);
  } finally {
    await cleanup();
  }
});
