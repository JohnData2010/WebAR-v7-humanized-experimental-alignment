export class Logger {
  constructor() {
    this.startMs = performance.now();

    this.hiddenStartMs = null;
    this.hiddenAccumulatedMs = 0;
    this.hiddenCount = 0;

    this.introVisibleStartMs = null;
    this.introAccumulatedMs = 0;

    this.noticeVisibleStartMs = null;
    this.noticeAccumulatedMs = 0;

    this.permissionsVisibleStartMs = null;
    this.permissionsAccumulatedMs = 0;

    this.demoVisibleStartMs = null;
    this.demoAccumulatedMs = 0;

    this.exitVisibleStartMs = null;
    this.exitAccumulatedMs = 0;

    this.interactionCount = 0;
    this.demoInteractionCount = 0;

    this.demoEntered = false;
    this.permissionContinueClicked = false;

    this.promptShownCount = 0;
    this.promptAllowClickCount = 0;
    this.promptSequenceCompleted = false;
    this.promptOrderCompleted = [];
    this.cameraPromptCompleted = false;
    this.microphonePromptCompleted = false;
    this.photoLibraryPromptCompleted = false;

    this.videoLoaded = false;
    this.videoStarted = false;
    this.videoFirstPassCompleted = false;
    this.videoWatchMs = 0;
    this.videoLoadFailed = false;
    this.videoSourceKey = null;
    this.videoDurationMs = null;
    this.autoplayBlocked = false;
    this.playbackStartMethod = "not_started";
    this.videoHiddenCount = 0;
    this.videoHiddenStartMs = null;
    this.videoHiddenAccumulatedMs = 0;

    this._rafId = null;
    this._lastFrameMs = null;
    this._longFrameCount = 0;
  }

  markPageHidden() {
    if (this.hiddenStartMs != null) return;
    this.hiddenCount += 1;
    this.hiddenStartMs = performance.now();
  }

  markPageVisible() {
    if (this.hiddenStartMs == null) return;
    this.hiddenAccumulatedMs += performance.now() - this.hiddenStartMs;
    this.hiddenStartMs = null;
  }

  markIntroVisible() {
    if (this.introVisibleStartMs == null) {
      this.introVisibleStartMs = performance.now();
    }
  }

  markIntroHidden() {
    if (this.introVisibleStartMs != null) {
      this.introAccumulatedMs += performance.now() - this.introVisibleStartMs;
      this.introVisibleStartMs = null;
    }
  }

  markNoticeVisible() {
    if (this.noticeVisibleStartMs == null) {
      this.noticeVisibleStartMs = performance.now();
    }
  }

  markNoticeHidden() {
    if (this.noticeVisibleStartMs != null) {
      this.noticeAccumulatedMs += performance.now() - this.noticeVisibleStartMs;
      this.noticeVisibleStartMs = null;
    }
  }

  markPermissionsVisible() {
    if (this.permissionsVisibleStartMs == null) {
      this.permissionsVisibleStartMs = performance.now();
    }
  }

  markPermissionsHidden() {
    if (this.permissionsVisibleStartMs != null) {
      this.permissionsAccumulatedMs +=
        performance.now() - this.permissionsVisibleStartMs;
      this.permissionsVisibleStartMs = null;
    }
  }

  markDemoVisible() {
    if (this.demoVisibleStartMs == null) {
      this.demoVisibleStartMs = performance.now();
    }
  }

  markDemoHidden() {
    if (this.demoVisibleStartMs != null) {
      this.demoAccumulatedMs += performance.now() - this.demoVisibleStartMs;
      this.demoVisibleStartMs = null;
    }
  }

  markExitVisible() {
    if (this.exitVisibleStartMs == null) {
      this.exitVisibleStartMs = performance.now();
    }
  }

  markExitHidden() {
    if (this.exitVisibleStartMs != null) {
      this.exitAccumulatedMs += performance.now() - this.exitVisibleStartMs;
      this.exitVisibleStartMs = null;
    }
  }

  markDemoEntered() {
    this.demoEntered = true;
  }

  markPermissionContinueClicked() {
    this.permissionContinueClicked = true;
  }

  markSimulatedPromptShown() {
    this.promptShownCount += 1;
  }

  markSimulatedAllowClicked() {
    this.promptAllowClickCount += 1;
  }

  markPromptCompleted(kind) {
    this.promptOrderCompleted.push(String(kind));

    if (kind === "camera") this.cameraPromptCompleted = true;
    if (kind === "microphone") this.microphonePromptCompleted = true;
    if (kind === "photos") this.photoLibraryPromptCompleted = true;
  }

  markSimulatedPromptSequenceCompleted() {
    this.promptSequenceCompleted = true;
  }

  markVideoLoaded({ sourceKey = null, durationMs = null } = {}) {
    this.videoLoaded = true;
    this.videoSourceKey = sourceKey;
    this.videoDurationMs = Number.isFinite(durationMs)
      ? Math.round(durationMs)
      : null;
  }

  markVideoStarted(method = "autoplay") {
    this.videoStarted = true;
    if (this.playbackStartMethod === "not_started") {
      this.playbackStartMethod = method;
    }
  }

  markAutoplayBlocked() {
    this.autoplayBlocked = true;
  }

  updateVideoWatchMs(ms) {
    if (!Number.isFinite(ms)) return;
    this.videoWatchMs = Math.max(this.videoWatchMs, Math.round(ms));
  }

  markVideoFirstPassCompleted(ms = null) {
    this.videoFirstPassCompleted = true;
    if (ms != null) this.updateVideoWatchMs(ms);
  }

  markVideoLoadFailed() {
    this.videoLoadFailed = true;
  }

  markVideoHidden() {
    if (this.videoHiddenStartMs != null) return;
    this.videoHiddenCount += 1;
    this.videoHiddenStartMs = performance.now();
  }

  markVideoVisible() {
    if (this.videoHiddenStartMs == null) return;
    this.videoHiddenAccumulatedMs += performance.now() - this.videoHiddenStartMs;
    this.videoHiddenStartMs = null;
  }

  addInteraction(opts = {}) {
    this.interactionCount += 1;
    if (opts && opts.demo) this.demoInteractionCount += 1;
  }

  startLagMonitor() {
    if (this._rafId) return;

    this._lastFrameMs = performance.now();
    const tick = () => {
      const now = performance.now();
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        this._lastFrameMs = now;
        this._rafId = requestAnimationFrame(tick);
        return;
      }
      const delta = now - (this._lastFrameMs || now);
      this._lastFrameMs = now;

      if (delta > 200) this._longFrameCount += 1;

      this._rafId = requestAnimationFrame(tick);
    };

    this._rafId = requestAnimationFrame(tick);
  }

  stopLagMonitor() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._lastFrameMs = null;
  }

  getCompletionSummary({
    stimulusFlowCompleted = false,
    lastCompletedStage = "questionnaire_notified",
  } = {}) {
    const now = performance.now();

    const introMs =
      this.introAccumulatedMs +
      (this.introVisibleStartMs ? now - this.introVisibleStartMs : 0);
    const noticeMs =
      this.noticeAccumulatedMs +
      (this.noticeVisibleStartMs ? now - this.noticeVisibleStartMs : 0);
    const permissionsMs =
      this.permissionsAccumulatedMs +
      (this.permissionsVisibleStartMs
        ? now - this.permissionsVisibleStartMs
        : 0);
    const demoMs =
      this.demoAccumulatedMs +
      (this.demoVisibleStartMs ? now - this.demoVisibleStartMs : 0);
    const exitMs =
      this.exitAccumulatedMs +
      (this.exitVisibleStartMs ? now - this.exitVisibleStartMs : 0);
    const hiddenMs =
      this.hiddenAccumulatedMs +
      (this.hiddenStartMs ? now - this.hiddenStartMs : 0);
    const videoHiddenMs =
      this.videoHiddenAccumulatedMs +
      (this.videoHiddenStartMs ? now - this.videoHiddenStartMs : 0);

    const totalVisibleMs =
      introMs + noticeMs + permissionsMs + demoMs + exitMs;

    const deviceClass = this._getDeviceClass();
    const viewportWidthPx =
      typeof window !== "undefined" ? Math.round(window.innerWidth) : null;
    const viewportHeightPx =
      typeof window !== "undefined" ? Math.round(window.innerHeight) : null;

    return {
      stimulus_flow_completed: Boolean(stimulusFlowCompleted),
      last_completed_stage: String(lastCompletedStage),

      intro_dwell_ms: Math.round(introMs),
      notice_dwell_ms: Math.round(noticeMs),
      permission_summary_dwell_ms: Math.round(permissionsMs),
      preview_dwell_ms: Math.round(demoMs),
      exit_dwell_ms: Math.round(exitMs),
      total_visible_stimulus_ms: Math.round(totalVisibleMs),
      total_wall_clock_ms: Math.round(now - this.startMs),
      hidden_count: this.hiddenCount,
      hidden_ms: Math.round(hiddenMs),

      interaction_count: this.interactionCount,
      demo_interaction_count: this.demoInteractionCount,
      demo_entered: this.demoEntered,
      permission_continue_clicked: this.permissionContinueClicked,

      prompt_shown_count: this.promptShownCount,
      prompt_allow_click_count: this.promptAllowClickCount,
      prompt_sequence_completed: this.promptSequenceCompleted,
      prompt_order_completed: this.promptOrderCompleted.slice(),
      camera_prompt_completed: this.cameraPromptCompleted,
      microphone_prompt_completed: this.microphonePromptCompleted,
      photo_library_prompt_completed: this.photoLibraryPromptCompleted,

      video_source_key: this.videoSourceKey,
      video_duration_ms: this.videoDurationMs,
      video_loaded: this.videoLoaded,
      video_started: this.videoStarted,
      video_first_pass_completed: this.videoFirstPassCompleted,
      video_watch_ms: this.videoWatchMs,
      video_load_failed: this.videoLoadFailed,
      autoplay_blocked: this.autoplayBlocked,
      playback_start_method: this.playbackStartMethod,
      video_hidden_count: this.videoHiddenCount,
      video_hidden_ms: Math.round(videoHiddenMs),

      device_class: deviceClass,
      viewport_width_px: viewportWidthPx,
      viewport_height_px: viewportHeightPx,
      lag_flag: this._longFrameCount >= 3,
      long_frame_count: this._longFrameCount,
    };
  }

  _getDeviceClass() {
    const ua = (navigator.userAgent || "").toLowerCase();
    const touchPoints = Number(navigator.maxTouchPoints || 0);
    const isTablet =
      /ipad/.test(ua) || (/macintosh/.test(ua) && touchPoints > 1);
    const isMobile =
      /mobi|android|iphone|ipod/.test(ua) ||
      touchPoints > 1;

    if (isTablet) return "tablet";
    return isMobile ? "mobile" : "desktop";
  }
}
