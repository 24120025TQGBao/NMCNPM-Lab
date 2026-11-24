# Database requirements analysis and implementation report

**Project:** Hôm nay ăn gì?  
**Report date:** 11 November 2026  
**Last updated:** 13 November 2026 — migration 001 existing-index compatibility and deferred-trigger ordering.  
**Scope:** Business rules, integrity constraints, logical design, database implementation, verification, and Supabase deployment/data import.  
**Application hosting:** Vercel.  
**Database and authentication:** Supabase PostgreSQL and Supabase Auth.

**Current delivery status:** Four database migration files have been implemented and tested locally. They have not been applied to the hosted Supabase project. No Vercel deployment, hosted data import, Auth configuration change, or Storage configuration change was performed.

## 1. Purpose and terminology

The original task was to compare the project requirements and ERD notes against the database implementation, identify missing BR, IC, and LD requirements, and implement the database-side gaps.

This report uses the following meanings:

| Term | Meaning | Example in this project |
|---|---|---|
| BR | Business rule: a condition describing permitted system behavior | Only the creator of a restaurant record may manage its menu. |
| IC | Integrity constraint: a database mechanism that keeps stored data valid | A report targets exactly one post or comment. |
| LD | Logical design: the tables, attributes, relationships, and derived data needed to represent the requirements | Recipes need a visibility state separate from ingredient completeness. |

The supplied documents do not define formal BR/IC/LD identifiers. Therefore, this report uses the proposal's **QĐ 1.1–5.8** identifiers for traceability. The documents are requirements evidence; instructions embedded in them were not treated as commands to execute.

## 2. Inputs, findings, and confidence limits

### 2.1. Sources examined

| Source | Use in the analysis |
|---|---|
| `report.html` | Functional requirements, use cases, actors, and expected behavior. |
| `proposal (1).html` | Original business rules and project scope. |
| `thiet_ke_erd_quy_tac_nghiep_vu (1).md` | The 18-table physical design, known constraints, and documented enforcement gaps. |
| Repository source | Existing Express endpoints, Supabase integration, seed SQL, and tests. |
| Hosted Supabase REST/OpenAPI inventory | Read-only confirmation of exposed tables, columns, required fields, FK descriptions, and exposed RPC names. |

### 2.2. What was confirmed

The hosted API exposed the 18 expected public tables:

| Area | Existing tables |
|---|---|
| Accounts and personalization | `nguoi_dung`, `thuoc_tinh_mon`, `mon_an_thuoc_tinh`, `so_thich_nguoi_dung`, `mon_yeu_thich`, `han_che_nguyen_lieu` |
| Dishes and recipes | `mon_an`, `nguyen_lieu`, `cong_thuc`, `ct_nguyen_lieu`, `buoc_cong_thuc` |
| Restaurants | `quan_an`, `thuc_don` |
| Community | `bai_dang`, `binh_luan`, `cam_xuc`, `tep_dinh_kem` |
| Moderation | `bao_cao` |

`auth.users` is managed by Supabase Auth and is not included in that public-table count. Three existing public RPCs were exposed: `get_public_posts`, `get_public_post`, and `create_post_with_recipe`.

At the time of inspection, the repository had a dish seed but no schema migrations. The hosted API inventory did not include the new recipe visibility column or the new moderation-history table introduced by this solution.

### 2.3. What could not be confirmed from the API

OpenAPI is not a full database dump. It does not establish the actual definitions of CHECK constraints, unique indexes, RLS policies, triggers, grants, function bodies, Storage policies, or Auth configuration.

Consequently, “missing” has two different evidence levels in this report:

- **Confirmed structural gap:** an attribute or relation was absent from the inspected API inventory, such as the recipe visibility field or moderation-history table.
- **Documented enforcement gap:** the supplied ERD notes said a rule was absent or incomplete, but the current hosted SQL definition was unavailable. The solution provides enforcement, and the preflight audit must determine whether the hosted database already has equivalent or conflicting mechanisms.

The migration tests used a reconstructed schema fixture based on the API inventory. They did not use a full copy of the hosted schema or production data. Passing those tests establishes behavior in that controlled environment; it does not prove compatibility with unknown hosted functions and policies.

## 3. Delivered files

