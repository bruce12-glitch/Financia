# Financia Firestore Security Specification (Phase 0 TDD)

## 1. Core Data Invariants
1. **Strict Ownership Isolation**: Every document under `/users/{userId}/**` is exclusively readable and writable by the authenticated, email-verified user whose `request.auth.uid == userId`.
2. **Master Gate Relational Integrity**: A `PortfolioTransaction` under `/users/{userId}/portfolios/{portfolioId}/transactions/{transactionId}` can only be created or deleted if the parent portfolio document exists and `get(.../portfolios/{portfolioId}).data.ownerId == request.auth.uid`.
3. **Immutable Financial Ledger**: `PortfolioTransaction` records are strictly append-only (`allow update: if false;`) to prevent silent tampering with historical cost basis, XIRR cashflows, or FIFO tax lots.
4. **Decimal String Precision**: Monetary fields (`units`, `price`, `amount`, `initialCapital`, `monthlySip`, `targetValue`) must strictly match bounded positive decimal regex strings—never arbitrary unbounded strings or NaN payloads.
5. **Temporal Integrity**: `createdAt` and `updatedAt` must equal server `request.time`; `createdAt` and `ownerId` are immutable on updates.
6. **Terminal State Locking**: Once a `PortfolioAlert` reaches `status == 'DISMISSED'`, no subsequent updates are permitted.
7. **Zero Shadow Fields & Bounded Arrays**: Every create enforces `keys().hasAll(...) && keys().hasOnly(...)`; every update enforces `affectedKeys().hasOnly(...)`; arrays (`pinnedWidgets <= 12`, `customMapSymbols <= 40`, `allocations <= 15`) are strictly bounded.

## 2. The Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Cross-Tenant Read**: User B attempts `get` on `/users/userA/portfolios/p1`.
2. **Identity Spoofing on Create**: User A creates `/users/userA/portfolios/p1` with `ownerId: "userB"`.
3. **Unverified Email Write**: Authenticated user with `email_verified: false` attempts to create a portfolio.
4. **Shadow Field Injection**: User A creates a profile with an extra field `{ isAdmin: true }`.
5. **Path ID Poisoning**: User A attempts to create a document with a 200-char or slash-injected ID.
6. **Orphaned Transaction Write**: User A creates a transaction under a non-existent `portfolioId`.
7. **Ledger Tampering (Update Transaction)**: User A attempts to `update` `price` on an existing transaction.
8. **Client-Forged Timestamp**: User A submits a past `createdAt` instead of `serverTimestamp()`.
9. **Array Exhaustion Attack**: User A submits 50 items into `pinnedWidgets` (max 12).
10. **Decimal Format Poisoning**: User A submits `units: "-500.00"` or `units: "Infinity"` on a transaction.
11. **Terminal State Bypass**: User A attempts to mutate an alert whose existing status is `'DISMISSED'` back to `'ACTIVE'`.
12. **Blanket Collection Scraping**: Any user attempts unauthenticated or cross-user `list` query on `/users/{otherUid}/alerts`.
