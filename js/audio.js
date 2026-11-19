/**
 * ============================================================================
 * Wedding Music Controller (3-Tier Playback)
 * 1. Custom MP3 URL (WEDDING_CONFIG.music.audioUrl)
 * 2. Official YouTube IFrame Player API (WEDDING_CONFIG.music.youtubeId)
 * 3. Built-in warm Web Audio API acoustic synth fallback (Fmaj7 -> C -> D7 -> G)
 * ============================================================================
 */

class WeddingAudioPlayer {
  constructor(optionsOrUrl = "") {
    const opts =
      typeof optionsOrUrl === "string"
        ? { audioUrl: optionsOrUrl }
        : optionsOrUrl || {};

    this.audioUrl = opts.audioUrl || "";
    this.youtubeId = opts.youtubeId || "";
    this.onStatusChange = typeof opts.onStatusChange === "function" ? opts.onStatusChange : null;

    this.isPlaying = false;
    this.htmlAudio = null;
    this.htmlAudioFailed = false;
    this._playPromise = null;
    this._playSeq = 0;

    // YouTube IFrame state
    this.ytPlayer = null;
    this.ytReady = false;
    this.ytPlaying = false;
    this.ytFailed = false;
    this.ytFallbackTimer = null;

    // Web Audio API synth fallback state
    this.ctx = null;
    this.schedulerId = null;
    this.stepIndex = 0;
    this.synthDuration = Number(opts.durationSeconds) > 0 ? Number(opts.durationSeconds) : 233;
    this.synthElapsed = 0;

    if (this.audioUrl) {
      this.htmlAudio = new Audio(this.audioUrl);
      this.htmlAudio.loop = true;
      this.htmlAudio.preload = "auto";
      this.htmlAudio.volume = 0.65;
      this.htmlAudio.setAttribute("playsinline", "");
      this.htmlAudio.addEventListener("loadedmetadata", () => this.notifyStatus());
      this.htmlAudio.addEventListener("play", () => {
        if (!this.isPlaying) {
          this.isPlaying = true;
          this.stopSynth();
          this.notifyStatus();
        }
      });
      this.htmlAudio.addEventListener("playing", () => {
        this.isPlaying = true;
        this.stopSynth();
        this.notifyStatus();
      });
      this.htmlAudio.addEventListener("pause", () => {
        if (!this.htmlAudio.ended && !this.schedulerId && this.isPlaying) {
          this.isPlaying = false;
          this.notifyStatus();
        }
      });
      this.htmlAudio.addEventListener("ended", () => {
        if (this.isPlaying && this.htmlAudio.loop) {
          this.htmlAudio.currentTime = 0;
          this.htmlAudio.play().catch(() => {});
        }
      });
      this.htmlAudio.addEventListener("timeupdate", () => {
        if (this.isPlaying) this.notifyStatus();
      });
      this.htmlAudio.addEventListener("error", () => {
        this.htmlAudioFailed = true;
        if (this.isPlaying && !this.schedulerId) {
          this.startSynth();
          this.notifyStatus();
        }
      });
    } else if (
      this.youtubeId &&
      typeof window !== "undefined" &&
      String(window.location?.protocol || "").startsWith("http")
    ) {
      this.initYouTubePlayer();
    }

    // Romantic chorus chord progression tuned for "Lo Thuong Nhau" (Fmaj7 - C - D7 - G - E7 - Am)
    this.progression = [
      // Fmaj7 (F - A - C - E)
      [174.61, 220.0, 261.63, 329.63, 440.0, 329.63, 261.63, 220.0],
      // C (C - E - G - C)
      [130.81, 261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 261.63],
      // D7 (D - F# - A - C)
      [146.83, 220.0, 293.66, 369.99, 440.0, 369.99, 293.66, 220.0],
      // G (G - B - D - G)
      [196.0, 246.94, 293.66, 392.0, 493.88, 392.0, 293.66, 246.94],
      // Em7 / E7 color
      [164.81, 246.94, 329.63, 415.3, 493.88, 415.3, 329.63, 246.94],
      // Am7
      [220.0, 261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 261.63],
      // Dm7
      [146.83, 261.63, 349.23, 440.0, 523.25, 440.0, 349.23, 261.63],
      // G7 -> C resolve
      [196.0, 293.66, 349.23, 392.0, 523.25, 440.0, 392.0, 293.66]
    ];

    this.melodyOverlay = [
      440.0, null, 523.25, null, 440.0, 392.0, 349.23, null,
      392.0, null, 440.0, null, 523.25, null, 392.0, null,
      440.0, null, 523.25, null, 587.33, null, 523.25, 440.0,
      392.0, null, 440.0, null, 349.23, null, 329.63, null
    ];
  }

  notifyStatus() {
    if (this.onStatusChange) {
      this.onStatusChange();
    }
  }