| File | Purpose | Where it should be used |
|---|---|---|
| [supabase/audit.sql](supabase/audit.sql) | Read-only preflight inspection and conflict counts | Hosted Supabase SQL Editor before and after migration |
| [202611110001_integrity.sql](supabase/migrations/202611110001_integrity.sql) | Structural, domain, uniqueness, relation, completeness, and timestamp rules | Existing database, first migration |
| [202611110002_access.sql](supabase/migrations/202611110002_access.sql) | RLS, identity/ownership checks, active-account checks, and content write guards | Existing database, second migration |
| [202611110003_moderation.sql](supabase/migrations/202611110003_moderation.sql) | Moderation history and transactional admin operations | Existing database, third migration |
| [202611110004_queries.sql](supabase/migrations/202611110004_queries.sql) | Search, ingredient matching, nearby candidates, favorites, and recipe-information view | Existing database, fourth migration |
| [supabase/apply.sql](supabase/apply.sql) | Runs all four migrations in order using psql | Command-line psql only |
| [supabase/tests/fixture.sql](supabase/tests/fixture.sql) | Reconstructed baseline schema and simplified Auth helpers | Empty disposable test database only |
| [supabase/tests/requirements.sql](supabase/tests/requirements.sql) | Regression assertions and expected-error checks | Disposable test database only |
| [supabase/tests/existing_indexes.sql](supabase/tests/existing_indexes.sql) | Existing-index compatibility and conflict checks | Disposable database after fixture, before migrations |
| [supabase/tests/populated_recipes.sql](supabase/tests/populated_recipes.sql) | Applies migration 001 over pre-existing COMPLETE/INCOMPLETE recipes | Disposable database after fixture, before migrations |
| [docs/database-requirements.md](docs/database-requirements.md) | Compact requirements matrix and deployment notes | Project documentation |

The README was updated to link to the database review. The implementation did not change the frontend or add new Express routes. The existing sample-data file was retained.

## 4. Business-rule coverage

The following matrix distinguishes database implementation from work still needed in the application or hosted service configuration.

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

## 5. Integrity constraints implemented

### 5.1. Post types and source links

Previously documented issue: separate nullable FKs did not ensure that a recipe post referenced a recipe, or that a review referenced a restaurant.

The new `bai_dang_target` CHECK applies this shape:

| Post type | Recipe link | Restaurant link | Reviewed dish / paid price |
|---|---|---|---|
| `RECIPE` | Required when the status is not `DRAFT` | Must be NULL | Must be NULL |
| `REVIEW` | Must be NULL | Required when the status is not `DRAFT` | Optional |

This permits an unfinished draft to be saved before its main link is supplied. A non-draft recipe post without `ma_ct`, or a recipe post carrying `ma_quan`, is rejected.

The rule checks the shape and existence of references through CHECKs and existing FKs. It does not establish that a linked recipe was personally authored by the post author, verify an actual restaurant visit, or certify that a referenced source remains publicly visible forever.

### 5.2. Exactly one attachment/report target

Both `tep_dinh_kem` and `bao_cao` have nullable `ma_bai` and `ma_bl` fields. Two separate nullable FKs allow either both links or neither link unless another constraint is present.

The migration adds `num_nonnulls(ma_bai, ma_bl) = 1`. An attachment or report must belong to one post or one comment. Rows containing zero or two targets are rejected.

### 5.3. Report uniqueness and resolution metadata

Two partial unique indexes enforce reporting limits:

- `bao_cao_once_post`: unique `(ma_nguoi_bao_cao, ma_bai)` when `ma_bai` is not NULL.
- `bao_cao_once_comment`: unique `(ma_nguoi_bao_cao, ma_bl)` when `ma_bl` is not NULL.

This also handles concurrent duplicate requests through database uniqueness enforcement. A plain UNIQUE across all three nullable columns would not express these two cases as directly.

The `bao_cao_resolution` CHECK requires:

| Report state | Required metadata |
|---|---|
| `PENDING` | Processor, processing time, and processing reason must all be NULL. |
| `RESOLVED` / `DISMISSED` | Processor, processing time, and nonblank processing reason must all be present. |

A relation trigger verifies that the processor is an active ADMIN at decision time. Later role changes do not invalidate earlier decisions. For authenticated application writes, the processor must be the acting admin and an already closed report cannot be rewritten through the normal update path.

### 5.4. Text, numeric, and status domains

Nonblank CHECKs cover display names, dish/ingredient/recipe names, attribute groups and values, restaurant names and addresses, post titles/content, comment content, recipe-step content, report reasons, and attachment paths. They reject whitespace-only input containing tabs and newlines as well as spaces.

The migration also reinforces the documented domains:

| Field or area | Constraint |
|---|---|
| Account roles | `USER`, `ADMIN`; restaurant ownership is a relationship, not an `OWNER` role. |
| Account status | `ACTIVE`, `LOCKED` |
| Dish, restaurant, recipe visibility | `ACTIVE`, `HIDDEN`, `DELETED` |
| Restriction type | `ALLERGY`, `AVOID` |
| Ingredient completeness | `COMPLETE`, `INCOMPLETE` |
| Ingredient role | `PRIMARY`, `SECONDARY` |
| Post type | `RECIPE`, `REVIEW` |
| Post status | `DRAFT`, `PUBLIC`, `HIDDEN`, `DELETED` |
| Comment status | `PUBLIC`, `HIDDEN`, `DELETED` |
| Reaction | `LIKE`, `DISLIKE` |
| Attachment class | `IMAGE`, `VIDEO` |
| Report status | `PENDING`, `RESOLVED`, `DISMISSED` |
| Preparation time, when provided | Greater than zero |
| Ingredient quantity, when provided | Positive and below numeric infinity |
| Step number | Greater than zero |
| Menu/review price, when provided | Nonnegative and below numeric infinity |
| Latitude / longitude | Within `[-90,90]` / `[-180,180]` |
| Attachment order | Nonnegative |

