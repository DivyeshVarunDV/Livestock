# LivestoCare: Security, RBAC and Data-Integrity Reference

The authoritative source for access control is `apps/api-services/src/auth/permissions.ts`.
A unit test (`permissions.spec.ts`) fails if any API route lacks an access policy.

## 1. Access control model

- **Default deny.** Global guards authenticate every request (JWT) and then authorise it. A route
  without `@RequirePermissions`, `@Roles`, `@Authenticated` or `@Public` is rejected.
- **Public routes (by design):** `POST /auth/login`, `POST /auth/register` (disabled unless
  `ALLOW_SELF_REGISTRATION=true`), `GET /healthz`, `GET /public/verify/animal/:code`,
  `GET /public/verify/batch/:code`. Public routes never return personal data.
- **Identity is server-derived.** Author fields (veterinarian, tester, dispenser, approver, audit user)
  come from the signed-in session. Values sent by the client are ignored.
- **Data scoping.** A FARMER only ever sees farms they own and animals on those farms.

| Capability | Admin | Veterinarian | Tester | Farmer |
|---|:-:|:-:|:-:|:-:|
| Manage users, read/verify audit trail, verify ledger | ✔ | | | |
| Register / edit farms and animals | ✔ | ✔ | | |
| Delete farms / animals (only when no official records exist) | ✔ | | | |
| Record treatments, prescriptions, vaccinations, AMU, dispensing | | ✔ | | |
| Cancel prescriptions (own, or any for admin) | ✔ | ✔ | | |
| Delete clinical records (audited with full prior state) | ✔ | | | |
| Maintain MRL / withdrawal rules | ✔ | read | read | |
| Pharmacy inventory | ✔ | ✔ | | |
| Request ownership transfer | ✔ | ✔ | | |
| Approve / reject transfer (not your own request) | ✔ | | | |
| Record product collections | ✔ | | ✔ | |
| Create / progress collection batches | ✔ | | ✔ | |
| Record laboratory results | | | ✔ | |
| Report violations | ✔ | ✔ | ✔ | |
| Progress investigations | ✔ | | ✔ | |
| Close / dismiss / re-open investigations (remarks required) | ✔ | | | |
| Reports and analytics | ✔ | ✔ | ✔ | |
| Own farms, animals and clearance status | | | | ✔ (read-only) |

## 2. Authentication and sessions

- Passwords are hashed with bcrypt (12 rounds). The policy requires at least 10 characters with
  upper-case, lower-case, digit and symbol. Administrator-set passwords must be changed by the user.
- An account locks for `LOGIN_MAX_ATTEMPTS` / `LOGIN_LOCK_MINUTES` after repeated failures. Credential
  endpoints are also rate-limited per IP.
- JWTs are HS256, signed with `JWT_SECRET` (mandatory, 32+ characters, in production), and expire after
  `JWT_EXPIRES_IN`.
- **Revocation:** each token carries the user's `tokenVersion`. Changing a password, resetting a
  password, changing a role or status, or "sign out everywhere" revokes every existing session
  immediately. Suspended users are rejected on their next request.

## 3. Food-safety integrity rules (enforced server-side)

- **Withdrawal period floor.** The period applied is the largest of: the vet's value, the prescription,
  the stock item, and the matching MRL rule. Any increase is reported back to the vet.
- **Restrictions cover every product.** Female mammals default to MILK and MEAT, males to MEAT, and
  poultry to MEAT and EGGS.
- **Restrictions cannot be lifted early.** Clearance is always re-derived from all withdrawal records,
  so a later, shorter treatment never overrides a longer one. An hourly sweep releases expired
  restrictions.
- **Collection gate.** Product from an animal under withdrawal or an investigation hold is refused. The
  attempt is audited and administrators are alerted.
- **Laboratory evidence is authoritative.** A result that contradicts the measured residue against the
  MRL is rejected. Results are immutable; corrections are made by re-testing.
- **Failure traceability.** A failed test fails the batch (or recalls it if it was already released),
  opens a case for every contributing farm and animal, and places their product on an investigation
  hold until an administrator closes the case.
- **Batch release** requires at least one passing result, no failed results and no open cases.
- **Transfers:** at most one pending request per animal. Approval is atomic and re-checks the animal's
  current farm, the destination farm's status and any open investigations. Decided transfers are final.
- **Protected records.** Farms, animals, users, dispensed or used prescriptions, approved transfers
  and confirmed/resolved cases cannot be deleted. Deactivate or cancel them instead.
- **Collision-free reference numbers** (e.g. `RX-260927-7K3F9Q`) replace the old count-based codes,
  which duplicated after deletions.

## 4. Tamper evidence

- **Audit trail:** append-only and hash-chained (`sequence`, `prevHash`, `hash`). `GET /audit-logs/verify`
  detects any edited, deleted or re-ordered entry. `GET /audit-logs/export` produces a formula-safe CSV.
  The old public `POST /audit-logs`, which allowed forged entries, has been removed.
- **Ledger:** clinical and laboratory records are also appended to Hyperledger Fabric when configured,
  and otherwise to a serialised, hash-chained local ledger (`GET /ledger/verify`).

## 5. Analytics

- `GET /reports/amu`: antimicrobial-use surveillance by active ingredient, species and month.
- `GET /reports/farm-risk`: a transparent 0–100 risk score per farm for planning risk-based
  inspections. The methodology is included in the response.

## 6. Production deployment checklist

1. Copy `apps/api-services/.env.example` to `.env`. Set a random `JWT_SECRET` and `NODE_ENV=production`,
   and restrict `CORS_ORIGINS` to the portal's HTTPS origin.
2. Set `NEXT_PUBLIC_API_URL` for the portal (see `apps/web-portal/.env.example`).
3. Serve both apps over HTTPS only. Behind a proxy, set `TRUST_PROXY=true` so audit entries record
   real client IPs.
4. **Replace every seeded demo account and password** (`packages/database/prisma/seed.ts`,
   `apps/api-services/seed_users.js`) before go-live.
5. The API runs as a **single instance**: audit and ledger chaining and the login rate limiter are
   in-process. For horizontal scaling, move to PostgreSQL, use a DB-level sequence or advisory lock for
   chaining, and rate-limit at the gateway.
6. SQLite is a development database. Use PostgreSQL (change the Prisma `datasource`) with backups and
   point-in-time recovery for official records.
7. Schedule `GET /audit-logs/verify` and `GET /ledger/verify` and alert on `valid: false`.
