# SQDLY Gym backend handover

2026-11-22 · Source review of SQDLY web at `8aed0137`

Gym will start in the existing Supabase Preview project and eventually share
Production with SQDLY. Both products share sign-in and a small profile. Gym owns
everything needed to operate and release its own product. The shared platform must
remain available if either product shuts down. Moving Gym to a separate database
remains an option if measured load or operational needs justify it.

## What exists today

Source paths below are relative to the sibling repository `C:/SQDLY/sportlinkvie`.
The source review is supplemented by the live Preview baseline below.
For the short diagram, see the [database architecture](database-architecture.md).

| Area | Repository evidence and integration consequence |
| --- | --- |
| Signup and roles | `supabase/migrations/20260805000000_clean_baseline.sql` installs an `auth.users` insert trigger. It creates `public.profiles` with the Auth UUID, display name from metadata or an email-derived fallback, optional avatar, and a sequence-assigned member number. It also adds the basic `public.user_roles` role `user`. This runs for any Auth signup, including a future Gym signup. Location and sport are outside the insert contract. Verify the web onboarding requirements separately. |
| Profile and visibility | The same baseline mixes display name, location, SQDLY preferences, and billing in `public.profiles`. `20260908090000_protect_profile_and_event_payment_reads.sql` limits direct profile reads to an authenticated column allowlist, with a separate self-profile RPC. Review effective row policies, contextual profile RPCs, and direct writes before exposing a shared interface. |
| Saved language | `src/i18n/index.ts` uses `set_notification_language` for initialization and explicit edits. `20261009200000_notification_language_persistence.sql` stores locale and a selection timestamp in `public.profiles`. This feeds SQDLY notifications, so the migration must preserve both preference and initialization semantics. |
| Web Auth | `src/routes/login.tsx` passes the web origin and optional next path for signup and Google OAuth, and uses the web reset route for recovery. The hook, allowlist, SMTP, template, and provider settings in the live project are separate from this source. |
| Reporting and entitlements | `20261009100000_admin_reporting_and_directory.sql` reads `auth.users` for user counts, and `20261009140000_admin_directory_page_size_and_filters.sql` joins Auth to profiles. Gym signups can appear in these views. Classify such metrics as shared accounts or filter by verified SQDLY activation before labeling them SQDLY users. SQDLY billing uses Paddle and its own entitlements and overrides, as documented in `docs/product/rules.md` and implemented in `src/lib/billing/paddle-provider.ts` and the entity subscription migrations. |
| Deletion | `20260908150000_safe_account_deletion.sql` adds a pre-delete trigger on Auth users and self/admin deletion paths. SQDLY checks owned Squads and Clubs, subscriptions, and unresolved payments. It removes or detaches business records according to their retention rules and queues Storage cleanup. `20260910100000_remove_founding_clubs.sql` updates cleanup and its bucket allowlist. See `docs/operations/data-lifecycle.md` for the existing flow and retained records. |
| Storage, mail, and operations | The baseline and `20260911100000_fix_image_storage_reads.sql` use bucket and path policies. `20261005130000_enable_notification_realtime.sql` publishes SQDLY notifications, and scheduler migrations use `cron` and restricted objects in `private`. `src/lib/email/notification-email.server.ts` calls Resend for application mail. Supabase Auth SMTP and templates are separately configured, as described in `docs/operations/configuration.md`. Preserve existing Storage, Realtime, cron, extension, and private objects. |
| Releases | `supabase/migrations` is the ordered migration history. `scripts/release-database.mjs` checks both project histories and a dry run before the Production apply confirmation. Its dry run contacts remote databases. See `docs/operations/release-runbook.md`. |

## Live Preview baseline

Verified on 2026-11-22 using a read-only SQL transaction and Supabase Management
API reads. The database connection and configured test API URL both matched the
repository's allowlisted Preview project. The check did not contact Production.