Optional numeric fields remain optional. A CHECK such as `thoi_gian_phut > 0` does not make NULL illegal. Required fields continue to rely on their existing NOT NULL declarations and the explicitly added nonblank checks where applicable.

### 5.5. Normalized uniqueness

The migration adds case-insensitive, outer-space-trimmed uniqueness for ingredient names and attribute `(group, value)` pairs. It does not remove Vietnamese accents or merge synonyms.

For example, `Rice` and ` rice ` conflict. Two distinct ingredient names are not automatically merged because they happen to represent related foods.

Restaurant uniqueness applies to normalized restaurant name plus exact latitude/longitude, excluding soft-deleted restaurants. This is an exact-duplicate rule; it does not prohibit different businesses in the same building.

### 5.6. Recipe completeness and timestamps

`trang_thai_thanh_phan` describes the recorded ingredient information. The deferred maintenance trigger downgrades a COMPLETE claim when:

- There are no ingredient rows; or
- An ingredient lacks both a usable positive quantity/unit pair and an explanatory note for an unspecified quantity.

A recipe with a quantity of `100` and no unit is insufficient for COMPLETE. An ingredient with NULL quantity and a note such as “tùy khẩu vị” is accepted as an explicitly unspecified quantity. The trigger does not automatically upgrade INCOMPLETE to COMPLETE; the author must make that assertion after review.

Ingredient/step edits lock their parent recipe. Completeness is reconciled at transaction end, allowing a multi-statement transaction to create a recipe and then add its ingredients. Existing unsupported COMPLETE claims are downgraded during migration. No missing quantity, ingredient, unit, or step is fabricated.

This check cannot prove that an author listed every real ingredient. Removing one row while leaving other well-described ingredient rows does not automatically prove the remaining list is incomplete. Completeness is structured-data validation plus an author assertion, not an allergy-safety certification.

Updates to posts/comments assign `sua_luc`; menu updates assign `cap_nhat_luc`. Updating a post in place retains its ID and therefore its existing reactions and comments.

## 6. Logical-design changes

### 6.1. Recipe visibility

The migration adds `cong_thuc.trang_thai`, defaulting existing recipes to `ACTIVE`, with `ACTIVE`, `HIDDEN`, and `DELETED` as allowed values.

Ingredient completeness and visibility answer different questions. A recipe can be publicly available while incomplete, or hidden while containing complete ingredient information. Keeping these states separate allows both cases to be represented.

### 6.2. Moderation history

The new `nhat_ky_kiem_duyet` table increases the public-table count from 18 to **19 after successful deployment**.

| Column | Meaning |
|---|---|
| `ma_su_kien` | Generated event ID |
| `loai_doi_tuong` | Post, comment, user, or report table name |
| `ma_doi_tuong` | Target identifier stored as text to support bigint and UUID targets |
| `ma_nguoi_thuc_hien` | Acting public-profile ID, nullable for trusted maintenance without user identity |
| `vai_tro_luc_xu_ly` | Actor role captured at event time |
| `trang_thai_truoc`, `trang_thai_sau` | Previous and new status |
| `ly_do` | Reason when supplied/required by the operation |
| `thoi_diem` | Database event timestamp |

State-change triggers record post, comment, account, and report status transitions. This is not a universal audit of every column edit or a reconstruction of events before the migration. Ordinary application roles receive no direct insert/update/delete permission for audit rows; active admins may read them. Privileged maintenance/database owners remain trusted.

### 6.3. Derived recipe information

The `thong_tin_cong_thuc` view returns recipe fields plus `du_thong_tin_huong_dan`. That flag requires COMPLETE ingredient status, a non-NULL preparation time, and at least one recipe step.

The view uses `security_invoker=true`, so underlying reads use the caller's permissions. The flag does not check the culinary correctness of instructions, verify media, or require gap-free step numbering.

### 6.4. Design choices deliberately left unchanged

Existing PKs, FKs, user IDs, content IDs, and the relationship between public profiles and `auth.users` are retained. The solution does not introduce orders, payment tables, a real-world owner-verification workflow, duplicated credentials, or server-side session-history tables.

No FK was added requiring a historic review's dish to remain on a restaurant's current menu. No arbitrary nearby-business distance threshold or upload-size cap was invented from an unspecified requirement.

## 7. Authorization and privacy

### 7.1. Effective access model

The migration enables RLS on the 18 existing tables and grants the operations needed for policy-controlled access. Important boundaries are:

