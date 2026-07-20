import {
  isLocalDevHost,
  SCREEN_ORDER_VERSION,
  STIMULUS_VERSION,
} from "./conditions.js";

export const TELEMETRY_CONFIG = Object.freeze({
  payloadSchemaVersion: "1.1.0",
  stimulusVersion: STIMULUS_VERSION,
  stimulusBuildId: "2026-07-17-v7",
  conditionMapVersion: "condition_map_v3_humanized_copy_3y",
  screenOrderVersion: SCREEN_ORDER_VERSION,
  mediaMode: "demo_video_preview",
  videoAssetId: "ar_face_filter_preview_v1",
  // Hosted QA parent. Add the exact Qualtrics/custom-domain origin before
  // embedding the stimulus in a survey.
  allowedProductionParentOrigins: ["https://web-ar-version-21.vercel.app"],
});

export const EVENT_TYPES = Object.freeze({
  READY: "AR_PROTO_READY",
  REQUEST_AUDIT: "AR_PROTO_REQUEST_AUDIT",
  AUDIT: "AR_PROTO_AUDIT",
  COMPLETE: "AR_PROTO_COMPLETE",
  ERROR: "AR_PROTO_ERROR",
});

const RUNTIME_ENVIRONMENTS = new Set([
  "local",
  "test",
  "pilot",
  "production",
]);

export function createUuid() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `fallback-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalizePermissions(value) {
  const allowed = new Set(["camera", "microphone", "photos"]);
  if (!Array.isArray(value)) return [];
  return value.filter((item) => allowed.has(item));
}

export function buildConditionSnapshot(condition) {
  if (!condition) {
    throw new Error("Condition is required.");
  }

  const requiredPermissions = normalizePermissions(condition.required_permissions);

  return {
    condition_id: String(condition.cid),
    policy_module: String(condition.module),
    policy_condition:
      condition.module === "sharing"
        ? String(condition.sharing_condition)
        : String(condition.retention_condition),
    access_bundle: String(condition.access_bundle),
    access_profile: String(condition.access_profile),
    data_type_group: String(condition.data_type_group),
    required_permissions: requiredPermissions,
    has_microphone: requiredPermissions.includes("microphone"),
    has_photo_library: requiredPermissions.includes("photos"),
    media_mode: TELEMETRY_CONFIG.mediaMode,
  };
}

export function createEventFactory({
  runtimeEnvironment,
  attemptId = null,
  attemptNumber = 1,
}) {
  const stimulusSessionId = createUuid();
  let eventSequence = 0;

  return function createEvent(type, payload = {}) {
    eventSequence += 1;

    return {
      type,
      payload_schema_version: TELEMETRY_CONFIG.payloadSchemaVersion,
      stimulus_version: TELEMETRY_CONFIG.stimulusVersion,
      stimulus_build_id: TELEMETRY_CONFIG.stimulusBuildId,
      condition_map_version: TELEMETRY_CONFIG.conditionMapVersion,
      screen_order_version: TELEMETRY_CONFIG.screenOrderVersion,
      runtime_environment: runtimeEnvironment,
      stimulus_session_id: stimulusSessionId,
      attempt_id: attemptId,
      attempt_number: attemptNumber,
      event_id: createUuid(),
      event_sequence: eventSequence,
      event_sent_at_utc: new Date().toISOString(),
      payload,
    };
  };
}

export function sanitizeErrorMessage(value, maxLength = 240) {
  return String(value ?? "")
    .replace(/https?:\/\/\S+/gi, "[url removed]")
    .replace(
      /[?&](PROLIFIC_PID|STUDY_ID|SESSION_ID)=[^&\s]*/gi,
      ""
    )
    .slice(0, maxLength);
}

export function detectRuntimeEnvironment(search = "") {
  const params = new URLSearchParams(search || "");
  const requested =
    params.get("runtime_environment") || params.get("env") || "";

  if (isLocalDevHost()) {
    if (RUNTIME_ENVIRONMENTS.has(requested)) return requested;
    return params.get("debug") === "1" ? "test" : "local";
  }

  // A remote participant must not be able to weaken production origin checks
  // by changing a query parameter to "test" or "local".
  return "production";
}

export function resolveConditionSource({
  errorCode = null,
  cidSource = null,
  cidParamPresent = false,
  condParamPresent = false,
}) {
  if (errorCode === "missing_cid") return "missing";
  if (errorCode === "invalid_cid") return "invalid";
  if (cidSource === "query" && cidParamPresent) return "cid";
  if (condParamPresent) return "legacy_cond";
  if (cidSource === "local_preview") return "local_preview";
  if (cidSource === "debug") return "debug_random";
  return "unknown";
}
