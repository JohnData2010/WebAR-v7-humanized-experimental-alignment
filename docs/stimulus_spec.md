# Stimulus specification - active build

**Stimulus version:** `v7_humanized_parallel_copy_3y`  
**Payload schema version:** `1.1.0`  
**Stimulus build ID:** `2026-07-17-v7`  
**Condition map version:** `condition_map_v3_humanized_copy_3y`  
**Screen order version:** `intro_notice_permission_demo_exit`

The active build is a guided simulated AR face-filter stimulus. It does not access the participant's real camera, microphone, photos, videos, or other device data.

## Screen flow

1. `Introduction`
2. `How this app handles information`
3. `App permissions`
4. `Preview the demo`
5. `Demo done`

The preview screen first shows simulated permission prompts. The demo video starts only after the final prompt is completed. The participant must complete one full video pass before `Continue` is enabled.

## Policy manipulation

Each participant sees one policy module only:

- `sharing` module: `internal_only` vs `external_sharing`
- `retention` module: `immediate_delete` vs `retain_up_to_3_years`

Canonical payload fields:

- `policy_module = "sharing" | "retention"`
- `policy_condition = "internal_only" | "external_sharing" | "immediate_delete" | "retain_up_to_3_years"`

Participant-facing policy headings in v7:

- Sharing module: "Sharing with other companies"
- Retention module: "How long information is kept"

Locked v7 treatment wording:

- `internal_only`: "The app's policy allows information from your use of the AR face filter to be used only within the company. Sharing with outside companies is not allowed."
- `external_sharing`: "The app's policy allows information from your use of the AR face filter to be used within the company. Sharing with outside service providers or business partners is also allowed."
- `immediate_delete`: "The app can keep information from your use of the AR face filter only while the feature is running. It deletes the information as soon as you finish using the feature."
- `retain_up_to_3_years`: "The app can keep information from your use of the AR face filter for up to three years after your last use of the app. It deletes the information after that period."

## Permission bundles

| Bundle | Access profile | Data type group | Required permissions |
|--------|----------------|-----------------|----------------------|
| D1 | `camera_only` | `biometric_only` | `["camera"]` |
| D2 | `camera_microphone` | `biometric_only` | `["camera", "microphone"]` |
| D3 | `camera_photo_library` | `biometric_personal` | `["camera", "photos"]` |
| D4 | `camera_microphone_photo_library` | `biometric_personal` | `["camera", "microphone", "photos"]` |

## Condition table

### Sharing module

| CID | Bundle | Policy condition |
|-----|--------|------------------|
| M1_C1 | D1 | internal_only |
| M1_C2 | D1 | external_sharing |
| M1_C3 | D2 | internal_only |
| M1_C4 | D2 | external_sharing |
| M1_C5 | D3 | internal_only |
| M1_C6 | D3 | external_sharing |
| M1_C7 | D4 | internal_only |
| M1_C8 | D4 | external_sharing |

### Retention module

| CID | Bundle | Policy condition |
|-----|--------|------------------|
| M2_C1 | D1 | immediate_delete |
| M2_C2 | D1 | retain_up_to_3_years |
| M2_C3 | D2 | immediate_delete |
| M2_C4 | D2 | retain_up_to_3_years |
| M2_C5 | D3 | immediate_delete |
| M2_C6 | D3 | retain_up_to_3_years |
| M2_C7 | D4 | immediate_delete |
| M2_C8 | D4 | retain_up_to_3_years |

The internal numeric order used for legacy `?cond=1...16` validation is stored as `condition_index` inside `public/src/conditions.js`. The canonical emitted condition identifier remains the CID string, for example `M1_C6`.

## Media mode

The active build uses one shared local demo video for every condition.

- `media_mode = "demo_video_preview"`
- `video_asset_id = "ar_face_filter_preview_v1"`

The build does not use live camera preview or real device permission APIs.

## Telemetry envelope

Messages are emitted as:

```javascript
{
  type,
  payload_schema_version,
  stimulus_version,
  stimulus_build_id,
  condition_map_version,
  screen_order_version,
  runtime_environment,
  stimulus_session_id,
  attempt_id,
  attempt_number,
  event_id,
  event_sequence,
  event_sent_at_utc,
  payload
}
```

## Canonical payload fields

Audit and completion payloads use the same canonical condition fields:

- `condition_id`
- `policy_module`
- `policy_condition`
- `access_bundle`
- `access_profile`
- `data_type_group`
- `required_permissions`
- `has_microphone`
- `has_photo_library`
- `media_mode`
- `condition_valid`

Completion payloads also include:

- `stimulus_flow_completed`
- `return_to_questionnaire_clicked`
- `last_completed_stage`
- `intro_dwell_ms`
- `notice_dwell_ms`
- `permission_summary_dwell_ms`
- `preview_dwell_ms`
- `exit_dwell_ms`
- `total_visible_stimulus_ms`
- `total_wall_clock_ms`
- `hidden_count`
- `hidden_ms`
- `prompt_expected_count`
- `prompt_shown_count`
- `prompt_allow_click_count`
- `prompt_sequence_completed`
- `prompt_order_expected`
- `prompt_order_completed`
- `camera_prompt_required`
- `camera_prompt_completed`
- `microphone_prompt_required`
- `microphone_prompt_completed`
- `photo_library_prompt_required`
- `photo_library_prompt_completed`
- `video_loaded`
- `video_started`
- `video_first_pass_completed`
- `video_watch_ms`
- `video_load_failed`
- `autoplay_blocked`
- `playback_start_method`
- `video_hidden_count`
- `video_hidden_ms`
- `device_class`
- `viewport_width_px`
- `viewport_height_px`
- `lag_flag`
- `long_frame_count`
- `real_camera_access_attempted`
- `real_microphone_access_attempted`
- `real_photo_library_access_attempted`

## Fields intentionally removed from the active contract

The active build no longer emits legacy payload fields such as:

- `cid`
- `condition_num`
- `returned_condition_id`
- `sharing_displayed`
- `retention_displayed`
- `policy_section_shown`
- `displayed_policy_sections`
- `camera_permission`
- `microphone_permission`
- `photo_permission`
- `camera_preview_ready`
- `webcam_requested`
- `microphone_requested`
- `photo_library_requested`
