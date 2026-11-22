# SQDLY Gym Agent Guide

Use the [database architecture](docs/database-architecture.md) for the product
boundaries and the [backend handover](docs/backend-handover.md) for the current
SQDLY evidence, proposed integration, and gates for changing shared services.

## Product and development

- Gym is a separate Android/iOS workout tracker. Keep logging fast and usable offline.
  SQDLY web and future Plan own their own features and releases.
- Use the shared Expo/React Native TypeScript app for Android and iOS. Pin the
  Expo SDK and supported Node version, commit the lockfile, and use development
  builds for native verification. On Windows, use `npm.cmd` and `npx.cmd` if needed.
- Use translation keys for English and German. Test small screens, large text,
  touch targets, and useful loading, offline, and error states.
- Preserve unrelated changes. Keep edits focused and use the repository's actual
  scripts. Report device, emulator, and mocked results separately.

## Expo builds

- Default to Expo Free. Use `npm start` and Fast Refresh on both installed
  development apps for day-to-day TypeScript, UI, and translation changes.
  Local development and local Android builds use no EAS Build quota.
- When requested work requires a new native build, tell the user as soon as this
  is known and before starting the build. Name the affected platforms, why the
  existing builds cannot pick up the change, and whether a reinstall is needed.
  Common triggers include native dependency, Expo SDK, permission, and deep-link
  configuration changes.
- Group related, authorized native changes that can be verified together into
  one build per affected platform where practical. Run local checks first and
  build only the affected platforms. Build sooner when a change needs immediate
  verification or batching would block work. Use EAS for iOS from Windows and
  choose local Android builds or EAS as appropriate. Flag quota or queue limits
  when they affect the work, and ask before changing the Expo plan.

## Documentation

- Maintain the architecture guide and user manual as part of the project.
  Review both for every change and update any affected sections in the same
  change. Create the relevant guide when there is material to document for the
  first time.
- Keep the architecture guide aligned with the implementation, including
  platform and backend boundaries, data flows, and build and release behavior.
  Keep the user manual aligned with the current screens, workflows, and
  limitations. Document future plans separately from current behavior.
- Include the documentation review in the handoff. Name any updated sections
  or state briefly that the guides still fit the change.

## Data and identity

- In each environment, share the Supabase Auth identity and the approved profile
  fields. Use the Auth UUID as the identity key. Gym uses the shared profile
  interface and owns its product data in `gym`. Keep SQDLY in its existing `public`
  layout and reserve Plan for future work.
- Allow duplicate display names. Use the member number for exact identification
  in user workflows and the Auth UUID for links between records.
- Share one current profile image and Storage reference across products.
  Replace it through the shared profile flow and preserve it during
  product-only deletion or shutdown.
- Gym has its own activation, roles, coaching relationships, billing, entitlements,
  files, jobs, and settings. Avoid dependencies on SQDLY tables, APIs, deployments,
  workers, and credentials. Keep provider calls behind Gym-owned interfaces.
- Treat feature access as a server decision. Use explicit grants, RLS, and scoped
  RPCs. Derive the caller from verified Auth. Test allowed and denied access
  directly, including revoked coaching or sharing access. Keep authorization out
  of user-editable metadata. Review function execution grants and search paths.
- Mobile bundles may use the Supabase publishable key. Keep database, service-role,
  billing, and mail credentials server-side. Keep tokens, recovery links, private
  workout data, and provider payloads out of diagnostics.
- Keep Gym-only deletion distinct from shared account deletion. Product shutdown
  must leave shared Auth and the other product operational. Document every new shared
  dependency and any retention or export consequence.

## Offline and release

- Persist workouts and pending sync locally by environment and account. Use stable
  IDs, retries that cannot duplicate writes, and explicit conflict and deletion
  handling. Preserve unacknowledged changes on logout or account switch. Keep tokens
  in OS-protected storage. Derive timers from persisted timestamps and interruptions.
- Version templates and assignments. Preserve completed workouts when templates or
  catalogues change. Validate recovery after a force-close on both physical phones.
- Use the existing Preview project for integration and verify the actual project
  target. Keep Production access and builds separate. Exercise features with
  disposable Preview accounts and scoped cleanup.
- Follow the SQDLY repository's single ordered migration workflow for the shared
  project. Use forward compatible migrations, preserve applied history, and coordinate
  shared Auth, profile, access, and deletion changes with SQDLY. Production changes
  require separate authorization.
- Run focused Gym checks for isolated changes. Add affected SQDLY checks for
  changes to shared contracts, configuration, permissions, or services and for
  significant new database workloads. Keep migration and deployment status distinct.
- Use `preview` for day-to-day Gym development. Keep `main` as the release
  baseline and promote reviewed changes from `preview` through a pull request.
  Select and verify the Supabase target through configuration for each build.
