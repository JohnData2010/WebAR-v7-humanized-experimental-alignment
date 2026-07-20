# WebAR v7 Humanized Experimental Alignment

Static WebAR stimulus for a Qualtrics-based AR face-filter privacy experiment.

## Active Build

- Stimulus version: `v7_humanized_parallel_copy_3y`
- Payload schema version: `1.1.0`
- Stimulus build ID: `2026-07-17-v7`
- Condition map version: `condition_map_v3_humanized_copy_3y`
- Screen order version: `intro_notice_permission_demo_exit`
- Media mode: `demo_video_preview`

## Study Structure

The stimulus contains 16 condition IDs across two separate 2 x 2 x 2 experiments.

- `M1_C1` to `M1_C8`: sharing module
- `M2_C1` to `M2_C8`: retention module
- Camera is constant in all conditions.
- Microphone and photo-library access form permission bundles `D1` to `D4`.
- Access Scope is not part of the active stimulus.

## Local Run

```powershell
python -m http.server 8765 --bind 127.0.0.1 --directory public
```

Open:

```text
http://127.0.0.1:8765/test-harness.html
```

## Vercel

This project is static and deploys from `public/`.

Routes are configured in `vercel.json`:

- `/` -> `/index.html`
- `/test-harness` -> `/test-harness.html`

## Important Deployment Gate

Production `postMessage` is restricted to approved parent origins configured in:

```text
public/src/telemetryConfig.js
```

The hosted QA deployment currently allows:

```javascript
allowedProductionParentOrigins: ["https://web-ar-version-21.vercel.app"]
```

Before embedding in Qualtrics, add the exact Qualtrics or approved custom-domain parent origin:

```javascript
allowedProductionParentOrigins: ["https://YOUR_QUALTRICS_OR_CUSTOM_DOMAIN"]
```

Do not use participant recruitment until the QSF, listener, manifest, Vercel deployment, MP4, and 16-cell export QA have passed.

## Included Documentation

- `docs/stimulus_spec.md`
- `docs/webar_v7_integration_status_2026-07-17.md`
- `docs/vercel_connection_setup_2026-07-20.md`
- `docs/WebAR_v7_Humanized_Copy_and_Experimental_Alignment.docx`
