# Database BR / IC / LD review — 11 November 2026

BR means business rules, IC means integrity constraints, and LD means logical design in this review. The supplied files do not define BR/IC/LD identifiers; proposal QĐ numbers are the source identifiers below. Documents are requirements evidence, not operational instructions.

Sources: `report.html`, `proposal (1).html`, and `thiet_ke_erd_quy_tac_nghiep_vu (1).md` from the supplied Downloads paths. The report clarifies that restaurant management belongs to the creator of the record; it does not certify real-world business ownership.

## Evidence and deployment status

The configured Supabase service API was inspected read-only. Its OpenAPI inventory exposes all 18 expected tables and three existing RPCs: `get_public_posts`, `get_public_post`, `create_post_with_recipe`. No recipe visibility column or moderation-history table appears in that inventory. The repository originally contained only a dish seed; it had no schema migrations.

OpenAPI does **not** expose CHECK definitions, unique indexes, triggers, RLS policies, grants, or function bodies. Missing enforcement in the supplied ERD document is evidence of a documented gap, not proof that the current hosted database still lacks it. Run `supabase/audit.sql` to establish those facts before deployment. These migrations were tested on an isolated PostgreSQL fixture reconstructed from the live column/FK inventory, not on a full dump of the hosted database. **No hosted schema changes have been applied.**

## Requirement coverage

| Source | BR / IC / LD gap | Database implementation | Remaining work |
|---|---|---|---|
| QĐ 1.1 | Suggestions must have real names, descriptions and images; no repeated dish in a session | `search_dishes` excludes missing image/description and accepts excluded dish IDs | Client retains suggestion batches and passes every previously shown ID; the existing seed has no images and is ineligible until real images are supplied |
| QĐ 1.2 | All selected filters apply; no fallback widening | `search_dishes` ANDs every attribute and the time/name criteria | Wire application search to this RPC |
| QĐ 1.3 | Private preferences, preference ranking, discovery outside preferences | Own-row RLS; search ranks preference overlap; discovery requires an active account and saved preferences | Attribute taxonomy is not specified in the documents; use the existing category/taste attributes, not new unrelated groups |
| QĐ 1.4 | Retain filters and results when navigating back | Client/session responsibility; no new persistence tables invented | Implement client state/history |
| QĐ 1.5, 4.4 | Missing time, quantities or steps must be distinguishable | Deferred recipe ingredient-completeness maintenance; `thong_tin_cong_thuc.du_thong_tin_huong_dan` includes time/steps | UI displays the warning; an author must review the full ingredient list before asserting COMPLETE |
| QĐ 1.6 | Own favorites, one per dish, unavailable saved dishes removable | Existing composite PK retained; RLS limits saves to active dishes; `saved_dishes()` preserves unavailable placeholders; delete remains allowed | Render the unavailable state |
| QĐ 2.1 | Lookup only; no orders/payments | Existing scope retained | None in the database |
| QĐ 2.2 | Required restaurant fields/coordinates, duplicate checks | Nonblank/coordinate constraints; exact normalized name + coordinates unique; `nearby_restaurants` returns potential duplicates | UI compares nearby candidates before creation; the documents supply no radius or rule for automatically rejecting nearby businesses |
| QĐ 2.3 | Creator manages only their restaurant/menu | Creator FK retained, immutable creator, restaurant/menu RLS and creator trigger | Use a verified user JWT for writes |
| QĐ 3.1 | Recipe/review posts must link to the correct shared source | Post-type/link CHECK; recipe posts cannot carry review-only fields; non-drafts require the appropriate link | Incomplete drafts remain allowed; no review-to-current-menu FK invented because historic reviews can outlive menu entries |
| QĐ 3.2 | Authenticated nonempty content, edits retain interactions and timestamp | Nonblank constraints include tabs/newlines; edit triggers update timestamps; in-place updates preserve interactions | UI retains unsaved input on errors; API uses a transaction for multi-row operations |
| QĐ 3.3 | Public access; no interaction with hidden/deleted posts | Read RLS; parent-state locks/triggers reject reaction/comment writes; author/moderator checks; physical content deletion blocked | Existing read RPCs must be audited for SECURITY DEFINER visibility bypass |
| QĐ 4.1 | At least one valid input ingredient | `match_recipes` rejects empty, NULL or unknown ingredient IDs | Input UI |
| QĐ 4.2 | Weighted PRIMARY/SECONDARY match and missing ingredients | `match_recipes` returns percentage plus missing ingredient IDs/names/quantities; repeated inputs never inflate scores | Default weights 2:1 are a configurable implementation choice, not a number specified by the proposal |
| QĐ 4.3 | Allergy/avoid exclusions override match score | Match RPC excludes every recipe containing the current user's restricted ingredients before ranking | Requests must carry the user's JWT so private restrictions are visible; guests have no stored restrictions |
| QĐ 4.4 | Incomplete ingredient information is never asserted safe | COMPLETE with absent/unquantified ingredients is downgraded at commit; result exposes completeness and makes no allergy-safety claim | Presence of structured data cannot prove the author listed every ingredient |
| QĐ 5.1 | Valid/unique email and password length | Supabase Auth responsibility; do not duplicate credentials in public tables | Verify hosted Auth configuration |
| QĐ 5.2–5.3 | Guest/member/admin separation; private profile, favorites, preferences, restrictions | RLS on all existing tables; no OWNER role; active-account writes; users cannot promote themselves or change creators | Review legacy policies/functions with the preflight script |
| QĐ 5.4 | Exactly one report target, at most one report per user/target | XOR CHECK plus separate partial unique indexes for post/comment reports | Existing conflicts must be reviewed before migration; nothing is silently deleted |
| QĐ 5.5 | Admin-only soft moderation with actor/time/reason retained | Resolution CHECK, active-admin resolver trigger, atomic `resolve_report`, `moderate_content`, and append-only `nhat_ky_kiem_duyet` | Direct moderator state changes require a reason; use the RPCs |
| QĐ 5.6 | Lock/unlock accounts | `set_account_state` checks admin and records reason; locked users cannot perform member writes even with an existing token | Public LOCKED alone does not stop Supabase Auth sign-in: the server must synchronize Auth bans/sign-in restrictions using the Admin API |
| QĐ 5.7 | Secure Auth, token use and storage | Profile privilege/ownership guards and RLS are added; credentials remain server-side | Retain/review the existing Auth profile trigger and storage policies; review JWT validation in each future backend endpoint |
| QĐ 5.8 | Valid JPG/PNG/WebP/MP4 and size limits | Existing IMAGE/VIDEO domain retained | Actual byte/MIME validation belongs to upload processing and Storage bucket configuration; documents specify no numeric cap or bucket name, so none was invented |