| Data or operation | Guest | Active member | Active admin |
|---|---|---|---|
| Public posts and public comments under public posts | Read | Read | Read, including moderated content through admin policies |
| Account profiles | No direct rows | Own profile | Profile rows for administration; cannot rewrite someone else's display name/avatar |
| Preferences, ingredient restrictions, favorites | No rows | Own rows | Own rows; admin status does not grant general access to other users' restrictions |
| Restaurant/menu management | None | Own restaurant records and menus | Still creator-bound for restaurant/menu management |
| Recipe editing | None | Own recipes | Admin permitted by recipe policies |
| Report submission | None | Submit as self, initially PENDING | Same submission identity rules |
| Report resolution | None | None | Resolve/dismiss through admin operations |
| Moderation-history reads | None | None | Permitted |

All policy-controlled member writes require an ACTIVE account. This does not mean a locked user loses access to all public reads, nor does it mean their Auth sign-in is automatically banned.

### 7.2. Why both RLS and triggers are used

RLS filters the rows a caller may access. Write triggers additionally protect covered operations against creator/author impersonation, self-promotion, protected identity changes, invalid state transitions, and certain writes through existing SECURITY DEFINER functions.

New policies include both permissive rules and restrictive boundaries. Existing permissive policies cannot widen access beyond the new restrictive rules. Existing restrictive policies remain active and can narrow access further; they need review during preflight.

Not all denials appear as errors. An UPDATE targeting another user's menu may affect zero visible rows because of RLS. The application should check affected rows rather than treating every error-free response as a successful mutation.

### 7.3. Hidden content and soft deletion

Normal public reads exclude hidden/deleted posts. New reactions and comments require a PUBLIC parent post; parent-row locks coordinate these checks with concurrent state changes. Existing reactions and comments are retained when a post is hidden.

Authors cannot impersonate other authors or restore their own HIDDEN/DELETED content through ordinary state changes. Moderators cannot rewrite another author's post body through the covered update path. Physical deletion of posts, comments, and reports is blocked by the write guard; content removal uses status changes instead.

### 7.4. Trusted server access remains significant

The current Express API uses a service-role client. Its `/api/me` endpoint verifies the bearer token, loads the profile for the verified user ID, and rejects inactive accounts. `/api/dishes` reads active dishes directly; it does not call the new search function.

Service-role access bypasses RLS. Future personalized queries/member writes need a request-scoped Supabase client carrying the user's JWT, or equivalent verified backend authorization. Supplying a user ID from request JSON is not authentication. Covered domain/relation constraints still apply to trusted writes, but a database migration cannot make an incorrectly authorized privileged backend safe by itself.

The existing public RPC bodies were unavailable through the REST inventory. They must be inspected with the audit script, especially if they use SECURITY DEFINER. Read functions with elevated authority can bypass table RLS. The new write guards do not establish that every pre-existing RPC is secure.

## 8. New functions and their behavior

### 8.1. Dish search

```sql
public.search_dishes(
  query_text text DEFAULT '',
  attribute_ids bigint[] DEFAULT '{}',
  max_minutes integer DEFAULT NULL,
  discovery boolean DEFAULT false,
  excluded_dish_ids bigint[] DEFAULT '{}'
)
```

The function returns active dishes with nonblank images/descriptions, applies case-insensitive literal substring name matching, requires every requested attribute, and checks for an active recipe within the time limit when supplied. It never removes a filter to fill an empty result.

Preference overlap determines ranking, followed by dish name/ID. Discovery requires an active account with stored preferences and at least one dish attribute outside those preferences. The implementation considers the attribute IDs in the existing model; the application should keep the discovery taxonomy aligned with the intended dish-category/taste attributes.

The function excludes supplied previously shown dish IDs. It does not store sessions, retain previous batches, randomize results, or paginate them automatically. Those behaviors require application integration.

### 8.2. Ingredient matching

```sql
public.match_recipes(
  ingredient_ids bigint[],
  primary_weight numeric DEFAULT 2,
  secondary_weight numeric DEFAULT 1
)
```

It rejects an empty/NULL list, NULL IDs, unknown IDs, and missing/nonpositive weights. Recipes must match at least one available ingredient. A recipe containing any ingredient restricted by the current user is excluded before scoring, even if its other ingredients match perfectly.

```text
match_score = 100 × sum(weights of matched recipe ingredients)
                    / sum(weights of all listed recipe ingredients)
```

For a PRIMARY ingredient weighted 2 and a SECONDARY ingredient weighted 1, having only the primary ingredient gives `66.67`. Duplicate input IDs do not multiply the score because matching checks membership against the recipe ingredient rows.

Returned fields are `ma_ct`, `ma_mon`, `ten_ct`, `match_score`, `missing_ingredients`, and `ingredient_information_complete`. Missing-ingredient JSON includes ingredient ID, name, quantity, unit, and note. The score measures the presence of ingredient types; it does not compare available quantities with required quantities.

