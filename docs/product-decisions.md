# SQDLY Gym product decisions

This is the working record for product conversations about SQDLY Gym. Add
ideas and questions as they come up. Record decisions when agreed, with the
reason and any follow-up. If a decision changes, link the new decision to the
earlier one so the reasoning stays easy to find.

## Product direction

- Gym is a simple, affordable native iOS and Android strength-training app
  for everyday gym users and small coaches. Its core loop is to start a
  workout, log sets quickly, and understand progress.
- Workout logging works offline, survives an app restart, and supports
  English and German. Broader multi-sport planning belongs to future SQDLY Plan.

## Decisions carried over on 2026-11-22

- **Private pilot on both platforms.** Validate offline logging, crash
  recovery, history, and a simple ghost before expanding. This tests the core
  workout experience before adding more workflows.
- **Shared identity and profile.** People can sign up directly in Gym or
  reuse an existing SQDLY login. The apps share a basic profile and one
  profile image. Display names can repeat and there is no separate @handle.
  Workouts, memberships, coaching, billing, and permissions belong to each
  product. See the [database architecture](database-architecture.md).
- **Access after downgrade.** Users keep access to their workout history and
  export after downgrading.

## Live Ghost decisions

**Status.** The Ghost discussion is paused and still open. The decisions
below are agreed so far. The remaining design questions will be revisited
when the discussion resumes.

- **Scope.** The challenge compares a complete workout against one specific
  saved workout with the same exercises. This gives the challenge a consistent
  basis across the whole session.
- **Scoring principle.** A comparable set can move ahead of the Ghost when
  the added weight outweighs one fewer repetition. The agreed example is
  62.5 kg × 9 finishing narrowly ahead of 60 kg × 10. Total volume and a fixed
  repetition minimum both miss this trade-off.