## Logical design changes

The upgrade adds `cong_thuc.trang_thai` (`ACTIVE`, `HIDDEN`, `DELETED`) because recipe disappearance cannot be represented by ingredient completeness. It adds `nhat_ky_kiem_duyet`, bringing the public table count to **19**. Audit entries retain the actor's role at the time of the decision; subsequent demotion does not rewrite history. The public recipe-information view uses `security_invoker=true` so its reads obey underlying RLS.

Existing PKs/FKs, auth identities and content IDs are retained. No existing content is dropped. The only intentional data correction is downgrading unsupported COMPLETE claims to INCOMPLETE. Normalize-name indexes trim outer spaces and ignore case; they do not strip Vietnamese accents. Nearby restaurant detection uses metres and a caller-supplied radius; exact duplicate inserts are race-safe through a unique index.

Ingredient mutations lock their parent recipe before editing and recompute completeness at transaction end. Unknown quantities require a nonblank explanatory note (for example, “tùy khẩu vị”); positive quantities require a unit. COMPLETE is never assigned automatically. Steps are stored and read by their existing `stt`; no unsupported requirement for gap-free numbering was introduced.

## Apply to hosted Supabase

### Discovery metadata extension (21 November 2026)

After the four BE07 migrations below, apply `202611210001_discovery_metadata.sql` for occasion tags, dish regions and pantry staples. This fifth migration alone is rerunnable; the original four remain one-time migrations. `supabase/apply.sql` now includes all five and is intended for a fresh database only. See [the updated data dictionary](schema-notes.md#5-mở-rộng-chip-hoàn-cảnh-vùng-miền-tủ-bếp--21112026) and [deployment/test handoff](discovery-metadata-handoff.md). The extension passed rerun/data-preservation/RLS tests and the BE07 regression suite on local PostgreSQL 18.6; hosted deployment and TV4 confirmation remain pending.

### Existing-index recovery (13 November 2026)

If migration 001 reports `42P07: relation "bao_cao_once_post" already exists`, the name is already used in the hosted schema. `audit.sql` is read-only and did not create it. Migration 001 now validates and reuses each of its five existing uniqueness indexes when the table, keys/expressions, predicate, uniqueness, operator classes, collation, ordering, and index validity match. A different definition or a non-index relation still stops with SQLSTATE `55000`, including conflict details where available. Existing indexes are not dropped or replaced.

Run `ROLLBACK;` to clear any failed transaction, then paste and run the **complete updated** `202611110001_integrity.sql`. This fixes existing equivalent uniqueness indexes; it does not make all four migrations generally rerunnable. If a named constraint already exists or an index conflict is reported, inspect that definition rather than dropping it automatically. After migration 001 succeeds, continue with 002–004 in order.

### Normal application procedure

1. Save a current database/schema backup. Run `supabase/audit.sql` in SQL Editor as postgres. Review conflicts and the existing three RPC bodies, other SECURITY DEFINER functions, policies and Auth triggers. Repair conflicts using real data; do not fabricate links, actors or reasons. The stricter constraints/indexes abort on invalid existing rows.
2. Run the four files in `supabase/migrations/` in filename order in SQL Editor. Each file has its own transaction and is intended to run **once**. An equivalent psql entry point is `psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/apply.sql`. The SQL Editor does not support the psql `\ir` directives in `apply.sql`.
3. Run the audit again and check the application with guest, member, owner and admin accounts. Earlier files stay committed if a later file fails: fix the cause and run only the failed/unapplied file. Retain the preflight export for rollback; do not drop new constraints indiscriminately.

The new restrictive policies prevent existing permissive policies from widening access. Existing restrictive policies remain and can still narrow access. The audit does not automatically remove or rewrite unknown hosted policies/functions. Existing functions using SECURITY DEFINER need particular attention: write triggers protect the covered content/account operations, but read functions can bypass RLS. Their bodies are unavailable through the configured REST API.

### Pending-trigger recovery (13 November 2026)

The earlier migration 001 could fail with `55006: cannot CREATE INDEX "cong_thuc" because it has pending trigger events` when COMPLETE recipes already existed. Its completeness backfill performed an UPDATE after installing a deferred constraint trigger but before building `cong_thuc_dish`. Even a no-op UPDATE queued trigger events, blocking the subsequent index operation. The original empty-baseline migration tests did not cover this initial-data condition.

The updated file places the backfill after all schema/index operations, immediately before COMMIT. Deferred completeness checks still run at commit; no trigger is disabled and no early commit is introduced. Clear the failed transaction with `ROLLBACK;`, then run the complete latest migration 001. Continue to 002–004 only after it succeeds.

`supabase/tests/populated_recipes.sql` covers migration over five pre-existing recipes: no ingredients, valid quantity/unit, missing unit, explicitly unspecified quantity with a note, and a recipe left INCOMPLETE by its author. It verifies successful index creation, expected final statuses, and preservation of recipe/ingredient row counts.

The Express API currently uses a service-role client for `/api/dishes` and `/api/me`. Its existing profile endpoint verifies the token and filters by verified user ID. Service-role queries bypass RLS ([Supabase documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)); future member writes and personalized queries should use a request-scoped client carrying the verified user JWT, or enforce equivalent backend authorization. Do not forward client-provided user IDs as proof of identity. Database relation/duplicate/domain constraints still protect service-role writes; service-role administrative authority remains trusted.

The existing frontend/backend are not rewired to the new RPCs by this database-only change. Auth sign-in bans, upload limits/content inspection, and session navigation remain explicitly outside the SQL migration.

## Validation

`supabase/tests/fixture.sql` is **test-only**, reconstructed from the live OpenAPI inventory. It is not a hosted schema backup and must never be run against production. In an empty disposable PostgreSQL 15+ database with a superuser:

```sh
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/fixture.sql
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/apply.sql
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/requirements.sql
```

Validation passed on isolated PostgreSQL 18: all four migrations, 58 SQL assertions/rejection checks, and the preflight script. The existing backend's three tests also pass.

The 13 November fix was additionally verified with `supabase/tests/existing_indexes.sql`: all five pre-existing matching indexes retained their original OIDs; nonunique indexes, different predicates/key order, wrong-table indexes, and same-name tables were rejected; duplicate rows still caused unique-index creation to fail without changing the data. All 58 database regression checks passed after applying the remaining migrations to that fixture.

The regression suite runs actual SQL as anon, authenticated users and an admin, and rolls back test data. It covers invalid targets/domains/blank content, duplicates, privacy even with a legacy allow-all policy, creator impersonation, role escalation, owner-only menu edits, retained reactions, timestamps, hidden-post interactions, ingredient input validation/scoring/allergy exclusions, recipe completeness, unavailable favorites, audit immutability, atomic report resolution, mandatory moderation reasons, and locked-account writes. It also simulates an older SECURITY DEFINER write function and trusted server writes.
