import { getConditionFromParams } from "./conditions.js";
import {
  initPostMessageOrigin,
  isTrustedParentMessage,
  sendMessage,
} from "./postmessage.js";
import {
  buildAuditEvent,
  buildErrorEvent,
  buildReadyEvent,
} from "./protoPayload.js";
import {
  EVENT_TYPES,
  TELEMETRY_CONFIG,
  createEventFactory,
  detectRuntimeEnvironment,
  resolveConditionSource,
} from "./telemetryConfig.js";
import { AppUI } from "./ui.js";

function showErrorState(root, err) {
  root.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "card";
  wrap.style.cssText =
    "max-width:400px;margin:32px auto;padding:20px;border-radius:16px;border:1px solid #fecaca;background:#fff1f2;color:#7f1d1d;font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;";
  const h = document.createElement("div");
  h.style.fontWeight = "600";
  h.style.marginBottom = "8px";
  h.textContent = "AR demo cannot load";
  const p = document.createElement("p");
  p.style.margin = "0 0 8px 0";
  p.textContent = err.message || "Invalid configuration.";
  const code = document.createElement("code");
  code.style.display = "block";
  code.style.fontSize = "12px";
  code.style.marginTop = "8px";
  code.textContent = `code: ${err.code || "error"}`;
  wrap.append(h, p, code);
  root.appendChild(wrap);
}

function init() {
  const params = new URLSearchParams(window.location.search);
  const runtimeEnvironment = detectRuntimeEnvironment(window.location.search);
  const attemptId = params.get("attempt_id") || null;
  const attemptNumberRaw = Number(params.get("attempt_number"));
  const attemptNumber =
    Number.isInteger(attemptNumberRaw) && attemptNumberRaw > 0
      ? attemptNumberRaw
      : 1;

  const createEvent = createEventFactory({
    runtimeEnvironment,
    attemptId,
    attemptNumber,
  });

  const messagingInit = initPostMessageOrigin({
    runtimeEnvironment,
    allowedProductionParentOrigins:
      TELEMETRY_CONFIG.allowedProductionParentOrigins,
  });

  const appBody = document.getElementById("appBody");

  if (!messagingInit.ok) {
    if (appBody) {
      showErrorState(appBody, {
        code: messagingInit.code,
        message: messagingInit.message,
      });
    }
    return;
  }

  sendMessage(buildReadyEvent({ createEvent }));

  const result = getConditionFromParams(window.location.search);
  const condParamRaw = params.get("cond");
  const cidParamRaw = params.get("cid");
  const conditionSource = resolveConditionSource({
    errorCode: result.error?.code || null,
    cidSource: result.cid_source || null,
    cidParamPresent: cidParamRaw != null && cidParamRaw !== "",
    condParamPresent: condParamRaw != null && condParamRaw !== "",
  });
  const legacyConditionParameterUsed =
    condParamRaw != null && condParamRaw !== "";

  if (result.error) {
    sendMessage(
      buildErrorEvent({
        createEvent,
        code: result.error.code,
        stage: "condition_resolution",
        message: result.error.message,
        recoverable: false,
        conditionSource,
        legacyConditionParameterUsed,
      })
    );

    if (appBody) {
      showErrorState(appBody, result.error);
    }
    return;
  }

  const { condition, validation } = result;
  const auditEvent = buildAuditEvent({
    createEvent,
    condition,
    conditionSource,
    conditionValid: validation.valid,
    validationMismatchCodes: validation.mismatches || [],
    legacyConditionParameterUsed,
  });

  sendMessage(auditEvent);

  window.addEventListener("message", (event) => {
    if (!isTrustedParentMessage(event)) return;

    const message = event.data;
    if (!message || message.type !== EVENT_TYPES.REQUEST_AUDIT) return;
    sendMessage(auditEvent);
  });

  const headerStatus = document.getElementById("headerStatus");
  const showDevConditionBadge = false;

  if (headerStatus) {
    headerStatus.style.display = "inline-flex";

    if (showDevConditionBadge) {
      const ok = validation.valid;
      headerStatus.classList.remove("exit-icon");
      headerStatus.classList.add("condition-badge-debug");
      headerStatus.setAttribute("aria-hidden", "false");
      headerStatus.setAttribute("role", "note");
      headerStatus.textContent = ok ? condition.cid : `${condition.cid} !`;
    } else {
      headerStatus.classList.add("exit-icon");
      headerStatus.classList.remove("condition-badge-debug");
      headerStatus.textContent = "-";
      headerStatus.title = "Status";
      headerStatus.setAttribute("aria-hidden", "true");
      headerStatus.style.color = "";
      headerStatus.style.borderColor = "";
      headerStatus.style.background = "";
    }
  }

  if (!appBody) return;

  // eslint-disable-next-line no-new
  new AppUI({
    root: appBody,
    condition,
    debug: params.get("debug") === "1",
    condition_valid: validation.valid,
    createEvent,
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