- Before the shared-profile release, Preview matched all 115 migration versions
  in the local SQDLY checkout at
  `8aed0137`. Latest applied version `20261109170000`. No pending or unknown
  versions in that comparison. This verifies history and the sampled live objects.
- `auth`, `public`, and the existing infrastructure schemas were present.
  `shared`, `gym`, and `plan` did not exist. The Data API exposes
  `public,graphql_public`; its extra search path is `public, extensions`.
- Auth signup, account deletion, and profile member numbering triggers were
  enabled. The signup handler references `public.profiles` and `public.user_roles`.
  RLS was enabled on profiles, user roles, subscriptions, and Storage objects.
  Neither API role has broad direct profile read access. Authenticated users
  have a direct member-number column grant and access to the existing self-profile
  and language RPCs. City has no direct read grant for either API role.
- Email signup and confirmation were enabled. Google and Apple providers were
  disabled. The Auth Site URL uses the SQDLY web origin, and the allowlist has one
  entry for that origin. No mobile redirect or enabled Auth hook was reported.
  Resend SMTP and confirmation/recovery templates were configured. Verify the
  template and link behavior on both phones and the web before changing them.
- Preview had seven existing Storage buckets, with two private Club buckets.
  Realtime publishes `public.notifications`, and ten cron jobs were active,
  including the external worker trigger. This confirms configuration presence.
  Actual mail delivery and worker behavior were outside the read-only check.
- PostgreSQL reported a 153 MB database and six client backends at the time of
  inspection, with `max_connections` set to 60. This is a point-in-time snapshot.
  Review sustained load and service limits before introducing heavy workloads.

**Preview update, 2026-11-22.** Applied SQDLY migration
`20261122090000_add_shared_profile_read_interface.sql` and pushed it to the
`preview` branch at `3d11dffe`. The migration history now matches all 116 local
versions. The function returned the six expected fields for two existing
accounts under their authenticated database identities, matching the existing
SQDLY profile interface. A missing profile returned no row. Anonymous Data API
access was denied, both Auth lifecycle triggers remained enabled, and a GET of
the SQDLY Preview web home page returned HTTP 200.

**Gym sign-in check.** The development app uses a fixed Preview URL and the
Preview publishable key from local Expo configuration. Sessions stay in process
memory. Password sign-in and the shared-profile read are available in Gym.
The live API check verified bad-password rejection, profile loading after
sign-in, and denial after local sign-out with a disposable Preview account.
Secure session persistence, direct Gym signup, and email confirmation and
recovery links remain separate integration work.

