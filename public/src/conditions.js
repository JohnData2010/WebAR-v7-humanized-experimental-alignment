/**
 * Option B privacy: one policy section per module (Qualtrics assigns `cid`).
 * - Module "sharing" (M1_*): only third-party sharing text.
 * - Module "retention" (M2_*): only retention text.
 *
 * Production: ?cid=M1_C1 ... ?cid=M2_C8
 * Localhost / ?debug=1: optional random or ?cond=1...16
 */

export const STIMULUS_VERSION = "v7_humanized_parallel_copy_3y";
export const SCREEN_ORDER_VERSION = "intro_notice_permission_demo_exit";

/** Option B - single focal section per respondent. */
export const POLICY_MODE = "focal";

/** Sharing cue text; `**...**` renders blue emphasis in the notice. */
export const THIRD_PARTY_TEXT = {
  internal_only:
    "The app's policy allows information from your use of the AR face filter to be **used only within the company**. Sharing with outside companies is not allowed.",
  external_sharing:
    "The app's policy allows information from your use of the AR face filter to be used within the company. Sharing with **outside service providers or business partners** is also allowed.",
};

export const RETENTION_TEXT = {
  immediate_delete:
    "The app can keep information from your use of the AR face filter **only while the feature is running**. It deletes the information as soon as you finish using the feature.",
  retain_up_to_3_years:
    "The app can keep information from your use of the AR face filter for **up to three years after your last use of the app**. It deletes the information after that period.",
};

/**
 * D1-D4 now map directly to the four permission combinations used by the
 * active study flow. Scope and legacy feature-specific access variants were
 * removed from the live stimulus.
 */
export const ACCESS_BUNDLES = {
  D1: {
    access_bundle: "D1",
    access_profile: "camera_only",
    data_type_group: "biometric_only",
    required_permissions: ["camera"],
    has_microphone: false,
    has_photo_library: false,
  },
  D2: {
    access_bundle: "D2",
    access_profile: "camera_microphone",
    data_type_group: "biometric_only",
    required_permissions: ["camera", "microphone"],
    has_microphone: true,
    has_photo_library: false,
  },
  D3: {
    access_bundle: "D3",
    access_profile: "camera_photo_library",
    data_type_group: "biometric_personal",
    required_permissions: ["camera", "photos"],
    has_microphone: false,
    has_photo_library: true,
  },
  D4: {
    access_bundle: "D4",
    access_profile: "camera_microphone_photo_library",
    data_type_group: "biometric_personal",
    required_permissions: ["camera", "microphone", "photos"],
    has_microphone: true,
    has_photo_library: true,
  },
};

function buildSharingCondition({ cid, condition_index, bundleKey, sharing }) {
  const bundle = ACCESS_BUNDLES[bundleKey];
  return {
    cid,
    condition_index,
    module: "sharing",
    stimulus_version: STIMULUS_VERSION,
    ...bundle,
    policy_mode: POLICY_MODE,
    sharing_condition: sharing,
    retention_condition: null,
    notice: {
      title: "How the app uses your information",
      sections: [
        {
          key: "sharing",
          heading: "Sharing with other companies",
          body: THIRD_PARTY_TEXT[sharing],
        },
      ],
    },
  };
}

function buildRetentionCondition({ cid, condition_index, bundleKey, retention }) {
  const bundle = ACCESS_BUNDLES[bundleKey];
  return {
    cid,
    condition_index,
    module: "retention",
    stimulus_version: STIMULUS_VERSION,
    ...bundle,
    policy_mode: POLICY_MODE,
    sharing_condition: null,
    retention_condition: retention,
    notice: {
      title: "How the app uses your information",
      sections: [
        {
          key: "retention",
          heading: "How long information is kept",
          body: RETENTION_TEXT[retention],
        },
      ],
    },
  };
}

/** All 16 cells - same CID keys as before. */
export const CONDITIONS_BY_CID = {
  M1_C1: buildSharingCondition({
    cid: "M1_C1",
    condition_index: 1,
    bundleKey: "D1",
    sharing: "internal_only",
  }),
  M1_C2: buildSharingCondition({
    cid: "M1_C2",
    condition_index: 2,
    bundleKey: "D1",
    sharing: "external_sharing",
  }),
  M1_C3: buildSharingCondition({
    cid: "M1_C3",
    condition_index: 3,
    bundleKey: "D2",
    sharing: "internal_only",
  }),
  M1_C4: buildSharingCondition({
    cid: "M1_C4",
    condition_index: 4,
    bundleKey: "D2",
    sharing: "external_sharing",
  }),
  M1_C5: buildSharingCondition({
    cid: "M1_C5",
    condition_index: 5,
    bundleKey: "D3",
    sharing: "internal_only",
  }),
  M1_C6: buildSharingCondition({
    cid: "M1_C6",
    condition_index: 6,
    bundleKey: "D3",
    sharing: "external_sharing",
  }),
  M1_C7: buildSharingCondition({
    cid: "M1_C7",
    condition_index: 7,
    bundleKey: "D4",
    sharing: "internal_only",
  }),
  M1_C8: buildSharingCondition({
    cid: "M1_C8",
    condition_index: 8,
    bundleKey: "D4",
    sharing: "external_sharing",
  }),

  M2_C1: buildRetentionCondition({
    cid: "M2_C1",
    condition_index: 9,
    bundleKey: "D1",
    retention: "immediate_delete",
  }),
  M2_C2: buildRetentionCondition({
    cid: "M2_C2",
    condition_index: 10,
    bundleKey: "D1",
    retention: "retain_up_to_3_years",
  }),
  M2_C3: buildRetentionCondition({
    cid: "M2_C3",
    condition_index: 11,
    bundleKey: "D2",
    retention: "immediate_delete",
  }),
  M2_C4: buildRetentionCondition({
    cid: "M2_C4",
    condition_index: 12,
    bundleKey: "D2",
    retention: "retain_up_to_3_years",
  }),
  M2_C5: buildRetentionCondition({
    cid: "M2_C5",
    condition_index: 13,
    bundleKey: "D3",
    retention: "immediate_delete",
  }),
  M2_C6: buildRetentionCondition({
    cid: "M2_C6",
    condition_index: 14,
    bundleKey: "D3",
    retention: "retain_up_to_3_years",
  }),
  M2_C7: buildRetentionCondition({
    cid: "M2_C7",
    condition_index: 15,
    bundleKey: "D4",
    retention: "immediate_delete",
  }),
  M2_C8: buildRetentionCondition({
    cid: "M2_C8",
    condition_index: 16,
    bundleKey: "D4",
    retention: "retain_up_to_3_years",
  }),
};