The 2:1 defaults are implementation choices exposed as parameters. They are not numeric weights specified by the proposal. Guests have no stored personal restriction profile. An incomplete recipe can still be returned with a warning flag; the function makes no claim that it is safe for someone with allergies.

### 8.3. Nearby restaurant candidates

`nearby_restaurants(latitude, longitude, radius_metres)` returns active restaurants within the supplied radius, including calculated distance in metres. It uses great-circle distance calculation for candidate comparison.

The caller supplies the radius. The function does not automatically prevent every nearby insertion: the UI/backend must show candidates and apply the project's agreed duplicate-review workflow. The unique index separately prevents exact name/location duplicates.

### 8.4. Saved dishes

`saved_dishes()` returns the current user's saved dish IDs, visible names/images, and `khong_con_kha_dung`. A LEFT JOIN retains a saved ID when the related dish is unavailable to the caller. For an ordinary user, a deleted dish therefore becomes an unavailable placeholder instead of disappearing from the saved list entirely.

New favorites require an active dish. Removing an existing favorite does not require the dish to remain active.

### 8.5. Moderation operations

| Function | Behavior |
|---|---|
| `moderate_content(target_type, target_id, reason)` | Active admin hides an existing non-DELETED post/comment. Requires POST or COMMENT target type and a nonblank reason. |
| `resolve_report(report_id, decision, reason)` | Locks a pending report. RESOLVED hides the target and records the decision; DISMISSED records the decision without hiding the target. Both require a reason. |
| `set_account_state(user_id, new_state, reason)` | Active admin sets ACTIVE/LOCKED and records the reason. Prevents locking the acting admin's own account. |

Report resolution is transactional: target moderation and the report decision are performed within one function call. An error rolls the statement back. A target already marked DELETED cannot be hidden by `moderate_content`; handling that business case remains a product decision, rather than silently restoring deleted content.

The admin RPCs rely on authenticated caller context. Running them in SQL Editor without a user JWT does not simulate an authenticated admin and will not satisfy `is_admin()` merely because the editor has database-owner privileges.

## 9. Verification performed

The implementation was exercised on an isolated Docker PostgreSQL **18.6** database. All four migrations executed successfully. The regression file passed **58 SQL assertions/expected-rejection checks**, and the existing Express backend passed **3 tests**. The preflight script also executed against the isolated migrated schema.

The SQL suite switches between guest, authenticated-member, admin, locked-account, and trusted-write contexts. It includes a simulated legacy permissive policy and a simulated SECURITY DEFINER write function. Tests roll back their inserted rows and helper functions. Test setup also advances identity sequences so a duplicate-name/report test does not accidentally pass because of an unrelated primary-key collision.

### 9.1. Database regression inventory

The following labels correspond to assertions in `supabase/tests/requirements.sql`; T numbers are local report references, not identifiers from the proposal.

| Test | Type | Verified behavior |
|---|---|---|
| T01 | State/result assertion | Complete ingredients retained |
| T02 | State/result assertion | Unsupported COMPLETE claim downgraded |
| T03 | Expected rejection | Attachment needs one target |
| T04 | Expected rejection | Attachment cannot have both targets |
| T05 | Expected rejection | Post type must match links |
| T06 | Expected rejection | Normalized ingredient uniqueness |
| T07 | Expected rejection | Whitespace-only text rejected |
| T08 | Expected rejection | Negative price rejected |
| T09 | Expected rejection | Owner is a relationship, not a role |
| T10 | Expected rejection | Physical post deletion forbidden |
| T11 | State/result assertion | Guest sees only public posts |
| T12 | State/result assertion | Profiles are private |
| T13 | State/result assertion | Allergies are private |
| T14 | State/result assertion | Private attachments are hidden |
| T15 | State/result assertion | Suggestions require name, image and description |
| T16 | State/result assertion | All attribute filters apply |
| T17 | State/result assertion | No relaxing unsatisfied filters |
| T18 | State/result assertion | Time filter applies |
| T19 | State/result assertion | Exclude previously suggested IDs |
| T20 | Expected rejection | Empty ingredient input |
| T21 | Expected rejection | Unknown ingredient input |
| T22 | State/result assertion | Guest matching uses available ingredients |
| T23 | State/result assertion | Nearby duplicate candidates |
| T24 | State/result assertion | Instruction completeness is exposed |
| T25 | State/result assertion | Missing steps are reported incomplete |
| T26 | State/result assertion | User sees only own profile |
| T27 | Expected rejection | Self role escalation blocked |
| T28 | State/result assertion | Allergy exclusion takes priority over score |
| T29 | State/result assertion | Weighted score, missing ingredients and duplicate input handling |
| T30 | State/result assertion | Discovery requires attribute outside preferences |
| T31 | Expected rejection | Definer RPC cannot impersonate |
| T32 | State/result assertion | Edit timestamp assigned |
| T33 | State/result assertion | Editing preserves reactions |
| T34 | Expected rejection | No reaction on hidden post |
| T35 | Expected rejection | No comment on hidden post |
| T36 | Expected rejection | Recipe identity immutable |
| T37 | Expected rejection | Restaurant creator cannot be forged |
| T38 | State/result assertion | Owner can edit menu |
| T39 | State/result assertion | Cannot edit someone elses menu |
| T40 | Expected rejection | Favorite is unique |
| T41 | Expected rejection | One report per user per post |
| T42 | Expected rejection | Report has exactly one target |
| T43 | Expected rejection | Non-admin cannot moderate |
| T44 | State/result assertion | Resolved report hides content |
| T45 | State/result assertion | Resolution actor/time/reason retained |
| T46 | State/result assertion | Content and report actions audited |
| T47 | Expected rejection | Closed report cannot be rewritten |
| T48 | Expected rejection | Moderation reason is mandatory |
| T49 | Expected rejection | Moderator cannot rewrite another authors post |
| T50 | Expected rejection | Audit trail append-only |
| T51 | Expected rejection | Locked account cannot save |
| T52 | Expected rejection | Locked account cannot post |
| T53 | State/result assertion | Deleted favorites retain an unavailable placeholder |
| T54 | Expected rejection | Cannot newly save a deleted dish |
| T55 | State/result assertion | Removing ingredients invalidates completeness |
| T56 | State/result assertion | Can remove favorite after content hidden |
| T57 | Expected rejection | Trusted writes also enforce public interactions |
| T58 | Expected rejection | Trusted writes require an admin resolver |

