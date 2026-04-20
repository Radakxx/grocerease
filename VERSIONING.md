# Grocerease Versioning Strategy

This document defines how app versions, Git versions, and Google Play rollout tracks relate.

## Goals

- Keep releases predictable and reversible.
- Ship safely: closed testing first, then gradual production rollout.
- Make every Play build traceable to a specific Git state.

## Versioning Model

Grocerease uses Semantic Versioning for release identity:

- `MAJOR.MINOR.PATCH`
- `MAJOR`: breaking or high-impact behavior change
- `MINOR`: backward-compatible feature additions
- `PATCH`: backward-compatible bug fixes and small improvements

Examples:

- `1.0.0` first public-ready baseline
- `1.1.0` new feature release
- `1.1.1` bugfix release

## Android Mapping

- `versionName`: human-readable release version (SemVer), e.g. `1.2.3`
- `versionCode`: strictly increasing integer used by Google Play for upgrade ordering

Rules:

- Every uploaded build gets a new `versionCode`.
- `versionCode` must never be reused or decreased.
- Production hotfixes must use a higher `versionCode` than the broken release.

## Recommended `versionCode` Scheme

Use a deterministic mapping from SemVer:

- `versionCode = MAJOR * 10000 + MINOR * 100 + PATCH`

Examples:

- `1.0.0` -> `10000`
- `1.2.3` -> `10203`
- `2.0.0` -> `20000`

This keeps ordering obvious and allows many patch/minor releases.

## Git Relationship

Each release must map to one Git commit and one tag:

- Git tag format: `vX.Y.Z` (example: `v1.2.3`)
- Tags must point to the commit used to create the Play artifact.
- Only release from `main`.

Branching:

- Develop on feature/fix/docs branches.
- Merge to `main` via PR.
- Cut release from latest `main` after validation.

## Closed-First Rollout Strategy

Distribution tracks and versioning are separate concerns:

- Tracks control **who receives** a build.
- `versionCode` controls **which build upgrades** another.

Release flow:

1. Build and upload new version to **internal** or **closed** track.
2. Validate with testers (stability, regressions, crash-free behavior).
3. Promote the same build (same `versionCode`) to broader track(s), or upload a fixed build with higher `versionCode`.
4. For production, use staged rollout percentages (example: 5% -> 20% -> 50% -> 100%).

Notes:

- It is valid to promote the exact tested artifact from closed to production.
- If issues are found, do not roll back `versionCode`; ship a new patch release.

## Pre-Release Convention (Optional)

For testing communication, use pre-release labels in notes/changelog:

- `1.3.0-alpha.1`
- `1.3.0-beta.1`
- `1.3.0-rc.1`

When publishing to production, finalize to normal SemVer (e.g. `1.3.0`).

## Release Checklist

Before any Play upload:

- Confirm target version bump (`MAJOR`/`MINOR`/`PATCH`).
- Update `versionName` and `versionCode`.
- Run validation:
  - `npm run lint`
  - `npm run test:unit`
  - manual smoke checks on critical flows
- Update changelog/release notes.
- Ensure release commit is merged to `main`.
- Create Git tag `vX.Y.Z`.
- Build/sign artifact and upload to chosen Play track.

Before production promotion:

- Review closed/internal tester feedback.
- Check crash and ANR signals in Play Console.
- Roll out in stages and monitor metrics between steps.

## Hotfix Policy

When a production issue is found:

1. Branch from `main` (or latest release commit).
2. Apply minimal fix.
3. Bump `PATCH` and `versionCode`.
4. Validate quickly (lint, tests, focused manual checks).
5. Upload to closed/internal first when possible, then fast-track staged production rollout.
6. Merge fix back to `main` if developed elsewhere.

## Changelog Guidance

Maintain a changelog entry per release with:

- Added
- Changed
- Fixed
- Removed (if applicable)

Use user-facing language for Play release notes and technical detail for repository history.

## Definition Of Done For A Release

A release is complete when:

- Version numbers are correct and unique.
- The release is tagged in Git.
- The uploaded artifact is traceable to the tagged commit.
- Validation and rollout checks are completed for the target track.