/** Alias - existing imports use `CONDITIONS`. */
export const CONDITIONS = CONDITIONS_BY_CID;

/** Canonical order for legacy ?cond=1...16 */
export const CONDITION_ORDER = [
  "M1_C1",
  "M1_C2",
  "M1_C3",
  "M1_C4",
  "M1_C5",
  "M1_C6",
  "M1_C7",
  "M1_C8",
  "M2_C1",
  "M2_C2",
  "M2_C3",
  "M2_C4",
  "M2_C5",
  "M2_C6",
  "M2_C7",
  "M2_C8",
];

export const LEGACY_COND_TO_CID = Object.fromEntries(
  CONDITION_ORDER.map((cid, i) => [String(i + 1), cid])
);

export const VALID_CIDS = Object.keys(CONDITIONS_BY_CID);

export function isLocalDevHost() {
  if (typeof window === "undefined" || !window.location) return false;
  try {
    const { protocol, hostname } = window.location;
    if (protocol === "file:") return true;
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]"
    );
  } catch {
    return false;
  }
}

export function getConditionFromParams(search) {
  const params = new URLSearchParams(search || "");
  const debug = params.get("debug") === "1";
  const cidParam = params.get("cid");
  const condParam = params.get("cond");

  const emptyCid = !cidParam || String(cidParam).trim() === "";

  let resolvedCid = null;
  let cidSource = "query";

  if (cidParam && CONDITIONS_BY_CID[cidParam]) {
    resolvedCid = cidParam;
    cidSource = "query";
  } else if (debug || (isLocalDevHost() && emptyCid)) {
    cidSource = debug ? "debug" : "local_preview";
    if (condParam != null && condParam !== "") {
      const n = Number(condParam);
      if (Number.isInteger(n) && n >= 1 && n <= 16) {
        resolvedCid = CONDITION_ORDER[n - 1];
      }
    }
    if (!resolvedCid) {
      resolvedCid =
        CONDITION_ORDER[Math.floor(Math.random() * CONDITION_ORDER.length)];
    }
  } else if (!emptyCid) {
    return {
      condition: null,
      validation: { valid: false },
      error: {
        code: "invalid_cid",
        message: `Unknown cid "${cidParam}". Expected one of ${VALID_CIDS.join(", ")}.`,
      },
      resolved_cid: null,
      cid_source: null,
    };
  } else {
    return {
      condition: null,
      validation: { valid: false },
      error: {
        code: "missing_cid",
        message:
          "Missing required parameter cid. Qualtrics must pass ?cid=M1_C1 (etc.). For local testing add ?debug=1 or open via localhost without cid.",
      },
      resolved_cid: null,
      cid_source: null,
    };
  }

  const condition = CONDITIONS_BY_CID[resolvedCid];
  const validation = { valid: true, mismatches: [] };

  const tpParam = params.get("tp");
  const rtParam = params.get("rt");

  if (debug && tpParam) {
    if (
      condition.module === "sharing" &&
      tpParam !== condition.sharing_condition
    ) {
      validation.valid = false;
      validation.mismatches.push("tp");
    }
    if (condition.module === "retention") {
      validation.valid = false;
      validation.mismatches.push("tp_unexpected_for_retention_module");
    }
  }

  if (debug && rtParam) {
    if (
      condition.module === "retention" &&
      rtParam !== condition.retention_condition
    ) {
      validation.valid = false;
      validation.mismatches.push("rt");
    }
    if (condition.module === "sharing") {
      validation.valid = false;
      validation.mismatches.push("rt_unexpected_for_sharing_module");
    }
  }

  if (condParam != null && condParam !== "") {
    const n = Number(condParam);
    if (!Number.isInteger(n) || n !== condition.condition_index) {
      validation.valid = false;
      validation.mismatches.push("cond_vs_condition_index");
    }
  }

  return {
    condition,
    validation,
    error: null,
    resolved_cid: resolvedCid,
    cid_source: cidSource,
  };
}
