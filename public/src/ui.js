import { Logger } from "./logger.js";
import {
  buildCompletionEvent,
  buildCompletionSummary,
  buildErrorEvent,
} from "./protoPayload.js";
import { sendCompletionMessage, sendMessage } from "./postmessage.js";

function renderInlineMarkdown(input = "") {
  return String(input).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SCREENS = {
  INTRO: "intro",
  NOTICE: "notice",
  PERMISSIONS: "permissions",
  DEMO: "demo",
  EXIT: "exit",
};

const RETENTION_NOTICE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>`;
const SHARING_NOTICE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`;

const CAMERA_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h8A2.5 2.5 0 0 1 16 8.5v7a2.5 2.5 0 0 1-2.5 2.5h-8A2.5 2.5 0 0 1 3 15.5v-7Z"/><path d="M16 10.5 21 8v8l-5-2.5"/></svg>';
const MIC_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0"/><path d="M12 17v4"/><path d="M9 21h6"/></svg>';
const PHOTOS_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m5.5 17 4.5-4.5 3.2 3.2 2.3-2.3 3 3.6"/></svg>';

const GATE_POLL_MS = 150;
const VIDEO_CANDIDATE_TIMEOUT_MS = 8000;

export class AppUI {
  constructor({
    root,
    condition,
    debug = false,
    condition_valid = true,
    createEvent,
  }) {
    this.root = root;
    this.condition = condition;
    this.debug = debug;
    this.condition_valid = condition_valid;
    this.createEvent = createEvent;
    this.logger = new Logger();

    this.currentScreen = null;
    this.completionSent = false;
    this.lastCompletedStage = "initialized";

    this.realDeviceAccess = {
      cameraAttempted: false,
      microphoneAttempted: false,
      photoLibraryAttempted: false,
    };

    this.introMinMs = 5000;
    this.noticeMinMs = 6000;
    this.permissionsMinMs = 5000;
    this.permissionDecisionDelayMs = 3000;

    this.introGate = null;
    this.noticeGate = null;
    this.permissionsGate = null;
    this.promptGate = null;

    this.cameraGranted = false;
    this.micGranted = false;
    this.photosGranted = false;
    this.demoCompleted = false;
    this.demoContinueEnabled = false;

    this.videoLoaded = false;
    this.videoStarted = false;
    this.videoEnded = false;
    this.videoLoadFailed = false;
    this.awaitingManualVideoStart = false;

    this.activePromptOverlay = null;
    this.promptPreviousFocus = null;
    this.videoResumeHandler = null;
    this.videoEventHandlers = null;

    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    this.init();
  }

  init() {
    this.root.innerHTML = "";
    const intro = this.buildIntroScreen();
    const notice = this.buildNoticeScreen();
    const permissions = this.buildPermissionsScreen();
    const demo = this.buildDemoScreen();
    const exit = this.buildExitScreen();

    this.root.append(intro, notice, permissions, demo, exit);
    this.toScreen(SCREENS.INTRO);
  }

  toScreen(screen) {
    const prev = this.currentScreen;

    if (prev === SCREENS.INTRO && screen !== SCREENS.INTRO) {
      this.logger.markIntroHidden();
      this.clearGate("introGate");
    }

    if (prev === SCREENS.NOTICE && screen !== SCREENS.NOTICE) {
      this.logger.markNoticeHidden();
      this.clearGate("noticeGate");
    }

    if (prev === SCREENS.PERMISSIONS && screen !== SCREENS.PERMISSIONS) {
      this.logger.markPermissionsHidden();
      this.clearGate("permissionsGate");
    }

    if (prev === SCREENS.DEMO && screen !== SCREENS.DEMO) {
      this.logger.markDemoHidden();
      this.cleanupPromptOverlay();
      this.stopCamera();
    }

    if (prev === SCREENS.EXIT && screen !== SCREENS.EXIT) {
      this.logger.markExitHidden();
    }

    this.currentScreen = screen;

    const screens = this.root.querySelectorAll(".screen");
    screens.forEach((el) => {
      el.classList.toggle("active", el.dataset.screen === screen);
    });

    if (screen === SCREENS.INTRO) {
      if (document.visibilityState === "visible") {
        this.logger.markIntroVisible();
      }
      this.onEnterIntro();
      return;
    }

    if (screen === SCREENS.NOTICE) {
      this.onEnterNotice();
      return;
    }

    if (screen === SCREENS.PERMISSIONS) {
      this.onEnterPermissions();
      return;
    }

    if (screen === SCREENS.DEMO) {
      this.onEnterDemo();
      return;
    }

    if (screen === SCREENS.EXIT) {
      if (document.visibilityState === "visible") {
        this.logger.markExitVisible();
      }
      this.onEnterExit();
    }
  }

  getRequiredPermissions() {
    if (Array.isArray(this.condition?.required_permissions)) {
      return this.condition.required_permissions.slice();
    }
    return ["camera"];
  }

  getPermissionMeta(kind) {
    if (kind === "camera") {
      return {
        label: "Camera",
        icon: CAMERA_ICON,
        purpose:
          "Uses the camera to place the filter on your face as you move.",
        title: 'Allow "AR Face Filter" to access the camera?',
        message:
          "The camera is used to place the filter on your face as you move.",
      };
    }

    if (kind === "microphone") {
      return {
        label: "Microphone",
        icon: MIC_ICON,
        purpose:
          "Uses the microphone so the filter can respond to your voice or other sounds.",
        title: 'Allow "AR Face Filter" to access the microphone?',
        message:
          "The microphone is used so the filter can respond to your voice or other sounds.",
      };
    }

    return {
      label: "Photo library",
      icon: PHOTOS_ICON,
      purpose:
        "Lets you choose a photo or video from your library to use with the filter.",
      title: 'Allow "AR Face Filter" to access photos and videos on this device?',
      message:
        "Photos and videos from your library can be used with the filter.",
    };
  }

  buildIntroScreen() {
    const el = document.createElement("section");
    el.className = "screen";
    el.dataset.screen = SCREENS.INTRO;

    const title = document.createElement("div");
    title.className = "screen-title";
    title.textContent = "Before you begin";

    const card = document.createElement("div");
    card.className = "card card-contrast";

    const body = document.createElement("div");
    body.className = "notice-text notice-read-column screen-subtitle-intro";
    body.innerHTML = `
      <p>You are about to try a simulated AR face-filter experience.</p>
      <p>This page will not access any real device features or personal information.</p>
      <p>Please imagine that these screens appear while you are trying a face filter in a social media app.</p>
      <p>When a simulated permission request appears, select Allow to continue. This will not grant real access to your device.</p>
    `;

    card.appendChild(body);

    const btnRow = document.createElement("div");
    btnRow.className = "btn-row";

    const primary = document.createElement("button");
    primary.className = "btn btn-primary btn-disabled";
    primary.textContent = "Start the experience";
    primary.id = "introContinueButton";
    primary.disabled = true;
    primary.addEventListener("click", () => {
      if (primary.disabled) return;
      this.logger.addInteraction();
      this.lastCompletedStage = "intro_completed";
      this.toScreen(SCREENS.NOTICE);
    });

    btnRow.appendChild(primary);
    el.append(title, card, btnRow);
    return el;
  }

  buildNoticeSectionsInnerHtml() {
    const sections = this.condition.notice?.sections || [];
    return sections
      .map((sec) => {
        if (sec.key === "retention") {
          return `
      <div class="notice-policy-block notice-retention-highlight" data-section="${escapeHtml(sec.key)}">
        <div class="notice-retention-row">
          <div class="notice-retention-icon" aria-hidden="true">${RETENTION_NOTICE_ICON}</div>
          <div class="notice-retention-copy">
            <p class="notice-policy-heading">${escapeHtml(sec.heading)}</p>
            <p class="notice-policy-body">${renderInlineMarkdown(sec.body)}</p>
          </div>
        </div>
      </div>`;
        }

        if (sec.key === "sharing") {
          return `
      <div class="notice-policy-block notice-sharing-highlight" data-section="${escapeHtml(sec.key)}">
        <div class="notice-sharing-row">
          <div class="notice-sharing-icon" aria-hidden="true">${SHARING_NOTICE_ICON}</div>
          <div class="notice-sharing-copy">
            <p class="notice-policy-heading">${escapeHtml(sec.heading)}</p>
            <p class="notice-policy-body">${renderInlineMarkdown(sec.body)}</p>
          </div>
        </div>
      </div>`;
        }

        return `
      <div class="notice-policy-block" data-section="${escapeHtml(sec.key)}">
        <p class="notice-policy-heading">${escapeHtml(sec.heading)}</p>
        <p class="notice-policy-body">${renderInlineMarkdown(sec.body)}</p>
      </div>`;
      })
      .join("");
  }

  buildNoticeScreen() {
    const el = document.createElement("section");
    el.className = "screen";
    el.dataset.screen = SCREENS.NOTICE;

    const title = document.createElement("div");
    title.className = "screen-title";
    title.textContent =
      this.condition.notice?.title || "How the app uses your information";

    const card = document.createElement("div");
    card.className = "notice-policy-outer-flat";
    card.innerHTML = `<div class="notice-text notice-read-column">${this.buildNoticeSectionsInnerHtml()}</div>`;

    const btnRow = document.createElement("div");
    btnRow.className = "btn-row";

    const back = document.createElement("button");
    back.className = "btn btn-secondary";
    back.textContent = "Back";
    back.addEventListener("click", () => {
      this.logger.addInteraction();
      this.toScreen(SCREENS.INTRO);
    });

    const primary = document.createElement("button");
    primary.className = "btn btn-primary btn-disabled";
    primary.textContent = "Continue";
    primary.id = "noticeContinueButton";
    primary.disabled = true;
    primary.addEventListener("click", () => {
      if (primary.disabled) return;
      this.logger.addInteraction();
      this.lastCompletedStage = "notice_completed";
      this.toScreen(SCREENS.PERMISSIONS);
    });

    btnRow.append(back, primary);
    el.append(title, card, btnRow);
    return el;
  }

  buildPermissionsScreen() {
    const el = document.createElement("section");
    el.className = "screen";
    el.dataset.screen = SCREENS.PERMISSIONS;

    const title = document.createElement("div");
    title.className = "screen-title";
    title.textContent = "Permissions requested";

    const subtitle = document.createElement("div");
    subtitle.className = "screen-subtitle";
    subtitle.textContent =
      "To use this AR face filter, the app asks for access to the following features on your phone.";

    const permissionRows = this.getRequiredPermissions()
      .map((kind) => {
        const meta = this.getPermissionMeta(kind);
        return `
        <div class="permission-item">
          <div class="permission-item-icon-wrap" aria-hidden="true">${meta.icon}</div>
          <div class="permission-item-copy">
            <p class="permission-item-title">${meta.label}</p>
            <p class="permission-item-body">${meta.purpose}</p>
          </div>
        </div>`;
      })
      .join("");

    const card = document.createElement("div");
    card.className = "card permissions-focal-card";
    card.innerHTML = `
      <div class="notice-text notice-read-column permission-panel">
        <div class="permission-item-list">${permissionRows}</div>
      </div>`;

    const btnRow = document.createElement("div");
    btnRow.className = "btn-row";
    btnRow.style.marginTop = "8px";

    const back = document.createElement("button");
    back.className = "btn btn-secondary";
    back.textContent = "Back";
    back.addEventListener("click", () => {
      this.logger.addInteraction();
      this.toScreen(SCREENS.NOTICE);
    });

    const primary = document.createElement("button");
    primary.className = "btn btn-primary btn-disabled";
    primary.textContent = "Continue";
    primary.id = "permissionsContinueButton";
    primary.disabled = true;
    primary.addEventListener("click", () => {
      if (primary.disabled) return;
      this.logger.addInteraction();
      this.logger.markPermissionContinueClicked();
      this.lastCompletedStage = "permission_summary_completed";
      this.toScreen(SCREENS.DEMO);
    });

    btnRow.append(back, primary);
    el.append(title, subtitle, card, btnRow);
    return el;
  }

  buildDemoScreen() {
    const el = document.createElement("section");
    el.className = "screen";
    el.dataset.screen = SCREENS.DEMO;

    const title = document.createElement("div");
    title.className = "screen-title";
    title.textContent = "Try the AR face filter";

    const demoShell = document.createElement("div");
    demoShell.className = "demo-shell";

    const frame = document.createElement("div");
    frame.className = "demo-video-frame";
    frame.id = "demoFrame";

    const placeholder = document.createElement("div");
    placeholder.className = "demo-placeholder";
    placeholder.id = "demoPlaceholder";

    const placeholderImage = document.createElement("img");
    placeholderImage.src =
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 600'%3E%3Crect width='400' height='600' fill='%23e0f2fe'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%236b7280' font-family='system-ui' font-size='16'%3EDemo preview%3C/text%3E%3C/svg%3E";
    placeholderImage.alt = "Demo placeholder";
    placeholderImage.style.cssText =
      "width:100%;height:100%;object-fit:cover;";
    placeholder.appendChild(placeholderImage);

    const video = document.createElement("video");
    video.className = "demo-camera-video";
    video.id = "demoCameraVideo";
    video.setAttribute("playsinline", "");
    video.setAttribute("muted", "");
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.style.display = "none";

    const socialUI = document.getElementById("social-ui-template");
    if (socialUI) {
      frame.appendChild(socialUI.content.cloneNode(true));
    }

    const grainTemplate = document.getElementById("grain-overlay-template");
    if (grainTemplate) {
      frame.appendChild(grainTemplate.content.cloneNode(true));
    }

    frame.append(placeholder, video);
    demoShell.appendChild(frame);

    const ctaText = document.createElement("div");
    ctaText.className = "demo-cta-text";
    ctaText.id = "demoCtaText";
    ctaText.textContent =
      "Simulated permission requests will appear before the filter starts.";
    demoShell.appendChild(ctaText);

    el.append(title, demoShell);

    const btnRow = document.createElement("div");
    btnRow.className = "btn-row";
    btnRow.style.marginTop = "8px";

    const continueBtn = document.createElement("button");
    continueBtn.className = "btn btn-primary btn-disabled";
    continueBtn.id = "demoContinueButton";
    continueBtn.textContent = "Continue";
    continueBtn.disabled = true;
    continueBtn.addEventListener("click", () => {
      if (!this.demoContinueEnabled) return;
      this.logger.addInteraction({ demo: true });
      this.demoCompleted = true;
      this.toScreen(SCREENS.EXIT);
    });

    btnRow.appendChild(continueBtn);
    el.appendChild(btnRow);
    return el;
  }

  buildExitScreen() {
    const el = document.createElement("section");
    el.className = "screen";
    el.dataset.screen = SCREENS.EXIT;

    const title = document.createElement("div");
    title.className = "screen-title";
    title.textContent = "Experience complete";

    const card = document.createElement("div");
    card.className = "card card-contrast";

    const body = document.createElement("div");
    body.className = "notice-text notice-read-column";
    body.textContent =
      "You have finished the AR face-filter experience. Continue to the questionnaire to tell us what you think.";

    card.appendChild(body);

    const btnRow = document.createElement("div");
    btnRow.className = "btn-row";
    btnRow.style.marginTop = "8px";

    const primary = document.createElement("button");
    primary.className = "btn btn-primary";
    primary.id = "exitContinueButton";
    primary.textContent = "Continue to questionnaire";
    primary.addEventListener("click", () => {
      this.logger.addInteraction();
      if (this.completionSent) return;
      this.lastCompletedStage = "questionnaire_notification_attempted";
      const sent = this.finishAndSendData();
      if (sent) {
        this.completionSent = true;
        this.lastCompletedStage = "questionnaire_notified";
        primary.disabled = true;
        primary.classList.add("btn-disabled");
        primary.textContent = "Returning to questionnaire...";
        return;
      }
      primary.disabled = false;
      primary.classList.remove("btn-disabled");
      primary.textContent = "Try again";
    });

    btnRow.appendChild(primary);
    el.append(title, card, btnRow);
    return el;
  }

  onEnterIntro() {
    const btn = document.getElementById("introContinueButton");
    if (!btn) return;

    this.startButtonGate("introGate", {
      button: btn,
      minMs: this.introMinMs,
      enabledText: "Start the experience",
    });
  }

  onEnterNotice() {
    if (document.visibilityState === "visible") {
      this.logger.markNoticeVisible();
    }

    const btn = document.getElementById("noticeContinueButton");
    if (!btn) return;

    this.startButtonGate("noticeGate", {
      button: btn,
      minMs: this.noticeMinMs,
      enabledText: "Continue",
    });
  }

  onEnterPermissions() {
    if (document.visibilityState === "visible") {
      this.logger.markPermissionsVisible();
    }

    const btn = document.getElementById("permissionsContinueButton");
    if (!btn) return;

    this.startButtonGate("permissionsGate", {
      button: btn,
      minMs: this.permissionsMinMs,
      enabledText: "Continue",
    });
  }

  onEnterDemo() {
    this.demoCompleted = false;
    this.demoContinueEnabled = false;
    this.cameraGranted = false;
    this.micGranted = false;
    this.photosGranted = false;
    this.videoLoaded = false;
    this.videoStarted = false;
    this.videoEnded = false;
    this.videoLoadFailed = false;
    this.awaitingManualVideoStart = false;

    this.cleanupPromptOverlay();
    this.updateContinueButton(false);

    if (document.visibilityState === "visible") {
      this.logger.markDemoVisible();
    }
    this.logger.markDemoEntered();
    this.logger.startLagMonitor();

    this.setDemoCtaText(
      "Select Allow on each simulated request to start the filter."
    );

    this.promptPermissionsSequentially();
  }

  promptPermissionsSequentially() {
    const kinds = this.getRequiredPermissions();

    const promptAt = async (index) => {
      if (index >= kinds.length) {
        this.logger.markSimulatedPromptSequenceCompleted();
        this.lastCompletedStage = "prompt_sequence_completed";
        await this.enableCameraView();
        this.updateDemoGatingState();
        return;
      }

      const kind = kinds[index];
      this.showPermissionPrompt(kind, async () => {
        if (kind === "camera") {
          this.cameraGranted = true;
        } else if (kind === "microphone") {
          this.micGranted = true;
        } else if (kind === "photos") {
          this.photosGranted = true;
        }

        this.logger.markPromptCompleted(kind);
        this.updateDemoGatingState();
        await promptAt(index + 1);
      });
    };

    this.setDemoCtaText(
      "Select Allow on each simulated request to start the filter."
    );

    void promptAt(0);
  }

  showPermissionPrompt(kind, onAllow) {
    const meta = this.getPermissionMeta(kind);
    this.logger.markSimulatedPromptShown(kind);

    const overlay = document.createElement("div");
    overlay.className = "ar-permission-overlay";
    overlay.style.background = "rgba(15, 23, 42, 0.48)";
    overlay.style.backdropFilter = "blur(4px)";
    overlay.style.webkitBackdropFilter = "blur(4px)";

    const card = document.createElement("div");
    card.className = "ar-permission-card";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "true");
    card.tabIndex = -1;
    card.style.cssText =
      "background:#ffffff;border:1px solid rgba(148,163,184,0.38);" +
      "border-radius:16px;box-shadow:0 16px 34px rgba(15,23,42,0.32);" +
      "padding:14px 0 0;max-width:min(332px,100%);overflow:hidden;";

    const iconWrap = document.createElement("div");
    iconWrap.setAttribute("aria-hidden", "true");
    iconWrap.style.cssText =
      "width:42px;height:42px;margin:0 auto 10px;border-radius:12px;" +
      "background:rgba(0,122,255,0.12);" +
      "display:flex;align-items:center;justify-content:center;color:#2563eb;";
    iconWrap.innerHTML = meta.icon;
    const promptIcon = iconWrap.querySelector("svg");
    if (promptIcon) {
      promptIcon.style.width = "21px";
      promptIcon.style.height = "21px";
      promptIcon.style.stroke = "currentColor";
      promptIcon.style.strokeWidth = "1.9";
      promptIcon.style.fill = "none";
      promptIcon.style.display = "block";
    }

    const title = document.createElement("div");
    title.id = `permissionPromptTitle-${kind}`;
    card.setAttribute("aria-labelledby", title.id);
    title.style.cssText =
      "font-size:15px;font-weight:500;color:#111827;text-align:center;" +
      "margin:0 16px 8px;line-height:1.35;";
    title.textContent = meta.title;

    const message = document.createElement("div");
    message.style.cssText =
      "font-size:13px;color:#4b5563;line-height:1.45;text-align:center;" +
      "margin:0 18px 12px;";
    message.textContent = meta.message;

    const buttonsCol = document.createElement("div");
    buttonsCol.style.cssText =
      "display:flex;flex-direction:column;border-top:1px solid rgba(203,213,225,0.9);";

    const actionBtn = document.createElement("button");
    actionBtn.type = "button";
    actionBtn.textContent = "Allow";
    actionBtn.style.cssText =
      "width:100%;border:none;border-radius:0 0 16px 16px;padding:13px 12px;" +
      "font-size:14px;font-weight:600;min-height:48px;cursor:pointer;" +
      "background:linear-gradient(180deg,#f8fbff 0%,#eef4ff 100%);" +
      "color:#1d4ed8;box-shadow:inset 0 1px 0 rgba(255,255,255,0.95);";

    actionBtn.addEventListener("click", async () => {
      if (actionBtn.disabled) return;
      this.logger.markSimulatedAllowClicked(kind);
      this.cleanupPromptOverlay();
      await onAllow();
    });

    buttonsCol.appendChild(actionBtn);
    card.append(iconWrap, title, message, buttonsCol);
    overlay.appendChild(card);
    this.promptPreviousFocus = document.activeElement;
    document.body.appendChild(overlay);
    card.focus({ preventScroll: true });

    this.activePromptOverlay = overlay;
    this.startButtonGate("promptGate", {
      button: actionBtn,
      minMs: this.permissionDecisionDelayMs,
      enabledText: "Allow",
    });
  }

  updateDemoGatingState() {
    const required = this.getRequiredPermissions();
    const needMic = required.includes("microphone");
    const needPhotos = required.includes("photos");
    const allRequiredGranted =
      this.cameraGranted &&
      (!needMic || this.micGranted) &&
      (!needPhotos || this.photosGranted);

    if (!allRequiredGranted) {
      this.demoContinueEnabled = false;
      this.updateContinueButton(false);
      this.setDemoCtaText(
        "Select Allow on each simulated request to start the filter."
      );
      return;
    }

    if (this.videoLoadFailed) {
      this.demoContinueEnabled = false;
      this.updateContinueButton(false);
      this.setDemoCtaText(
        "The AR face filter could not be loaded. Please reload the page before continuing."
      );
      return;
    }

    if (!this.videoLoaded) {
      this.demoContinueEnabled = false;
      this.updateContinueButton(false);
      this.setDemoCtaText("Loading the AR face filter...");
      return;
    }

    if (this.awaitingManualVideoStart) {
      this.demoContinueEnabled = false;
      this.updateContinueButton(false);
      this.setDemoCtaText("Tap the preview to start the AR face filter.");
      return;
    }

    if (!this.videoEnded) {
      this.demoContinueEnabled = false;
      this.updateContinueButton(false);
      this.setDemoCtaText("");
      return;
    }

    this.demoContinueEnabled = true;
    this.updateContinueButton(true);
    this.setDemoCtaText("");
  }

  updateContinueButton(enabled) {
    const btn = document.getElementById("demoContinueButton");
    if (!btn) return;

    if (enabled) {
      btn.classList.remove("btn-disabled");
      btn.disabled = false;
      btn.textContent = "Continue";
      return;
    }

    btn.classList.add("btn-disabled");
    btn.disabled = true;
    btn.textContent = "Continue";
  }

  setDemoCtaText(text) {
    const cta = document.getElementById("demoCtaText");
    if (!cta) return;

    if (text) {
      cta.textContent = text;
      cta.style.display = "";
      return;
    }

    cta.textContent = "";
    cta.style.display = "none";
  }

  async enableCameraView() {
    const video = document.getElementById("demoCameraVideo");
    const placeholder = document.getElementById("demoPlaceholder");
    if (!(video instanceof HTMLVideoElement)) return;

    this.detachVideoListeners(video);
    this.removeVideoResumeHandler(video);

    video.pause();
    video.removeAttribute("src");
    video.loop = true;
    video.autoplay = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("autoplay", "");
    video.setAttribute("preload", "auto");
    video.muted = true;
    video.volume = 0;
    video.controls = false;
    video.srcObject = null;

    const videoCandidates = [
      { src: "./AR face filter AI video.mp4", key: "relative_primary" },
      { src: "AR face filter AI video.mp4", key: "relative_secondary" },
      { src: "/AR face filter AI video.mp4", key: "root_plain_fallback" },
      {
        src: "/AR%20face%20filter%20AI%20video.mp4",
        key: "root_encoded_fallback",
      },
    ];

    let sourceLoaded = false;
    let sourceKey = null;
    for (const candidate of videoCandidates) {
      try {
        sourceLoaded = await new Promise((resolve) => {
          let settled = false;
          const settle = (value) => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(value);
          };
          const cleanup = () => {
            clearTimeout(timeoutId);
            video.onloadedmetadata = null;
            video.onerror = null;
          };

          const timeoutId = setTimeout(
            () => settle(false),
            VIDEO_CANDIDATE_TIMEOUT_MS
          );

          video.onloadedmetadata = () => {
            settle(true);
          };

          video.onerror = () => {
            settle(false);
          };

          video.src = candidate.src;
          video.load();
        });

        if (sourceLoaded) {
          sourceKey = candidate.key;
          break;
        }
      } catch {
        sourceLoaded = false;
      }
    }

    if (!sourceLoaded) {
      video.style.display = "none";
      if (placeholder) placeholder.style.display = "flex";
      this.videoLoadFailed = true;
      this.videoLoaded = false;
      this.logger.markVideoLoadFailed();
      sendMessage(
        buildErrorEvent({
          createEvent: this.createEvent,
          condition: this.condition,
          code: "video_load_failed",
          stage: "video_load",
          message: "The shared AR face-filter preview video could not be loaded.",
          recoverable: true,
        })
      );
      this.updateDemoGatingState();
      return;
    }

    this.attachVideoListeners(video);
    this.videoLoaded = true;
    this.videoLoadFailed = false;
    video.currentTime = 0;
    this.logger.markVideoLoaded({
      sourceKey,
      durationMs:
        Number.isFinite(video.duration) && video.duration > 0
          ? video.duration * 1000
          : null,
    });

    video.style.transform = "scaleX(-1)";
    video.style.filter = "brightness(1.02) saturate(1.05) contrast(1.02)";

    if (placeholder) placeholder.style.display = "none";
    video.style.display = "block";

    try {
      await video.play();
      this.logger.markVideoStarted("autoplay");
    } catch {
      this.awaitingManualVideoStart = true;
      video.controls = true;
      this.logger.markAutoplayBlocked();
      this.addVideoResumeHandler(video);
    }

    this.updateDemoGatingState();
  }

  attachVideoListeners(video) {
    const onPlaying = () => {
      this.awaitingManualVideoStart = false;
      this.videoStarted = true;
      this.updateDemoGatingState();
    };

    const onTimeUpdate = () => {
      this.logger.updateVideoWatchMs(Math.round(video.currentTime * 1000));

      // Unlock after the participant has effectively viewed one full pass,
      // then keep looping the preview so the screen does not freeze.
      if (
        !this.videoEnded &&
        Number.isFinite(video.duration) &&
        video.duration > 0 &&
        video.currentTime >= Math.max(0, video.duration - 0.2)
      ) {
        this.videoEnded = true;
        this.lastCompletedStage = "video_first_pass_completed";
        this.logger.markVideoFirstPassCompleted(
          Math.round(video.duration * 1000)
        );
        this.updateDemoGatingState();
      }
    };

    const onPause = () => {
      this.logger.updateVideoWatchMs(Math.round(video.currentTime * 1000));
    };

    const onEnded = () => {
      if (this.videoEnded) return;
      this.videoEnded = true;
      this.lastCompletedStage = "video_first_pass_completed";
      this.logger.markVideoFirstPassCompleted(
        Math.round(video.currentTime * 1000)
      );
      this.updateDemoGatingState();
    };

    this.videoEventHandlers = { onPlaying, onTimeUpdate, onPause, onEnded };

    video.addEventListener("playing", onPlaying);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
  }

  detachVideoListeners(video) {
    if (!this.videoEventHandlers) return;

    const { onPlaying, onTimeUpdate, onPause, onEnded } = this.videoEventHandlers;
    video.removeEventListener("playing", onPlaying);
    video.removeEventListener("timeupdate", onTimeUpdate);
    video.removeEventListener("pause", onPause);
    video.removeEventListener("ended", onEnded);
    this.videoEventHandlers = null;
  }

  addVideoResumeHandler(video) {
    if (this.videoResumeHandler) return;

    this.videoResumeHandler = async () => {
      try {
        await video.play();
        this.logger.markVideoStarted("participant_tap");
        video.controls = false;
        this.removeVideoResumeHandler(video);
      } catch {}
    };

    video.addEventListener("click", this.videoResumeHandler);
  }

  removeVideoResumeHandler(video) {
    if (!this.videoResumeHandler) return;
    video.removeEventListener("click", this.videoResumeHandler);
    this.videoResumeHandler = null;
  }

  stopCamera() {
    const video = document.getElementById("demoCameraVideo");
    const placeholder = document.getElementById("demoPlaceholder");

    if (video instanceof HTMLVideoElement) {
      this.logger.updateVideoWatchMs(Math.round(video.currentTime * 1000));
      this.detachVideoListeners(video);
      this.removeVideoResumeHandler(video);

      try {
        video.pause();
      } catch {}

      video.removeAttribute("src");
      video.srcObject = null;
      video.currentTime = 0;
      video.style.display = "none";
      video.style.transform = "none";
      video.controls = false;
    }

    if (placeholder) {
      placeholder.style.display = "flex";
    }
  }

  cleanupPromptOverlay() {
    this.clearGate("promptGate");
    if (this.activePromptOverlay && this.activePromptOverlay.parentNode) {
      this.activePromptOverlay.parentNode.removeChild(this.activePromptOverlay);
    }
    this.activePromptOverlay = null;
    if (this.promptPreviousFocus instanceof HTMLElement) {
      this.promptPreviousFocus.focus({ preventScroll: true });
    }
    this.promptPreviousFocus = null;
  }

  startButtonGate(stateKey, { button, minMs, enabledText }) {
    this.clearGate(stateKey);

    const state = {
      button,
      minMs,
      enabledText,
      accumulatedMs: 0,
      visibleStartMs:
        document.visibilityState === "visible" ? performance.now() : null,
      intervalId: null,
      unlocked: false,
    };

    button.disabled = true;
    button.classList.add("btn-disabled");
    button.textContent = enabledText;

    state.intervalId = setInterval(() => {
      this.refreshButtonGate(stateKey);
    }, GATE_POLL_MS);

    this[stateKey] = state;
    this.refreshButtonGate(stateKey);
  }

  refreshButtonGate(stateKey) {
    const state = this[stateKey];
    if (!state || !state.button) return;

    const elapsed = this.getGateElapsedMs(state);
    const unlocked = elapsed >= state.minMs;

    if (unlocked) {
      state.unlocked = true;
      state.button.disabled = false;
      state.button.classList.remove("btn-disabled");
      state.button.textContent = state.enabledText;
      this.clearGate(stateKey);
      return;
    }

    state.button.disabled = true;
    state.button.classList.add("btn-disabled");
    state.button.textContent = state.enabledText;
  }

  clearGate(stateKey) {
    const state = this[stateKey];
    if (!state) return;

    if (state.intervalId) {
      clearInterval(state.intervalId);
    }

    this[stateKey] = null;
  }

  getGateElapsedMs(state) {
    const currentVisibleMs =
      state.visibleStartMs == null ? 0 : performance.now() - state.visibleStartMs;
    return state.accumulatedMs + currentVisibleMs;
  }

  syncGateVisibility(state) {
    if (!state || state.unlocked) return;

    if (document.visibilityState === "visible") {
      if (state.visibleStartMs == null) {
        state.visibleStartMs = performance.now();
      }
      return;
    }

    if (state.visibleStartMs != null) {
      state.accumulatedMs += performance.now() - state.visibleStartMs;
      state.visibleStartMs = null;
    }
  }

  handleVisibilityChange() {
    this.syncGateVisibility(this.introGate);
    this.syncGateVisibility(this.noticeGate);
    this.syncGateVisibility(this.permissionsGate);
    this.syncGateVisibility(this.promptGate);

    const isVisible = document.visibilityState === "visible";

    if (isVisible) this.logger.markPageVisible();
    else this.logger.markPageHidden();

    if (this.currentScreen === SCREENS.INTRO) {
      if (isVisible) this.logger.markIntroVisible();
      else this.logger.markIntroHidden();
    }

    if (this.currentScreen === SCREENS.NOTICE) {
      if (isVisible) this.logger.markNoticeVisible();
      else this.logger.markNoticeHidden();
    }

    if (this.currentScreen === SCREENS.PERMISSIONS) {
      if (isVisible) this.logger.markPermissionsVisible();
      else this.logger.markPermissionsHidden();
    }

    if (this.currentScreen === SCREENS.DEMO) {
      if (isVisible) {
        this.logger.startLagMonitor();
        this.logger.markDemoVisible();
        this.resumeVideoIfNeeded();
      } else {
        this.logger.stopLagMonitor();
        this.logger.markDemoHidden();
        this.pauseVideoForHiddenTab();
      }
    }

    if (this.currentScreen === SCREENS.EXIT) {
      if (isVisible) this.logger.markExitVisible();
      else this.logger.markExitHidden();
    }
  }

  pauseVideoForHiddenTab() {
    const video = document.getElementById("demoCameraVideo");
    if (!(video instanceof HTMLVideoElement)) return;
    if (!this.videoStarted || this.videoEnded) return;

    this.logger.markVideoHidden();
    this.logger.updateVideoWatchMs(Math.round(video.currentTime * 1000));

    try {
      video.pause();
    } catch {}
  }

  resumeVideoIfNeeded() {
    const video = document.getElementById("demoCameraVideo");
    if (!(video instanceof HTMLVideoElement)) return;

    this.logger.markVideoVisible();

    if (
      this.currentScreen !== SCREENS.DEMO ||
      this.videoEnded ||
      this.videoLoadFailed ||
      this.awaitingManualVideoStart ||
      !this.videoLoaded
    ) {
      return;
    }

    if (video.paused) {
      video.play().catch(() => {
        this.awaitingManualVideoStart = true;
        video.controls = true;
        this.addVideoResumeHandler(video);
        this.updateDemoGatingState();
      });
    }
  }

  onEnterExit() {
    this.logger.stopLagMonitor();
    this.logger.markVideoVisible();
    this.lastCompletedStage = "exit_reached";
  }

  finishAndSendData() {
    const completionSummary = buildCompletionSummary({
      condition: this.condition,
      conditionValid: this.condition_valid,
      lastCompletedStage: this.lastCompletedStage,
      loggerSummary: this.logger.getCompletionSummary({
        stimulusFlowCompleted: this.demoCompleted,
        lastCompletedStage: this.lastCompletedStage,
      }),
      safetyState: this.realDeviceAccess,
    });

    const completionEvent = buildCompletionEvent({
      createEvent: this.createEvent,
      condition: this.condition,
      conditionValid: this.condition_valid,
      summary: completionSummary,
    });

    return sendCompletionMessage(completionEvent);
  }
}