  initYouTubePlayer() {
    if (typeof document === "undefined") return;

    let mount = document.getElementById("yt-wedding-player");
    if (!mount) {
      mount = document.createElement("div");
      mount.id = "yt-wedding-player";
      mount.setAttribute("aria-hidden", "true");
      mount.style.cssText =
        "position:fixed;left:-9999px;bottom:0;width:200px;height:200px;opacity:0.001;pointer-events:none;z-index:-1;";
      document.body.appendChild(mount);
    }

    const createPlayer = () => {
      if (this.ytPlayer || this.ytFailed || !window.YT?.Player) return;
      try {
        const playerVars = {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          loop: 1,
          modestbranding: 1,
          playlist: this.youtubeId,
          playsinline: 1,
          rel: 0
        };
        if (window.location?.origin?.startsWith("http")) {
          playerVars.origin = window.location.origin;
        }

        this.ytPlayer = new window.YT.Player("yt-wedding-player", {
          height: "200",
          width: "200",
          videoId: this.youtubeId,
          playerVars,
          events: {
            onReady: () => {
              this.ytReady = true;
              this.notifyStatus();
              if (this.isPlaying && !this.ytFailed) {
                try {
                  this.ytPlayer.unMute?.();
                  this.ytPlayer.setVolume?.(75);
                  this.ytPlayer.playVideo?.();
                } catch (err) {
                  this.ytFailed = true;
                }
              }
            },
            onStateChange: (event) => {
              const YTState = window.YT?.PlayerState || {};
              if (event.data === YTState.PLAYING) {
                clearTimeout(this.ytFallbackTimer);
                this.ytPlaying = true;
                this.stopSynth();
                this.isPlaying = true;
                this.notifyStatus();
              } else if (event.data === YTState.PAUSED) {
                this.ytPlaying = false;
                if (!this.schedulerId && this.isPlaying) {
                  this.isPlaying = false;
                  this.notifyStatus();
                }
              } else if (event.data === YTState.ENDED) {
                if (this.isPlaying) {
                  this.ytPlayer.seekTo?.(0, true);
                  this.ytPlayer.playVideo?.();
                }
              }
            },
            onError: () => {
              clearTimeout(this.ytFallbackTimer);
              this.ytFailed = true;
              this.ytPlaying = false;
              if (this.isPlaying && !this.schedulerId) {
                this.startSynth();
                this.notifyStatus();
              }
            }
          }
        });
      } catch (err) {
        this.ytFailed = true;
      }
    };

    if (window.YT?.Player) {
      createPlayer();
      return;
    }

    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevReady === "function") prevReady();
      createPlayer();
    };

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      tag.onerror = () => {
        this.ytFailed = true;
      };
      document.head.appendChild(tag);
    }
  }

  playNote(freq, duration = 1.6, gainPeak = 0.045) {
    if (!this.ctx || !freq) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const oscHarmonic = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);

    oscHarmonic.type = "triangle";
    oscHarmonic.frequency.setValueAtTime(freq * 2, now);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1400, now);

    const harmonicGain = this.ctx.createGain();
    harmonicGain.gain.setValueAtTime(0.18, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

    osc.connect(filter);
    oscHarmonic.connect(harmonicGain);
    harmonicGain.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    oscHarmonic.start(now);
    osc.stop(now + duration + 0.05);
    oscHarmonic.stop(now + duration + 0.05);
  }

  startSynth() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    if (this.schedulerId) clearInterval(this.schedulerId);

    const tick = () => {
      if (!this.isPlaying) return;
      const bar = Math.floor(this.stepIndex / 8) % this.progression.length;
      const beat = this.stepIndex % 8;
      const arpFreq = this.progression[bar][beat];
      this.playNote(arpFreq, 1.85, beat === 0 ? 0.055 : 0.034);

      const melFreq = this.melodyOverlay[this.stepIndex % this.melodyOverlay.length];
      if (melFreq) {
        this.playNote(melFreq, 2.1, 0.028);
      }
      this.stepIndex++;
      this.synthElapsed = (this.synthElapsed + 0.45) % this.synthDuration;
    };

    tick();
    this.schedulerId = setInterval(tick, 450);
  }

  stopSynth() {
    if (this.schedulerId) {
      clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
  }

  async play() {
    if (this.isPlaying) return true;
    if (this._playPromise) return this._playPromise;

    const seq = ++this._playSeq;

    const run = async () => {
      if (this.htmlAudio && !this.htmlAudioFailed) {
        try {
          this.htmlAudio.muted = false;
          await this.htmlAudio.play();
          if (seq !== this._playSeq) {
            this.htmlAudio.pause();
            return false;
          }
          this.isPlaying = true;
          this.stopSynth();
          this.notifyStatus();
          return true;
        } catch (e) {
          const msg = String(e?.message || "");
          const blocked =
            e?.name === "NotAllowedError" ||
            /not allowed|user didn't interact|gesture/i.test(msg);
          const aborted = e?.name === "AbortError" || seq !== this._playSeq;
          if (blocked || aborted) {
            this.isPlaying = false;
            this.notifyStatus();
            return false;
          }
          this.htmlAudioFailed = true;
        }
      }

      if (this.youtubeId && !this.ytFailed) {
        this.isPlaying = true;
        if (this.ytReady && this.ytPlayer) {
          try {
            this.ytPlayer.unMute?.();
            this.ytPlayer.setVolume?.(75);
            this.ytPlayer.playVideo?.();
          } catch (err) {
            this.ytFailed = true;
            this.startSynth();
            this.notifyStatus();
            return true;
          }
        }

        clearTimeout(this.ytFallbackTimer);
        this.ytFallbackTimer = setTimeout(() => {
          if (this.isPlaying && !this.ytPlaying && !this.schedulerId) {
            this.startSynth();
            this.notifyStatus();
          }
        }, 1800);
        this.notifyStatus();
        return true;
      }

      this.isPlaying = true;
      this.startSynth();
      this.notifyStatus();
      return true;
    };

    this._playPromise = run().finally(() => {
      this._playPromise = null;
    });
    return this._playPromise;
  }

  pause() {
    this._playSeq++;
    this.isPlaying = false;
    this.ytPlaying = false;
    clearTimeout(this.ytFallbackTimer);

    if (this.htmlAudio) {
      this.htmlAudio.pause();
    }
    if (this.ytReady && this.ytPlayer) {
      try {
        this.ytPlayer.pauseVideo?.();
      } catch (err) {
        // ignore YouTube cleanup failure
      }
    }
    this.stopSynth();
    this.notifyStatus();
  }

  async toggle() {
    if (this.isPlaying) {
      this.pause();
    } else {
      await this.play();
    }
    return this.isPlaying;
  }

  restart() {
    this.stepIndex = 0;
    this.synthElapsed = 0;
    if (this.htmlAudio) {
      this.htmlAudio.currentTime = 0;
    }
    if (this.ytReady && !this.ytFailed && this.ytPlayer) {
      try {
        this.ytPlayer.seekTo?.(0, true);
      } catch (err) {
        // ignore
      }
    }
  }

  skip(deltaSeconds = 15) {
    if (this.htmlAudio && !this.htmlAudioFailed && this.htmlAudio.duration) {
      this.htmlAudio.currentTime = Math.max(
        0,
        Math.min(this.htmlAudio.duration, this.htmlAudio.currentTime + deltaSeconds)
      );
      return;
    }
    if (this.ytReady && !this.ytFailed && this.ytPlayer && typeof this.ytPlayer.getCurrentTime === "function") {
      try {
        const cur = Number(this.ytPlayer.getCurrentTime()) || 0;
        const dur = Number(this.ytPlayer.getDuration()) || this.synthDuration;
        const next = Math.max(0, Math.min(dur, cur + deltaSeconds));
        this.ytPlayer.seekTo?.(next, true);
        return;
      } catch (err) {
        // fall through to synth offset
      }
    }
    this.synthElapsed =
      (this.synthElapsed + deltaSeconds + this.synthDuration) % this.synthDuration;
    this.stepIndex = Math.max(0, this.stepIndex + (deltaSeconds > 0 ? 4 : -4));
  }

  seekRatio(ratio = 0) {
    const clamped = Math.max(0, Math.min(1, Number(ratio) || 0));
    if (this.htmlAudio && !this.htmlAudioFailed && this.htmlAudio.duration) {
      this.htmlAudio.currentTime = clamped * this.htmlAudio.duration;
      return;
    }
    if (this.ytReady && !this.ytFailed && this.ytPlayer && typeof this.ytPlayer.getDuration === "function") {
      try {
        const dur = Number(this.ytPlayer.getDuration()) || this.synthDuration;
        this.ytPlayer.seekTo?.(clamped * dur, true);
        return;
      } catch (err) {
        // fall back
      }
    }
    this.synthElapsed = clamped * this.synthDuration;
  }

  getProgress() {
    if (this.htmlAudio && !this.htmlAudioFailed && this.htmlAudio.duration && !Number.isNaN(this.htmlAudio.duration)) {
      return {
        current: this.htmlAudio.currentTime,
        duration: this.htmlAudio.duration,
        ratio: this.htmlAudio.currentTime / this.htmlAudio.duration
      };
    }
    if (this.ytReady && !this.ytFailed && this.ytPlayer && typeof this.ytPlayer.getDuration === "function") {
      try {
        const dur = Number(this.ytPlayer.getDuration()) || 0;
        const cur = Number(this.ytPlayer.getCurrentTime()) || 0;
        if (dur > 0) {
          return {
            current: cur,
            duration: dur,
            ratio: cur / dur
          };
        }
      } catch (err) {
        // fall back to synth progress
      }
    }
    return {
      current: this.synthElapsed,
      duration: this.synthDuration,
      ratio: this.synthElapsed / this.synthDuration
    };
  }
}

window.WeddingAudioPlayer = WeddingAudioPlayer;