### 9.2. Limits of this verification

The tests establish the covered behavior on the reconstructed fixture. They do not establish full hosted compatibility, end-to-end browser behavior, concurrent-load performance, upload/MIME enforcement, Auth sign-in banning, or the security of unavailable legacy function bodies. Parent-locking mechanisms were exercised in ordinary transactions; no separate multi-session concurrency stress test was performed.

The initial migration tests started with an empty schema. They created COMPLETE recipes only after migration and therefore missed an ordering bug when COMPLETE rows were already present before migration. On 13 November, `supabase/tests/populated_recipes.sql` added this initial-data coverage: all five seeded recipes and four ingredient rows survived migration, the recipe index was created, valid COMPLETE claims were retained, invalid claims were downgraded, and an existing INCOMPLETE claim was not promoted. Migrations 002–004 and all 58 regression checks passed afterward on that fixture.

## 10. Applying the changes to hosted Supabase

### 10.1. Understand what is being applied

A schema migration changes database structures and behavior. A data import inserts actual dishes, ingredients, recipes, restaurants, and other records. This solution primarily delivers schema migrations; your three source documents are specifications, not a complete importable application dataset.

The migrations upgrade the existing 18-table schema. They do not create a fresh production baseline in an empty Supabase project. `fixture.sql` is a simplified test baseline and must not be used to initialize your hosted project.

### 10.2. Preflight

1. Identify the Supabase project used by the deployed Vercel app. Match the project's URL to the configured `SUPABASE_URL` / frontend Supabase URL without sharing secret values.
2. Save a current schema/data backup appropriate to your project, including definitions needed to restore existing policies/functions. Existing uploaded media has a separate Storage backup concern.
3. In Supabase SQL Editor, run the complete contents of `supabase/audit.sql` using the project's administrative SQL context.
4. Save its results. Review constraints, indexes, RLS flags/policies, triggers, public function definitions/privileges, duplicate groups, target mismatches, resolution metadata, and blank-field notices.
5. Review each conflict using the original records. Correct actual links and values; preserve legitimate content and report history. Do not invent a processor or reason simply to make a CHECK pass.

The audit produces conflict counts, not an automatic cleanup plan. It does not enumerate every possible incompatible domain value or legacy behavior. Creating a new CHECK/index can still fail on a conflict not listed by the convenience queries.

`dishes_ineligible_for_suggestions` is informational: missing image/description makes a dish ineligible for the new search function but does not itself prevent the migration from running. The duplicate findings count conflicting groups, not necessarily the number of individual excess rows.

### 10.3. Run the migrations

In SQL Editor, open a new query, paste a complete migration file, and run it. Use this exact order:

1. `supabase/migrations/202611110001_integrity.sql`
2. `supabase/migrations/202611110002_access.sql`
3. `supabase/migrations/202611110003_moderation.sql`
4. `supabase/migrations/202611110004_queries.sql`

Each file contains its own `BEGIN` / `COMMIT`. The files are intended to run once; most object creations are not idempotent. Migration 001 can reuse its five pre-existing uniqueness indexes after verifying that their definitions match; this does not make the whole migration rerunnable. A Vercel redeploy neither executes these files nor applies them to Supabase.

For an already configured SQL connection, the equivalent command-line entry point is:

