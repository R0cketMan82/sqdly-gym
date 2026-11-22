# Shared profile extraction for Preview

Reviewed against SQDLY web commit `3d11dffe`. Preview migration
`20261122100000_create_shared_profiles.sql` keeps SQDLY as the writer and
makes Gym's existing self-profile RPC read a private shared table.
The [reviewed SQL](shared-profiles-table-preview.sql) is retained here for reference.

## Hosted Preview verification

On 2026-11-22 the API and database targets matched Preview project
`vigxuizwiakfollsetpo`. The first CLI attempt rejected a standalone lock
and rolled back. A procedural block took the same lock successfully. A
rollback rehearsal of the revised migration took 141 ms for the SQL and
row-count check. The CLI then applied the single pending migration.

- All 117 migration versions matched. All 23 profiles reconciled with zero
  missing rows or differing fields. RLS, the synchronization trigger and the
  three existing Auth/profile lifecycle triggers were enabled. The API roles
  lacked direct shared-table access.
- Two disposable users authenticated using passwords and received distinct
  member numbers. A real login and name edit in Chromium on
  `sqdly.vercel.app` appeared in Gym's existing RPC in a separate session.
  Anonymous RPC access and direct shared-schema API access were denied.
  One account could not edit the other account's profile.
- Tests through the hosted APIs covered home location edits and clearing,
  language changes, the Squad discovery RPC, the roster profile query, two
  avatar uploads, reference checks and replacement. Cleanup confirmed both
  test users, their profile rows and both avatar objects were gone.
- SQDLY's deletion and language regression suites passed 54 and 22 checks
  respectively and rolled back their fixtures. This deployment used a
  browser for SQDLY and the live mobile API for Gym. A manual screen check
  on each physical phone remains separate.
- **Follow-up regression run, 2026-11-22.** All 41 selected Preview integration,
  browser and responsive tests passed. They covered private profile access,
  discovery, rosters, directory reads, signup and recovery callbacks, language,
  avatar replacement, and deletion. Email delivery was mocked for the callback
  tests. The deletion confirmation UI ran on six emulated viewports.
  All 82 SQDLY unit tests and seven local image tests passed, as did Gym's
  TypeScript check. On Windows the unit runner needed explicit test filenames,
  and the image suite used a static readiness URL after its homepage probe
  timed out. After fixture cleanup, a fresh hosted web edit reached Gym's RPC
  and all 23 shared profiles reconciled with zero mismatches.

## Home location and visibility

A person enters their home location once. It supplies the origin for distances
to SQDLY groups and squads and, eventually, to Gym venues. Each destination
owns its own location. The owner's profile can show their entered home location.
When another person sees a Gym mini profile, the location shown is the home
city alone. Omit the location when the city is unknown.

The existing self-profile RPC calls its location field `city`. The web editor
can store a fallback label there. The draft therefore names the copied value
`home_location_label` internally and preserves the existing API field name for
installed clients. It has one authenticated, caller-only reader. The existing
precise home location stays in SQDLY during this stage.

For the later shared home-location capability, capture the locality separately
from the private selection and coordinates. The web geocoder currently also
falls back to county or state, and the editor can fall back to a venue or a
formatted address. Use the structured city, town, village, or municipality for
the mini profile. Verify existing localities before showing them there.
Give distance queries the signed-in person's origin and return the needed
distance to a destination. Keep home addresses and coordinates out of responses
to other people. The current SQDLY `UserProfileDialog` calls
`get_user_profile_summary`, whose return fields omit location altogether.

## Dependencies in SQDLY

Paths in the table are relative to the SQDLY web repository.