**Shared table on Preview, 2026-11-22.** SQDLY migration
`20261122100000_create_shared_profiles.sql` is applied. All 117 versions
matched the repository. All 23 existing profiles matched across UUID and
copied fields. SQDLY still reads and writes `public.profiles`. Its trigger
updates `shared.profiles` in the same transaction. Gym's existing RPC reads
the shared row. A hosted SQDLY web edit reached Gym's RPC in a separate
authenticated session. See the [verification record](drafts/shared-profiles-review.md#hosted-preview-verification).

## Target boundaries

| Owner | Data and interfaces |
| --- | --- |
| Shared platform | Supabase `auth` for identities and credentials. On Preview, `shared.profiles` holds Auth UUID, stable member number, display name, optional profile image reference, owner-visible home location label/country, and saved EN/DE language. The target includes one private home location for distance calculations and a separate city-only projection for other viewers. Product settings stay with their product. |
| SQDLY | Existing `public` objects and SQDLY-owned workers, buckets, jobs, settings, and subscriptions. Preserve current web interfaces during the profile transition. |
| Gym | `gym` for product activation/profile, equipment and exercises, workouts and sets, templates, plans, coaching, squads, grants, and entitlements. Gym-owned functions, buckets, secrets, and jobs as features require them. |
| Plan | A future product boundary. Provision its schema when Plan is built. |

Use the Auth UUID for ownership. Preserve member numbers for people and support
workflows, with a single allocator. Gym business rows should reference a Gym-owned
account row keyed by the shared UUID. In the shared database that account may
reference the Auth primary key. Keep this dependency at the account boundary so
a later move can attach it to migrated Auth or a local identity mapping. Keep
SQDLY and Gym free of dependencies on each other's business tables, roles, jobs,
web endpoints, or releases.

Expose a small self-profile interface with explicit fields and permissions.
Keep its long-term endpoint under shared ownership. Any legacy SQDLY wrappers
call the shared implementation.
Initially let Gym read the approved fields. Enable Gym edits only through the
reviewed shared write interface. A saved change then applies to both products.
Product-specific views of other users should expose only the fields needed for
that relationship. Shared credentials and identity metadata stay with Auth.

Display names may be shared by multiple people. Use the member number when a
person needs to identify an exact account, and use the Auth UUID for links
between records. A separate public handle is outside the current scope.

Use one current profile image reference per account. Both apps read that
reference and use the same stored image. SQDLY currently writes `avatar_url`
and uploads to the `avatars` bucket through `src/components/profile-edit-form.tsx`.
Reuse those references in the compatibility interface, with no bulk file copy.
Bring the profile image and its Storage lifecycle under shared ownership before
retiring SQDLY infrastructure. When enabling edits from both apps, commit the
new reference before removing the previous object and check that the previous
object is no longer referenced. Preserve existing image URLs and access behavior
during the transition. Product-only deletion or retirement preserves the shared
image. Whole-account deletion includes it in shared cleanup.

Add Gym access through explicit object grants and owner or relationship policies.
Keep internal objects outside the exposed API or revoke client access. Grant
RPC execution individually and restrict privileged functions. A publishable key
identifies the Supabase project. A signed-in client can call anything its user
is allowed to call, regardless of the app from which it signed in. App-specific
authorization must use verified activation, ownership, accepted relationships,
and entitlements. Schemas share Auth, capacity, backups, and project-level
configuration. [Supabase Data API security](https://supabase.com/docs/guides/api/securing-your-api)

Use separate mobile and web sessions, with mobile session storage protected by
the OS. Prefer verified HTTPS universal links and Android App Links for Gym
confirmation and recovery. Test the actual email and supported code exchange
flow on both devices, including expired links and opening on the wrong device.
Preserve web routes and add only the exact approved Gym redirects. Reuse the
Resend account if needed, with separate application send configuration and scoped
server credentials where supported. Keep shared Auth mail changes coordinated.

## Order of work and acceptance

The [profile extraction review](drafts/shared-profiles-review.md) traces the
existing SQDLY callers and records the home-location decision, local PostgreSQL
rehearsal, and hosted Preview results.

1. **Record the live Preview baseline.** See the verified snapshot above.
   Recheck project identity and history before applying future changes. Trace web
   profile writes, discovery dependencies, and onboarding in the implementation
   review. Keep the local workout slice independent of this backend work.
2. **Introduce the shared-profile contract on Preview.** The allowlisted
   adapter was first deployed over the legacy table. See the
   [reviewed SQL](drafts/shared-profile-preview.sql) and the migration version
   above. The RPC accepts no user ID and
   returns zero or one row for the signed-in user. An unselected locale returns
   null, and the client can use its device language until a preference is saved.
   Profile edits and Auth settings stay with the existing flows in this step.
   Preview checks covered field parity with SQDLY, both allowed and denied
   access, and the missing profile case. Review existing SQDLY activation
   evidence and define an explicit activation signal for future use. Preserve
   the legacy profile and baseline role during compatibility. They are not
   activation signals. A Gym-only signup must produce no SQDLY membership, paid
   entitlement, or activity. Existing accounts sign in with the same UUID.
3. **Extract the approved fields.** The additive shared table and backfill are
   verified on Preview. SQDLY remains the writer. Rehearse a coordinated cutover to one
   writer and allocator. Keep existing SQDLY reads and writes working through
   compatibility adapters, with any legacy
   values treated as projections. Keep SQDLY discovery fields and product
   settings in `public`. Confirm concurrent signup and profile updates preserve
   uniqueness and consistency. Retire legacy paths only after dependent web
   clients and jobs have been verified or retired. Move shared identity provisioning
   under shared ownership before relying on physical SQDLY removal.
4. **Add Gym activation and Preview sync.** Test new and existing accounts, email
   confirmation and recovery, device session isolation, direct API denials,
   revoked access, and idempotent sync after interruption. Use Gym-owned
   buckets, mail, and billing infrastructure only when needed. Use development
   entitlement grants during private testing.
5. **Prove lifecycle and release readiness.** Gym deletion removes Gym data
   according to Gym retention and sharing rules while leaving Auth and SQDLY
   intact. Whole-account deletion requires a coordinated preflight and clear
   confirmation across active products, including existing SQDLY deletion
   paths. Add Gym cleanup for that path before enabling it with Gym data.
   Keep the deletion entry point under shared ownership. Require successful
   cleanup or a durable cleanup record for each active product before removing
   Auth. Define deletion behavior per relationship before adding cascades.
   Test blockers, retries, asynchronous file cleanup, and preservation of other
   users' history. Run targeted SQDLY checks for signup, recovery, profile edits
   including image replacement, notifications, and deletion when touching those
   shared areas. Routine Gym-only work uses Gym checks. Use the existing release
   helper and separate approval
   for any Production promotion.

One migration history remains authoritative in the SQDLY repository while the
project is shared. Review Gym SQL there and track the applicable migration versions
from Gym. Coordinate which pending migrations a release promotes. If SQDLY is
retired, transfer ownership of the canonical repo/history, release tools, and
credentials to the remaining platform maintainer before archiving the web repo.

## Retirement and separation

**Retire a product first in a rehearsal.** Disable its activation, writers, and
scheduled work. Preserve exports and required records, drain or cancel its queues,
then revoke its service credentials and retire its endpoints and files in stages.
Keep shared Auth, identity provisioning, redirects, and essential credentials
owned by the surviving platform. Detach the retired product's lifecycle callbacks
before removing its database objects. In a disposable environment, verify the
surviving product with the retired app and services off, including new signup,
sign-in, profile edits, deletion, and its core workflows. Run the rehearsal in
both directions. Rehearse physical removal separately against the dependency
inventory. If SQDLY retires, remove its named objects in `public` only after
checking for shared or platform objects and grants there.

**Separate Gym data if needed.** Measure query latency, resource contention, and
operational limits first. Prepare a scoped restore of Gym data and dependencies,
including policies, files, jobs, and configuration. Verify counts and ownership,
reconcile writes and offline queues at cutover, and validate rollback before
switching clients. Avoid copying unrelated SQDLY data or live jobs. If identity
stays shared, define how the new backend validates centrally issued tokens and
honors account changes and revocation. This keeps sign-in dependent on the shared
identity service, which must outlive the SQDLY web app. If Gym needs fully
independent Auth, migrate eligible user identities using Supabase's supported
process, preserve UUIDs and compatible password hashes, and plan for re-login.
Independent Auth copies diverge after cutover. Review what account data can move
and how OAuth, recovery, and deletion will work at that time.
[Supabase Auth migration](https://supabase.com/kb/troubleshooting/migrating-auth-users-between-projects)
and [project restore boundaries](https://supabase.com/docs/guides/platform/clone-project).

## Items to verify before integration

- Verify web and mobile confirmation and recovery delivery and real-device
  behavior during Preview integration. Check signup requirements in the current
  web onboarding and confirm operational and provider limits before release.
- Confirm the HTTPS callback domain before mobile Auth and agree how to identify
  historically activated SQDLY accounts before changing reporting or lifecycle.
- Verify a reliable home-city source before exposing mini profiles. Review first-release self-profile edits,
  retirement/retention policy, and whole-account deletion UX before implementation.
  The choice of central versus independent Auth after a split is deferred.