- **Pilot set formula.** Use Epley's estimated one-rep maximum,
  `weight × (1 + reps / 30)`, to compare eligible sets. The accepted example
  scores 81.25 versus 80, a 1.56% advantage. This is a challenge value based
  on logged sets. The estimate was studied using sets to fatigue, and the
  app does not know how many reps were left in reserve. Comparable rep range,
  workout aggregation, exercise order, and handling of changed sets are open.
  See [LeSuer et al. (1997)](https://doi.org/10.1519/00124278-199711000-00001).

## Workout logging with exercise cards

- Use one card per exercise during a workout. The card highlights the next
  set and its weight and reps. Logged sets stay accessible for corrections.
  Additional information such as statistics can be opened when wanted.
- Make the card stack available from every exercise card. It shows the workout
  order and each exercise's progress. Open the stack and select any exercise
  directly. Switching preserves logged sets and unfinished exercises without
  changing the planned order. Changing the order is a separate action.
- The interaction concept is agreed. Exact visual design and controls will be
  decided later.

## Circuit logging decision

Both planned and spontaneous circuits are valid logging workflows. In a
planned circuit, choose the exercises before the first round. In a spontaneous
circuit, log the first round as it happens and reuse its exercise sequence
for subsequent rounds. In both cases, log sets in the order they are performed
without adding the same exercise again each round. Pilot inclusion is open.

**Ghost scoring.** Score each exercise in a circuit under the same rules as
when it is logged on its own. Circuit grouping has no effect on the score.

## Gym Squad prototype decision

- Start with a private pinboard for simple text posts and a flat list of
  replies under each post. Squad admins can pin posts at the top. The other
  posts appear newest first, so each Squad can put its own priorities first.
- Use the app's standard encrypted connection and enforce Squad membership
  on the server for reading and writing. The prototype needs no custom
  end-to-end encryption, live group chat, or nested replies.
- Shareable Ghosts, challenges, achievements, and badges are ideas for richer
  posts after trying the basic pinboard. The separate private workout pilot
  retains its proposed scope.

## Gym Squad discovery starting point

- Squad admins can opt into discovery by publishing a short recruitment
  listing and turn discovery off when recruitment ends. People can send a
  join request. The admin approves membership before the applicant can see
  the private pinboard or member list.
- Search by city or postal code, with optional filters for a specific studio
  branch and typical training times. Listings can use tags for training style,
  experience level, or shared goals. Age and gender preferences, if used, are
  voluntary descriptions of the group's focus rather than filters on members'
  personal data.
- Show studios with recruiting Squads in the selected area. Let users type
  a studio name to select a branch or browse across studios nearby. Start
  with studios used by participating Squads and offer a way to report a
  missing studio. A comprehensive studio directory is a later option.

## Pricing hypotheses

- Free logging and one self-created template.
- Premium at €0.99 per month.
- Coaching at €1.99 per month per 20 active clients.
- Premium boundaries and coaching billing rules remain open.

## Ideas discussed

- Reusable templates, custom exercises and equipment variants, previous set
  values, rest timers, history, and export.
- An optional personal ghost that represents a whole previous workout and
  updates alongside the current session. Show weight and reps directly and
  avoid pacing pressure.
- Simple progress trends, personal goals, and weekly or alternating two-week
  schedules.
- Coaching with client consent, versioned assignments, and scoped feedback.
  Clients can run assigned workouts for free.
- Small private Gym Squads with voluntary sharing, friend ghosts, and later
  challenges.
- Official accounts for fitness studios are a later idea. First, test one
  branch with one staff member using a regular account as Squad admin and
  one recurring training meetup. See whether members join, meet, and return,
  and whether staff keep organizing it. Revisit studio accounts when there
  is repeat activity and a concrete need such as multiple staff admins or
  support for several branches. Finding new customers through the app would
  also depend on having enough active users near the branch.

## Current development state

The Expo setup works on both physical phones. Preview sign-in and shared
profile loading are in place. The workout product is still to be built. See
the [user manual](user-manual.md) for current app behavior.

## Proposed pilot scope

- Start an empty workout or repeat a completed one. Add exercises, record and
  correct weight and reps, then finish and reopen the workout in history. Use a
  short exercise list and allow a custom name when an exercise is missing.
- Resume the active workout and read saved history after a force-close and
  offline restart. Verify this on both physical platforms.
- Offer an optional whole-workout ghost when repeating a saved session.
  Let testers open its overview during training and compare the two workouts
  when they finish. Include repeat workout so testers can reach the ghost in
  two sessions.
- Use invited Preview accounts for the pilot. Defer self-service signup,
  template editing, equipment management, rest timers, charts, goals, schedules,
  automated export, coaching, Squads, and billing. Provide a way for testers
  to retrieve their logs on request if needed.

## Pilot proposal for the personal ghost

The product direction is a live comparison with one complete past workout.
This replaces the earlier pilot proposal for a per-exercise “Last time” hint.
The interaction below is open for discussion.

- Choose **Repeat with Ghost** from a completed workout. Keep that dated
  session as the reference throughout. Its exercises and sets are visible
  in a workout overview alongside today's evolving session.
- Advance the comparison when the user logs a set or changes exercises.
  Briefly highlight the matching pair, then make the next reference set
  easy to see. During rests the ghost stays put. Keep the full overview a tap
  away and let the user hide the ghost during training.
- If the pilot allows reordering, move the reference to the active exercise.
  For example, when the bench is occupied, move to rows and return to bench
  press later. The same-exercise requirement still applies.
- At the end, show a side-by-side workout recap with matched, skipped, and
  added work. Show actual weights and reps alongside the challenge result.
- Test whether a workout-driven replay feels live and adds value beyond past
  set values. An independent clock-based replay remains an open alternative.

## Proposed tester questions

- Can people start, log, correct, and finish a workout without help? Observe
  where they hesitate or reach for their previous logging method.
- Do sets and history survive airplane mode and a force-close? Verify a
  recovery exercise on both physical platforms and investigate any lost data
  before expanding the pilot.
- On a repeat workout, can people follow both sessions when exercise order
  changes? Observe whether they open the overview, use the final comparison,
  start another workout with a ghost, or hide it because it gets in the way.
- What repeatedly makes users reach for a coach, training partner, or another
  app? Ask for a recent example before prioritizing assignments, sharing, or
  paid features.

## Open pilot decisions

- Should the first group focus on people who repeat workouts or include
  people who improvise from the start?
- Is repeating a completed workout enough for the pilot, or does a first
  group already need reusable templates before it can train with Gym?