| Flow | Existing dependency | Compatibility requirement |
| --- | --- | --- |
| Signup and repair | Baseline `handle_new_user` inserts the profile and basic role. `tg_assign_member_number` uses `public.member_number_seq`. Migration `20260805030000` restores missing legacy profiles. | Copy the assigned number, including zero. Preserve duplicate names and existing nulls. Keep one allocator. |
| Web profile and onboarding | `src/components/profile-edit-form.tsx` updates name, avatar, and home location. `post-login-prompts.tsx` also writes location, including coordinates. | Observe both write paths in the same transaction. A location clear must propagate. |
| Discovery, search, and display | `src/lib/profile-location.ts`, the Discover queries and dashboard use location, coordinates, or radius. Home and share-message read names. Club team and Squad roster/search read names, avatar URLs, and member numbers. Event bundles, contextual profile RPCs, calendars, and admin functions join legacy profiles. | Keep the existing table, FKs, row shape, column grants, and SQDLY queries in place. |
| Locale | `src/i18n/index.ts` calls `set_notification_language` for initialization and explicit edits. SQL notification producers read the legacy locale. | Expose a saved locale after selection. Preserve pre-existing German on first initialization and explicit English thereafter. |
| Avatar | The editor uploads a new object, saves the URL and calls `storage_object_is_referenced` before removing the previous object. The deletion worker and `scripts/audit-storage-orphans.mjs` also consult legacy references. | Copy the URL only. Bring all three reference checks under shared ownership before introducing an independent shared writer or retiring legacy rows. |
| Product-only updates | Favorites, quotas, subscriptions, and admin overrides update other columns on the same row. | Limit the copy trigger to writes naming the approved source columns. |
| Deletion and maintenance | Whole-account deletion runs SQDLY preflight and deletes Auth. `scripts/manual/pre-release-cleanup.sql` can delete Auth users, renumber the retained user and restart the allocator. Some SQDLY test fixtures deliberately suppress triggers. | Attach the shared row to Auth. Keep reset, repair, re-key, and trigger-bypass operations coordinated. Reconcile after any bulk import. Review the reset script before operating multiple products. |

## What the migration does

1. Create an unexposed schema and table with RLS and explicitly restricted
   privileges. The only client entry point is the existing zero-argument RPC.
2. Take a bounded writer lock on legacy profiles, install one-way synchronization
   and copy the rows. A single view defines the mapping. Compare both tables
   by UUID, including every copied value, before switching the RPC. Run the
   whole file in one transaction. Waiting signups and edits resume on commit.
3. Keep the temporary SQDLY writer, signup trigger, allocator and image workflow.
   A shared copy survives removal of a legacy row while its Auth identity exists.
   The Auth FK removes the shared row when whole-account deletion succeeds.
   Product-only deletion and reactivation still need a coordinated flow that
   preserves the member number and image when a legacy row is re-created.

## Verification and promotion

- **Local rehearsal, 2026-11-22.** A disposable PostgreSQL 18 server used
  synthetic accounts, reduced tables and roles, and the SQDLY signup,
  numbering, language, and existing self-read functions from migration source.
  A busy legacy writer caused the migration to time out and roll back. On a
  successful run, a web read continued while a signup and edit waited on
  separate connections. Both writes appeared after commit. Tests covered
  number zero, duplicate names, image replacement, location edits and clearing,
  locale initialization, missing profile, anonymous and cross-account denial,
  direct table denial, unrelated edits, transaction rollback, and Auth deletion.
  This exercise covered the database behavior. Hosted Auth, Storage, PostgREST,
  notification delivery, web screens, and devices require Preview verification.
- **Before Preview.** Promote a reviewed copy through the SQDLY migration
  history. Verify the project ref, pending versions, schema absence, object
  owner/grants, enabled triggers, and counts of missing legacy rows or numbers.
  Investigate mismatches before applying. Measure copy duration and the writer
  lock window against Preview's actual row count.
- **On Preview.** Reconcile all fields, check API access as anonymous and as
  two disposable users, edit in SQDLY and reload Gym, including an image change,
  location clear, and language edit. Check signups, discovery/rosters, whole-account
  deletion blockers, and cleanup on disposable accounts. Use the same installed
  development builds. Record deployment separately.
- **Recovery.** Failure before commit rolls back the migration. If the shared
  reader is faulty after commit, restore the prior RPC body and grants with a
  forward migration. If synchronization blocks web writes, detach its trigger
  in that same recovery transaction and reconcile the copy before re-enabling it.
  Legacy profiles and their allocator remain current throughout this stage.
- **Later cutover.** Move provisioning, the member-number allocator, home
  location access, and image lifecycle under shared ownership. Exercise older
  web clients through compatibility adapters and rehearse each product's
  removal before enabling independent writes or product-only deletion.
