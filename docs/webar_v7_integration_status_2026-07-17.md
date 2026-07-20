# WebAR v7 Integration Status

**Date:** 2026-07-17  
**Status:** source integrated locally; do not recruit pretest participants yet.

## What is now in the active source

The active WebAR source under `public/` has been updated from the v6 contract to the v7 humanized copy contract supplied in `WebAR_v7_humanized_experimental_alignment_patch.zip`.

- `stimulus_version`: `v7_humanized_parallel_copy_3y`
- `payload_schema_version`: `1.1.0`
- `stimulus_build_id`: `2026-07-17-v7`
- `condition_map_version`: `condition_map_v3_humanized_copy_3y`
- App display name: `AR Face Filter`
- Camera remains constant; D1-D4 represent the four microphone/photo-library permission bundles.
- Sharing uses `internal_only` and `external_sharing` with the participant-facing heading "Sharing with other companies."
- Retention uses `immediate_delete` and `retain_up_to_3_years` with the participant-facing heading "How long information is kept."
- Introduction, permission summary, permission prompts, demo status, error copy, and completion copy have been humanized.
- The neutral navigation label `Continue` is used instead of agreement-like wording.
- Access Scope and 30-day retention wording remain absent from active source.
- Production `postMessage` still fails closed until `allowedProductionParentOrigins` contains the exact trusted parent origin.

## Files changed

- `public/index.html`
- `public/src/conditions.js`
- `public/src/logger.js`
- `public/src/main.js`
- `public/src/postmessage.js`
- `public/src/protoPayload.js`
- `public/src/telemetryConfig.js`
- `public/src/ui.js`
- `docs/stimulus_spec.md`
- `docs/stimulus_active_technical_report.md`
- `docs/webar_v6_integration_status_2026-07-17.md`

The previous active files are retained in `archive/stimulus_pre_v7_2026-07-17/`.

## Verification completed locally

- JavaScript syntax check passed for every file in `public/src/`.
- All 16 condition IDs resolved to the expected module, access bundle, permissions, and policy condition.
- Active metadata matched v7: payload schema `1.1.0`, build `2026-07-17-v7`, and condition map `condition_map_v3_humanized_copy_3y`.
- Legacy Access Scope, 30-day retention, and participant-facing Vietnamese tokens were absent from active `public/` source.
- `index.html`, `test-harness.html`, and `public/src/*.js` were scanned for non-ASCII characters after cleanup.

## Required before a hosted Qualtrics test

1. Set the exact Qualtrics or approved custom-domain origin in `TELEMETRY_CONFIG.allowedProductionParentOrigins`.
2. Update the Qualtrics listener, Embedded Data manifest, expected metadata, assignment fields, manipulation-check keys, and QSF to the v7 canonical values.
3. Supply the actual production QSF, listener, manifest, deployed URL/origin, test harness/deployment configuration, and MP4 for an end-to-end 16-cell audit.
4. Implement completion acknowledgement/retry only as a coordinated WebAR and listener change.
5. Complete desktop and mobile verification of all 16 cells through exported Qualtrics data.
6. Run cognitive interviews and a soft pilot before main recruitment.

Until those gates pass, the source is suitable for local inspection and harness testing only, not cognitive pretesting or participant recruitment.