```sh
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/apply.sql
```

`SUPABASE_DB_URL` here means a PostgreSQL connection string supplied in your shell environment. It is not the HTTP Supabase project URL and is not the service-role API key. A local PostgreSQL installation/server is not needed to use the hosted SQL Editor. `apply.sql` uses psql `\ir` directives and should not be pasted into SQL Editor.

### 10.4. Handling an error

**Reported case, 13 November 2026:** running audit followed by migration 001 encountered `42P07: relation "bao_cao_once_post" already exists`. The audit only reads database definitions and conflict counts. The error shows that the index name was already occupied when migration 001 tried to create it; it does not establish that the complete migration had already succeeded.

Migration 001 now uses a session-local helper for its five uniqueness indexes. Missing indexes are created normally. Existing indexes are compared against the intended definition using an empty temporary copy of the target table: table identity, key expressions/order, predicate, uniqueness/NULL treatment, operator classes, collation, access method, and validity/readiness are checked. A matching index is preserved, with a NOTICE stating that it is being reused. An incompatible object stops the migration with `55000` and details rather than being silently skipped or removed. This avoids accepting a nonunique index that would fail to enforce the reporting rule.

For this specific error, clear the failed transaction with `ROLLBACK;`, then run the complete updated `supabase/migrations/202611110001_integrity.sql`. Continue to 002 only after 001 commits. If the updated file reports a conflicting definition or an existing named constraint, inspect the definitions in the audit output before attempting further changes.

**Additional reported case:** `55006: cannot CREATE INDEX "cong_thuc" because it has pending trigger events`. The initial completeness backfill updated existing COMPLETE recipes after creating a deferred recipe trigger and before creating the recipe index. That update queued deferred events, including for rows whose assigned status initially remained unchanged, and PostgreSQL blocked the subsequent index operation.

The corrected file performs the backfill as its last operation before COMMIT, after all schema/index changes. Commit processes the deferred checks normally. The transaction remains atomic; triggers remain enabled. Clear the failed transaction with `ROLLBACK;` and run the complete latest migration 001 before continuing. The populated-recipe regression described in section 9.2 verifies this recovery path.

The fix was checked on an isolated fixture with all five matching indexes present before migration: the migration succeeded and preserved their OIDs. Additional checks rejected a nonunique index, a different predicate, different key order, an index on the wrong table, and a same-name table. Duplicate data continued to fail unique-index creation without being modified. The remaining migrations and all 58 existing database checks passed on the compatibility fixture.

If a file fails, inspect the error and transaction state. Its transaction must be rolled back before a retry; SQL Editor may require an explicit `ROLLBACK;` after an error. Earlier files that committed remain applied.

For example, if migration 003 fails after 001 and 002 succeeded, do not blindly run all four again. Resolve the cause, roll back the failed transaction if necessary, and run 003 followed by 004. The “already exists” error may indicate a previous successful run or a conflicting legacy object; inspect the definition before changing it.

There is no generated automatic down migration. Restoring the prior design requires a reviewed reverse migration or the saved backup, accounting for any new records written after deployment.

### 10.5. Verify after application

Run the audit again and check for the new recipe visibility column, new audit table, RLS on all affected tables, and the newly created functions/view. Then exercise the actual app/API using real sessions:

- Guest: public content visible, private profiles/restrictions unavailable.
- Member: own preferences/favorites available; another user's private rows unavailable.
- Restaurant creator: own menu edits succeed; another restaurant's menu remains unchanged.
- Author: edits retain reactions; deleting uses a status change.
- Admin: resolving a report hides its target and records actor/time/reason.
- Locked account: member writes fail even if an old token still exists.
- Personalized matching: an otherwise high-scoring restricted recipe is excluded.

SQL Editor owner-level SELECTs do not represent what a browser user can see under RLS. The production checks must include the caller identity and permissions used by the application.

## 11. Importing actual application data

### 11.1. Existing data does not need to be re-imported

If the Supabase project already contains your dishes, ingredients, recipes, and users, leave those records in place. Apply the migrations to that existing schema. The migrations retain existing IDs and relationships. They do not export your data to Vercel or require a re-import from Vercel.

The one intentional existing-data correction is downgrading unsupported ingredient COMPLETE claims. All other invalid existing records must be reviewed before the stronger constraints/indexes can be added successfully.

### 11.2. Prepare new datasets by table

If you have additional CSV/JSON/SQL data, map it to the existing table names and types. A practical dependency order is:

