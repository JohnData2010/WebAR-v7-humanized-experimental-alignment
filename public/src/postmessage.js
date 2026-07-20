let parentOrigin = null;
let wildcardAllowed = true;
let messagingEnabled = true;

export function initPostMessageOrigin({
  runtimeEnvironment = "local",
  allowedProductionParentOrigins = [],
} = {}) {
  let parsedOrigin = null;

  try {
    if (document.referrer) {
      parsedOrigin = new URL(document.referrer).origin;
    }
  } catch {
    parsedOrigin = null;
  }

  const localLike = runtimeEnvironment !== "production";

  if (localLike) {
    parentOrigin = parsedOrigin;
    wildcardAllowed = !parsedOrigin;
    messagingEnabled = true;
    return {
      ok: true,
      parentOrigin: parsedOrigin,
      wildcardAllowed,
    };
  }

  const allowlist = new Set(
    (allowedProductionParentOrigins || []).filter(Boolean)
  );

  if (allowlist.size === 0) {
    parentOrigin = null;
    wildcardAllowed = false;
    messagingEnabled = false;
    return {
      ok: false,
      code: "production_parent_allowlist_empty",
      message:
        "Production messaging is disabled until the trusted Qualtrics parent origin is configured.",
    };
  }

  if (!parsedOrigin) {
    parentOrigin = null;
    wildcardAllowed = false;
    messagingEnabled = false;
    return {
      ok: false,
      code: "untrusted_parent_origin",
      message:
        "Production messaging requires a trusted parent origin from document.referrer.",
    };
  }

  if (!allowlist.has(parsedOrigin)) {
    parentOrigin = null;
    wildcardAllowed = false;
    messagingEnabled = false;
    return {
      ok: false,
      code: "untrusted_parent_origin",
      message: `Parent origin "${parsedOrigin}" is not in the allowed production origin list.`,
    };
  }

  parentOrigin = parsedOrigin;
  wildcardAllowed = false;
  messagingEnabled = true;
  return {
    ok: true,
    parentOrigin: parsedOrigin,
    wildcardAllowed: false,
  };
}

export function sendMessage(message) {
  if (typeof window === "undefined" || !window.parent || !messagingEnabled) {
    return false;
  }

  const targetOrigin = parentOrigin || (wildcardAllowed ? "*" : null);
  if (!targetOrigin) return false;

  try {
    window.parent.postMessage(message, targetOrigin);
    return true;
  } catch {
    if (!wildcardAllowed) return false;

    try {
      window.parent.postMessage(message, "*");
      return true;
    } catch {
      return false;
    }
  }
}

export function isTrustedParentMessage(event) {
  if (!event || typeof window === "undefined") {
    return false;
  }

  if (event.source !== window.parent) {
    return false;
  }

  if (wildcardAllowed) {
    return true;
  }

  return Boolean(parentOrigin) && event.origin === parentOrigin;
}

export function sendCompletionMessage(summary) {
  return sendMessage(summary);
}
