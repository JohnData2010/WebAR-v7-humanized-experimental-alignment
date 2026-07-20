import {
  EVENT_TYPES,
  TELEMETRY_CONFIG,
  buildConditionSnapshot,
  sanitizeErrorMessage,
} from "./telemetryConfig.js";

function roundMs(value) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : null;
}

export function buildReadyEvent({ createEvent }) {
  return createEvent(EVENT_TYPES.READY, {
    media_mode: TELEMETRY_CONFIG.mediaMode,
    last_completed_stage: "initialized",
  });
}

export function buildAuditEvent({
  createEvent,
  condition,
  conditionSource,
  conditionValid,
  validationMismatchCodes = [],
  legacyConditionParameterUsed = false,
}) {
  return createEvent(EVENT_TYPES.AUDIT, {
    ...buildConditionSnapshot(condition),
    condition_source: String(conditionSource || "unknown"),
    legacy_condition_parameter_used: Boolean(legacyConditionParameterUsed),
    condition_valid: Boolean(conditionValid),
    validation_ok:
      Boolean(conditionValid) && validationMismatchCodes.length === 0,
    validation_mismatch_codes: Array.isArray(validationMismatchCodes)
      ? validationMismatchCodes.map(String)
      : [],
  });
}

export function buildCompletionEvent({
  createEvent,
  condition,
  conditionValid,
  summary,
}) {
  return createEvent(EVENT_TYPES.COMPLETE, {
    ...buildConditionSnapshot(condition),
    condition_valid: Boolean(conditionValid),
    ...summary,
  });
}

export function buildErrorEvent({
  createEvent,
  condition = null,
  code,
  stage,
  message,
  recoverable = false,
  conditionSource = null,
  legacyConditionParameterUsed = false,
}) {
  return createEvent(EVENT_TYPES.ERROR, {
    condition_id: condition?.cid ? String(condition.cid) : null,
    condition_source: conditionSource ? String(conditionSource) : null,
    legacy_condition_parameter_used: Boolean(legacyConditionParameterUsed),
    error_code: String(code),
    error_stage: String(stage),
    error_recoverable: Boolean(recoverable),
    error_message: sanitizeErrorMessage(message),
  });
}

export function buildCompletionSummary({
  condition,
  conditionValid,
  lastCompletedStage,
  loggerSummary,
  safetyState,
}) {
  const conditionSnapshot = buildConditionSnapshot(condition);
  const expectedPermissions = conditionSnapshot.required_permissions;

  return {
    condition_valid: Boolean(conditionValid),
    stimulus_flow_completed: true,
    return_to_questionnaire_clicked: true,
    last_completed_stage: String(lastCompletedStage || "questionnaire_notified"),

    intro_dwell_ms: roundMs(loggerSummary.intro_dwell_ms),
    notice_dwell_ms: roundMs(loggerSummary.notice_dwell_ms),
    permission_summary_dwell_ms: roundMs(
      loggerSummary.permission_summary_dwell_ms
    ),
    preview_dwell_ms: roundMs(loggerSummary.preview_dwell_ms),
    exit_dwell_ms: roundMs(loggerSummary.exit_dwell_ms),
    total_visible_stimulus_ms: roundMs(
      loggerSummary.total_visible_stimulus_ms
    ),
    total_wall_clock_ms: roundMs(loggerSummary.total_wall_clock_ms),
    hidden_count: Number.isInteger(loggerSummary.hidden_count)
      ? loggerSummary.hidden_count
      : null,
    hidden_ms: roundMs(loggerSummary.hidden_ms),
    interaction_count: Number.isInteger(loggerSummary.interaction_count)
      ? loggerSummary.interaction_count
      : null,
    demo_interaction_count: Number.isInteger(
      loggerSummary.demo_interaction_count
    )
      ? loggerSummary.demo_interaction_count
      : null,
    demo_entered: Boolean(loggerSummary.demo_entered),
    permission_continue_clicked: Boolean(
      loggerSummary.permission_continue_clicked
    ),

    prompt_expected_count: expectedPermissions.length,
    prompt_shown_count: Number.isInteger(loggerSummary.prompt_shown_count)
      ? loggerSummary.prompt_shown_count
      : null,
    prompt_allow_click_count: Number.isInteger(
      loggerSummary.prompt_allow_click_count
    )
      ? loggerSummary.prompt_allow_click_count
      : null,
    prompt_sequence_completed: Boolean(
      loggerSummary.prompt_sequence_completed
    ),
    prompt_order_expected: expectedPermissions,
    prompt_order_completed: Array.isArray(loggerSummary.prompt_order_completed)
      ? loggerSummary.prompt_order_completed.map(String)
      : [],

    camera_prompt_required: expectedPermissions.includes("camera"),
    camera_prompt_completed: Boolean(loggerSummary.camera_prompt_completed),
    microphone_prompt_required: expectedPermissions.includes("microphone"),
    microphone_prompt_completed: Boolean(
      loggerSummary.microphone_prompt_completed
    ),
    photo_library_prompt_required: expectedPermissions.includes("photos"),
    photo_library_prompt_completed: Boolean(
      loggerSummary.photo_library_prompt_completed
    ),

    video_asset_id: TELEMETRY_CONFIG.videoAssetId,
    video_source_key: loggerSummary.video_source_key || null,
    video_duration_ms: roundMs(loggerSummary.video_duration_ms),
    video_loaded: Boolean(loggerSummary.video_loaded),
    video_started: Boolean(loggerSummary.video_started),
    video_first_pass_completed: Boolean(
      loggerSummary.video_first_pass_completed
    ),
    video_watch_ms: roundMs(loggerSummary.video_watch_ms),
    video_load_failed: Boolean(loggerSummary.video_load_failed),
    autoplay_blocked: Boolean(loggerSummary.autoplay_blocked),
    playback_start_method:
      loggerSummary.playback_start_method || "not_started",
    video_hidden_count: Number.isInteger(loggerSummary.video_hidden_count)
      ? loggerSummary.video_hidden_count
      : null,
    video_hidden_ms: roundMs(loggerSummary.video_hidden_ms),

    device_class: loggerSummary.device_class || "unknown",
    viewport_width_px: Number.isInteger(loggerSummary.viewport_width_px)
      ? loggerSummary.viewport_width_px
      : null,
    viewport_height_px: Number.isInteger(loggerSummary.viewport_height_px)
      ? loggerSummary.viewport_height_px
      : null,
    lag_flag: Boolean(loggerSummary.lag_flag),
    long_frame_count: Number.isInteger(loggerSummary.long_frame_count)
      ? loggerSummary.long_frame_count
      : null,

    real_camera_access_attempted: Boolean(safetyState.cameraAttempted),
    real_microphone_access_attempted: Boolean(
      safetyState.microphoneAttempted
    ),
    real_photo_library_access_attempted: Boolean(
      safetyState.photoLibraryAttempted
    ),
  };
}