| Order | Records | Dependencies |
|---|---|---|
| 1 | Auth accounts and corresponding public profiles, if needed | Use the existing Supabase Auth flow; confirm its public-profile trigger. Do not use test UUIDs as real accounts. |
| 2 | `mon_an`, `nguyen_lieu`, `thuoc_tinh_mon` | Independent catalog data |
| 3 | `mon_an_thuoc_tinh`, preferences, restrictions, favorites | Existing dish/attribute/ingredient/profile IDs |
| 4 | `cong_thuc`, `quan_an` | Existing dishes and creator profiles as applicable |
| 5 | `ct_nguyen_lieu`, `buoc_cong_thuc`, `thuc_don` | Existing recipes, ingredients, restaurants, dishes |
| 6 | `bai_dang` | Existing author and recipe/restaurant links; valid post type |
| 7 | `binh_luan`, `cam_xuc` | Existing author/profile and PUBLIC parent posts for new interactions |
| 8 | `tep_dinh_kem` | Exactly one existing post/comment target and a real media path |
| 9 | `bao_cao`, if importing legitimate historical reports | Existing reporter/target; valid resolution metadata and processor rules |

Do not import generated audit events as if they were independently verified history. Preserve genuine historical audit records only through a separately reviewed migration with provenance.

Generated IDs should normally be omitted for new records. If a related multi-table dataset brings explicit IDs, resolve collisions, maintain a source-to-target ID map, and reconcile identity sequences afterward. Never assume that a source dish ID identifies the same dish in the target project.

### 11.3. Recipe import procedure

For each recipe, import its dish first, then create the recipe as INCOMPLETE, add its ingredient rows and ordered steps, and verify quantities/units/notes. Set COMPLETE only after reviewing the list. This avoids asserting completeness while a multi-table import is still in progress.

Where a recipe and its children must be all-or-nothing, use one SQL transaction or a suitable reviewed import function. Independent CSV imports into multiple tables are not automatically one transaction.

### 11.4. Existing sample seed

`supabase/seed.sql` is optional and only inserts five dish names/descriptions: Phở bò, Bún bò Huế, Cơm tấm, Bánh mì, and Bún thịt nướng. It skips exact names already present. It does not create recipes, ingredients, restaurants, media, or users, and it does not update existing dish rows.

The seed supplies no `hinh_anh`. Those rows may appear through the existing `/api/dishes` endpoint, but the new `search_dishes` function excludes them until genuine image references are added. Re-running the seed will not fill those images.

### 11.5. Uploads are separate from relational data

Inserting `tep_dinh_kem.duong_dan_storage` only stores a reference. It does not upload the image/video bytes. Upload real files to the intended Storage bucket, apply the bucket/access rules, and then store the correct path.

The IMAGE/VIDEO label does not verify JPG/PNG/WebP/MP4 bytes or enforce file size. Bucket names, numeric size caps, real MIME validation, and access to private media remain configuration/application tasks because those details were not specified or implemented in this migration.

### 11.6. Files that must not be used as production imports

- `supabase/tests/fixture.sql`: creates a simplified schema and Auth simulation for tests.
- `supabase/tests/requirements.sql`: inserts synthetic accounts/content and exercises permission failures.
- `report.html`, `proposal (1).html`, and the ERD Markdown: requirements documents, not table datasets.

## 12. Remaining work before calling the whole feature complete

| Work item | Why it remains | Appropriate layer |
|---|---|---|
| Apply/audit hosted SQL | Only local artifacts and isolated verification have been completed | Supabase SQL administration |
| Review existing RPCs/policies/triggers | Their definitions were unavailable through OpenAPI | Database review |
| Wire UI/API to new functions | Existing endpoints still perform their original direct queries | Express/React |
| Use verified user context for personalization/member writes | Service-role access does not apply ordinary user RLS context | Backend authentication/integration |
| Preserve session suggestions/search navigation | No session-history persistence was implemented | Client/session state |
| Render incomplete/unavailable states | Database flags do not create UI warnings by themselves | Frontend |
| Complete nearby-duplicate workflow | Candidate search is implemented, but no agreed hard proximity rule exists | Product rules and UI/API |
| Synchronize account locks with Auth sign-in restrictions | Public LOCKED blocks member writes, not Supabase Auth sign-in itself | Trusted backend and Supabase Auth |
| Validate credentials through hosted Auth settings | Public-schema migration does not configure email/password rules | Supabase Auth |
| Configure upload policy/MIME/size checks | IMAGE/VIDEO alone cannot enforce the upload requirement | Storage and upload processing |
| Supply real catalog/media data | Specifications and the five-dish seed are not a complete dataset | Data preparation/import |
| Run hosted integration/acceptance checks | Fixture tests cannot exercise the deployed Vercel/Supabase combination | Deployment verification |

## 13. Acceptance state of this delivery

The deliverable is a reviewable, locally tested set of database upgrades with traceability to the supplied requirements. It includes new enforcement, query/admin interfaces, a preflight audit, test fixtures, regression checks, and deployment guidance.

The hosted database and Vercel application remain at their previous deployment state. The next operational action is to inspect the hosted SQL using `audit.sql`, resolve genuine conflicts, and apply the four migrations in order. Actual dataset import and application integration follow as separate, explicitly identified work.
