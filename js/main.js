/**
 * ============================================================================
 * THIỆP CƯỚI ONLINE — LÊ HOÀNG PHÚC & NGUYỄN THỊ TƯỜNG VY
 * Main interaction controller
 * ============================================================================
 */

document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_WISHES_KEY = "wedding_wishes_phuc_vy_v3";
  const STORAGE_RSVP_KEY = "wedding_rsvp_phuc_vy_v3";

  const baseConfig = window.WEDDING_CONFIG || {};
  const cfg = deepClone(baseConfig);

  /* ------------------------------------------------------------------------
     1. UTILITIES
     ------------------------------------------------------------------------ */
  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  let toastTimer = null;
  function showToast(msg) {
    const el = document.getElementById("toast-notice");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
  }

  function copyText(text, successMsg) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(text)
        .then(() => showToast(successMsg))
        .catch(() => fallbackCopy(text, successMsg));
    } else {
      fallbackCopy(text, successMsg);
    }
  }

  function fallbackCopy(text, successMsg) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast(successMsg);
    } catch {
      showToast("Số tài khoản: " + text);
    }
    document.body.removeChild(ta);
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el && value !== undefined && value !== null) el.textContent = value;
  }

  const CACHE_VER = "20261119a12";
  const RESPONSIVE_ASSETS = new Set([
    "assets/images/hero-anhnen.jpg",
    "assets/images/hero-thumb.jpg",
    "assets/images/story-anh1.jpg",
    "assets/images/groom-anh2.jpg",
    "assets/images/bride-anh3.jpg",
    "assets/images/welcome-anh4.jpg",
    "assets/images/calendar-anh5.jpg",
    "assets/images/bride-anh3-avatar.jpg",
    "assets/images/groom-anh2-avatar.jpg",
    "assets/images/album-wide-1.jpg",
    "assets/images/album-p1.jpg",
    "assets/images/album-p2.jpg",
    "assets/images/album-wide-2.jpg",
    "assets/images/qr-girl.png",
    "assets/images/qr-man.png"
  ]);

  function toHdPath(path) {
    return String(path).replace(/(\.[a-z0-9]+)$/i, "-hd$1");
  }

  function applyResponsiveImg(imgEl, rawPath) {
    if (!imgEl || !rawPath) return;
    if (RESPONSIVE_ASSETS.has(rawPath)) {
      const src1x = `${rawPath}?v=${CACHE_VER}`;
      const src2x = `${toHdPath(rawPath)}?v=${CACHE_VER}`;
      imgEl.src = src1x;
      imgEl.srcset = `${src1x} 1x, ${src2x} 2x`;
      imgEl.removeAttribute("sizes");
    } else {
      imgEl.removeAttribute("srcset");
      imgEl.removeAttribute("sizes");
      imgEl.src = rawPath;
    }
  }

  function buildResponsiveImgAttrs(rawPath) {
    if (!rawPath) return "";
    if (RESPONSIVE_ASSETS.has(rawPath)) {
      const src1x = escapeHTML(`${rawPath}?v=${CACHE_VER}`);
      const src2x = escapeHTML(`${toHdPath(rawPath)}?v=${CACHE_VER}`);
      return `src="${src1x}" srcset="${src1x} 1x, ${src2x} 2x"`;
    }
    return `src="${escapeHTML(rawPath)}"`;
  }

  function setAttr(id, attr, value) {
    const el = document.getElementById(id);
    if (el && value !== undefined && value !== null) el.setAttribute(attr, value);
  }

  /* ------------------------------------------------------------------------
     2. HYDRATE PAGE FROM CONFIG
     ------------------------------------------------------------------------ */
  document.addEventListener(
    "error",
    (e) => {
      const target = e.target;
      if (target && target.tagName === "IMG" && target.dataset.fallback) {
        const box = document.createElement("span");
        box.innerHTML = target.dataset.fallback;
        if (box.firstElementChild) target.replaceWith(box.firstElementChild);
      }
    },
    true
  );

  function buildQRHtml(gift) {
    const payload = `BANK:${gift.bankId}|ACC:${gift.accountNumber}|NAME:${gift.ownerUpper}`;
    const svg = window.WeddingQR
      ? window.WeddingQR.createSVG(payload, { color: "#1c1917", bg: "#ffffff" })
      : "";

    const fallbackUrl =
      gift.useLiveVietQR && gift.bankId && gift.accountNumber
        ? `https://img.vietqr.io/image/${encodeURIComponent(gift.bankId)}-${encodeURIComponent(
            gift.accountNumber
          )}-qr_only.png?accountName=${encodeURIComponent(gift.ownerUpper)}&amount=0`
        : "";
    const src = gift.qrImage || fallbackUrl;
    if (src) {
      return `<img ${buildResponsiveImgAttrs(src)} alt="QR ${escapeHTML(gift.ownerUpper)}" loading="lazy" data-fallback="${escapeHTML(svg)}">`;
    }
    return svg;
  }

  function renderCalendar() {
    const grid = document.getElementById("wedding-calendar-grid");
    const monthLabel = document.getElementById("calendar-month-label");
    if (!grid) return;

    const d = new Date(cfg.weddingDateISO);
    const validDate = Number.isNaN(d.getTime()) ? new Date("2026-11-29T11:00:00+07:00") : d;
    const year = validDate.getFullYear();
    const month = validDate.getMonth(); // 0-indexed
    const targetDay = validDate.getDate();

    if (monthLabel) {
      monthLabel.textContent = `THÁNG ${month + 1} · ${year}`;
    }

    // Convert JS getDay() (0=Sun..6=Sat) to Monday-first index (0=Mon..6=Sun)
    const firstDayJS = new Date(year, month, 1).getDay();
    const firstCol = (firstDayJS + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstCol; i++) {
      cells.push(`<span class="cal-day"></span>`);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      if (day === targetDay) {
        cells.push(`
          <span class="cal-day is-wedding-day" aria-label="Ngày cưới ${day}">
            <span class="cal-heart-badge" aria-hidden="true">
              <svg viewBox="0 0 36 34" width="32" height="30" fill="none">
                <path d="M18 31 C8 24, 3 17, 4 10 C5 5, 10 3, 14 5 C16.5 6.3, 18 9, 18 9 C18 9, 19.5 6.3, 22 5 C26 3, 31 5, 32 10 C33 17, 28 24, 18 31 Z" fill="rgba(216, 131, 134, 0.25)" stroke="#9e1b24" stroke-width="1.6"/>
              </svg>
            </span>
            <span class="cal-day-num">${day}</span>
          </span>
        `);
      } else {
        cells.push(`<span class="cal-day"><span class="cal-day-num">${day}</span></span>`);
      }
    }
    grid.innerHTML = cells.join("");
  }

  function renderGifts() {
    const inlineWrap = document.getElementById("gift-cards-inline");
    const modalWrap = document.getElementById("gift-cards-modal");
    const gifts = Array.isArray(cfg.gifts) ? cfg.gifts : [];

    if (inlineWrap) {
      inlineWrap.innerHTML = gifts
        .map((g, idx) => {
          const reversed = idx % 2 === 1 ? "is-reversed" : "";
          const slideDir = idx % 2 === 0 ? "slide-right" : "slide-left";
          return `
          <div class="gift-row ${reversed}" data-anim="${slideDir}" data-delay="${(0.08 + idx * 0.16).toFixed(2)}">
            <div class="gift-avatar-ring">
              <img ${buildResponsiveImgAttrs(g.avatar)} alt="${escapeHTML(g.roleLabel)}">
            </div>
            <div class="gift-bank-card">
              <div class="gift-bank-meta">
                <p class="gift-role">${escapeHTML(g.roleLabel)}</p>
                <p class="gift-owner">${escapeHTML(g.ownerUpper)}</p>
                <p class="gift-account-line">${escapeHTML(g.bankName)} : ${escapeHTML(g.accountNumber)}</p>
                <button type="button" class="gift-copy-chip" data-copy-stk="${escapeHTML(g.accountNumber)}">Sao chép STK</button>
              </div>
              <div class="gift-qr-box">${buildQRHtml(g)}</div>
            </div>
          </div>
        `;
        })
        .join("");
    }

    if (modalWrap) {
      modalWrap.innerHTML = gifts
        .map(
          (g) => `
        <div class="gift-modal-card">
          <div>
            <p class="gift-role" style="text-align:left">${escapeHTML(g.roleLabel)}</p>
            <p class="gift-owner" style="text-align:left">${escapeHTML(g.ownerUpper)}</p>
            <p class="gift-account-line" style="text-align:left">${escapeHTML(g.bankName)} : <strong>${escapeHTML(g.accountNumber)}</strong></p>
            <button type="button" class="gift-copy-chip" data-copy-stk="${escapeHTML(g.accountNumber)}">Sao chép STK</button>
          </div>
          <div class="gift-modal-qr">${buildQRHtml(g)}</div>
        </div>
      `
        )
        .join("");
    }
  }

  function renderGallery() {
    const grid = document.getElementById("album-collage-grid");
    if (!grid || !Array.isArray(cfg.gallery)) return;

    grid.innerHTML = cfg.gallery
      .map((item, idx) => {
        const layoutClass =
          item.layout === "wide" ? "is-wide" : item.layout === "right" ? "is-right" : "is-left";
        const overlayWord =
          idx === 0
            ? `<span class="album-overlay-word album-word-top">Love</span>`
            : idx === 1
            ? `<span class="album-overlay-word album-word-bottom">You</span>`
            : "";

        const animType =
          idx === 0 ? "fade-in" : item.layout === "right" ? "slide-left" : "slide-right";

        return `
        <figure class="album-tile ${layoutClass}" data-gallery-idx="${idx}" data-anim="${animType}" data-delay="${(Math.min(idx, 5) * 0.08).toFixed(2)}">
          ${overlayWord}
          <img ${buildResponsiveImgAttrs(item.src)} alt="${escapeHTML(item.caption || "Ảnh cưới")}" loading="lazy">
        </figure>
      `;
      })
      .join("");
  }

  function renderFriendlyNotes() {
    setText("friendly-title", cfg.friendlyTitle);
    const list = document.getElementById("friendly-notes-list");
    if (!list || !Array.isArray(cfg.friendlyNotes)) return;

    list.innerHTML = cfg.friendlyNotes
      .map(
        (text, idx) => `
      <li data-anim="slide-up" data-delay="${(idx * 0.07).toFixed(2)}">
        <span class="friendly-heart-bullet" aria-hidden="true">♥</span>
        <span>${escapeHTML(text)}</span>
      </li>
    `
      )
      .join("");
  }

  let refreshScrollAnimations = null;

  function hydratePage() {
    const pairDisplay =
      cfg.heroTitleOrder === "groom-first"
        ? `${cfg.groom.shortName} & ${cfg.bride.shortName}`
        : `${cfg.bride.shortName} & ${cfg.groom.shortName}`;

    document.title = `Thiệp Cưới Online — ${cfg.groom.fullName} & ${cfg.bride.fullName}`;
    setText("side-watermark", cfg.watermarkText);

    // Hero
    const locTag = document.getElementById("hero-location-tag");
    if (locTag) locTag.textContent = cfg.locationBadge || "";
    setText("hero-date-line", cfg.heroDateDisplay);
    setText("hero-invitation-label", cfg.heroSubtitle);
    setText("hero-couple-names", pairDisplay);
    const heroImgEl = document.getElementById("hero-photo");
    applyResponsiveImg(heroImgEl, cfg.heroPhoto);
    const smallHeroThumb =
      cfg.heroPhoto === "assets/images/hero-anhnen.jpg" ? "assets/images/hero-thumb.jpg" : cfg.heroPhoto;
    applyResponsiveImg(document.getElementById("tb-avatar-img"), smallHeroThumb);

    // Story
    setText("story-heading", cfg.storyHeading);
    setText("story-p1", cfg.storyParagraphs?.[0] || "");
    setText("story-p2", cfg.storyParagraphs?.[1] || "");
    applyResponsiveImg(document.getElementById("story-photo"), cfg.storyPhoto);

    // Family
    setText("groom-father", cfg.groom.parents?.father);
    setText("groom-mother", cfg.groom.parents?.mother);
    setText("groom-hometown", cfg.groom.parents?.hometown);
    setText("groom-role", cfg.groom.titleRole);
    setText("groom-short", cfg.groom.shortName);
    applyResponsiveImg(document.getElementById("groom-photo"), cfg.groom.photo);

    setText("bride-father", cfg.bride.parents?.father);
    setText("bride-mother", cfg.bride.parents?.mother);
    setText("bride-hometown", cfg.bride.parents?.hometown);
    setText("bride-role", cfg.bride.titleRole);
    setText("bride-short", cfg.bride.shortName);
    applyResponsiveImg(document.getElementById("bride-photo"), cfg.bride.photo);

    setText("diag-groom", cfg.groom.shortName);
    setText("diag-bride", cfg.bride.shortName);

    // Ceremonies
    const c1 = cfg.ceremonies?.ceremony1 || {};
    setText("c1-title", c1.title);
    setText("c1-time", c1.timeText);
    setText("c1-month", c1.monthLabel);
    setText("c1-day", c1.dayNumber);
    setText("c1-year", c1.yearLabel);
    setText("c1-lunar", c1.lunarText);
    setText("c1-loc-tag", c1.locationButtonText);
    setText("c1-address", c1.address);

    const c2 = cfg.ceremonies?.ceremony2 || {};
    applyResponsiveImg(document.getElementById("arch-welcome-photo"), cfg.archWelcomePhoto);
    applyResponsiveImg(document.getElementById("calendar-bg-photo"), cfg.calendarPhoto);
    setText("c2-title", c2.title);
    setText("c2-time", c2.timeDateText);
    setText("c2-lunar", c2.lunarText);
    setText("c2-venue-tag", c2.venueTag);
    setText("c2-address", c2.venueName);
    setAttr("venue-map-link", "href", c2.mapUrl || "#");
    if (c2.mapEmbedUrl) {
      setAttr("venue-map-iframe", "src", c2.mapEmbedUrl);
    }

    // Closing
    const shortDate = (cfg.heroDateDisplay || "29.11.2026").split(",")[0];
    setText("closing-names-date", `${cfg.groom.shortName} & ${cfg.bride.shortName} · ${shortDate}`);

    // Album & Dynamic Blocks
    setText("album-title", cfg.albumTitle);
    renderCalendar();
    renderGifts();
    renderGallery();
    renderFriendlyNotes();
    if (refreshScrollAnimations) refreshScrollAnimations();
  }

  hydratePage();

  /* ------------------------------------------------------------------------
     3. DESKTOP QR COMPANION
     ------------------------------------------------------------------------ */
  const desktopQrBox = document.getElementById("desktop-qr-svg");
  if (desktopQrBox && window.WeddingQR) {
    const shareTarget = window.location.protocol.startsWith("http")
      ? `${window.location.origin}${window.location.pathname}`
      : "https://thiepcuoi.hoangphuc-tuongvy.vn";
    desktopQrBox.innerHTML = window.WeddingQR.createSVG(shareTarget, {
      color: "#1c1917",
      bg: "#ffffff"
    });
  }

  const desktopQrCard = document.getElementById("desktop-qr-card");
  const btnQrCollapse = document.getElementById("btn-qr-collapse");
  btnQrCollapse?.addEventListener("click", () => {
    const collapsed = desktopQrCard?.classList.toggle("is-minimized");
    if (btnQrCollapse) {
      btnQrCollapse.textContent = collapsed ? "Hiện mã QR" : "Thu nhỏ";
    }
  });

  /* ------------------------------------------------------------------------
     4. LIVE COUNTDOWN TIMER
     ------------------------------------------------------------------------ */
  function updateCountdown() {
    const targetMs = new Date(cfg.weddingDateISO).getTime();
    const diff = Number.isNaN(targetMs) ? 0 : Math.max(0, targetMs - Date.now());

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    const pad = (n) => String(n).padStart(2, "0");
    setText("cd-days", pad(days));
    setText("cd-hours", pad(hours));
    setText("cd-minutes", pad(minutes));
    setText("cd-seconds", pad(seconds));
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);

  /* ------------------------------------------------------------------------
     5. MUSIC AUTOPLAY & TOP AUDIO PILL SYNC
     ------------------------------------------------------------------------ */
  const btnAudioPill = document.getElementById("btn-audio-pill");
  const audioPillLabel = document.getElementById("audio-pill-label");

  let player = null;
  let userPausedAudio = false;
  let pausedByHidden = false;

  function syncAudioUI() {
    if (!player) return;
    const playing = Boolean(player.isPlaying);
    const waiting = !playing && !userPausedAudio;
    btnAudioPill?.classList.toggle("is-playing", playing);
    btnAudioPill?.classList.toggle("is-waiting", waiting);
    if (audioPillLabel) {
      audioPillLabel.textContent = playing ? "Đang phát" : waiting ? "Chạm bật nhạc" : "Bật nhạc";
    }
    if (btnAudioPill) {
      btnAudioPill.setAttribute("aria-pressed", playing ? "true" : "false");
      btnAudioPill.setAttribute(
        "aria-label",
        playing ? "Tạm dừng nhạc nền" : "Phát nhạc nền"
      );
      btnAudioPill.setAttribute(
        "title",
        playing ? "Đang phát nhạc nền — Nhấn để tạm dừng" : "Nhấn để bật nhạc nền"
      );
    }
  }

  player = new window.WeddingAudioPlayer({
    audioUrl: cfg.music?.audioUrl || "",
    youtubeId: cfg.music?.youtubeId || "",
    durationSeconds: 233,
    onStatusChange: syncAudioUI
  });

  const AUTOPLAY_EVENTS = ["pointerdown", "mousedown", "touchstart", "touchend", "click", "keydown"];
  let unlockArmed = false;
  let lastWheelRetryAt = 0;

  function armAutoplayUnlock() {
    if (unlockArmed || userPausedAudio || player.isPlaying) return;
    unlockArmed = true;
    AUTOPLAY_EVENTS.forEach((evt) => {
      document.addEventListener(evt, handleFirstGesture, { capture: true, passive: true });
    });
    window.addEventListener("wheel", handleScrollUnlock, { passive: true });
  }

  function detachAutoplayUnlock() {
    if (!unlockArmed) return;
    unlockArmed = false;
    AUTOPLAY_EVENTS.forEach((evt) => {
      document.removeEventListener(evt, handleFirstGesture, true);
    });
    window.removeEventListener("wheel", handleScrollUnlock);
  }

  async function attemptAutoplay() {
    if (userPausedAudio || document.hidden) {
      syncAudioUI();
      return false;
    }
    if (player.isPlaying) {
      detachAutoplayUnlock();
      syncAudioUI();
      return true;
    }
    const started = await player.play();
    syncAudioUI();
    if (started || player.isPlaying) {
      pausedByHidden = false;
      detachAutoplayUnlock();
    } else if (!userPausedAudio) {
      armAutoplayUnlock();
    }
    return started;
  }

  function handleFirstGesture(e) {
    if (userPausedAudio || player.isPlaying) {
      detachAutoplayUnlock();
      return;
    }
    if (e.target?.closest?.("#btn-audio-pill")) return;
    attemptAutoplay();
  }

  function handleScrollUnlock() {
    if (userPausedAudio || player.isPlaying || document.hidden) {
      if (player.isPlaying) detachAutoplayUnlock();
      return;
    }
    const now = Date.now();
    if (now - lastWheelRetryAt < 600) return;
    lastWheelRetryAt = now;
    attemptAutoplay();
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      if (player.isPlaying) {
        pausedByHidden = true;
        player.pause();
        syncAudioUI();
      }
    } else if (!userPausedAudio && (pausedByHidden || !player.isPlaying)) {
      pausedByHidden = false;
      attemptAutoplay();
    }
  }

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("pagehide", () => {
    if (player.isPlaying) {
      pausedByHidden = true;
      player.pause();
      syncAudioUI();
    }
  });
  window.addEventListener("pageshow", () => {
    if (!document.hidden && !userPausedAudio && (pausedByHidden || !player.isPlaying)) {
      pausedByHidden = false;
      attemptAutoplay();
    }
  });

  btnAudioPill?.addEventListener("click", async () => {
    const nowPlaying = await player.toggle();
    userPausedAudio = !nowPlaying;
    pausedByHidden = false;
    if (nowPlaying || userPausedAudio) {
      detachAutoplayUnlock();
    }
    syncAudioUI();
  });

  // Auto-play immediately on link open, unlock on first interaction/scroll if blocked, and sync on tab switch
  armAutoplayUnlock();
  attemptAutoplay();
  syncAudioUI();

  /* ------------------------------------------------------------------------
     6. WISHES (LOCALSTORAGE + FLOATING DANMAKU STREAM + SAVED LIST)
     ------------------------------------------------------------------------ */
  function isRemovedSeedWish(w) {
    return (
      w &&
      String(w.name || "").trim() === "Team Thiết Kế" &&
      String(w.message || "").includes("Hẹn gặp Phúc & Vy ngày 29/11")
    );
  }

  function getWishes() {
    try {
      const raw = localStorage.getItem(STORAGE_WISHES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter((w) => !isRemovedSeedWish(w));
          if (filtered.length !== parsed.length) saveWishes(filtered);
          if (filtered.length > 0) return filtered;
        }
      }
    } catch (err) {
      console.warn(err);
    }
    return Array.isArray(cfg.initialWishes) ? [...cfg.initialWishes] : [];
  }

  function saveWishes(list) {
    try {
      localStorage.setItem(STORAGE_WISHES_KEY, JSON.stringify(list));
    } catch (err) {
      console.warn(err);
    }
  }

  function renderSavedWishesModal() {
    const wishes = getWishes();
    setText("wishes-count-badge", String(wishes.length));
    setText("modal-wish-count", String(wishes.length));
    const listEl = document.getElementById("saved-wishes-list");
    if (!listEl) return;

    listEl.innerHTML = wishes
      .map(
        (w) => `
      <div class="saved-wish-item">
        <div class="saved-wish-author">${escapeHTML(w.name)}</div>
        <div class="saved-wish-msg">${escapeHTML(w.message)}</div>
      </div>
    `
      )
      .join("");
  }

  const streamListEl = document.getElementById("floating-wishes-list");
  let wishCursor = 0;

  function pushFloatingWish(wish) {
    if (!streamListEl || !wish) return;
    const rawName = String(wish.name || "Khách").trim();
    const initialChar = rawName.charAt(0).toUpperCase() || "♥";
    const chip = document.createElement("div");
    chip.className = "wish-bubble-chip";
    chip.innerHTML = `<span class="wish-chip-avatar" aria-hidden="true">${escapeHTML(initialChar)}</span><span><strong>${escapeHTML(rawName)}:</strong> ${escapeHTML(wish.message)}</span>`;
    streamListEl.appendChild(chip);

    const activeChips = streamListEl.querySelectorAll(".wish-bubble-chip:not(.is-fading-out)");
    if (activeChips.length > 3) {
      const oldest = activeChips[0];
      oldest.classList.add("is-fading-out");
      setTimeout(() => {
        if (oldest.parentNode === streamListEl) oldest.remove();
      }, 450);
    }
  }

  function startWishStream() {
    const initial = getWishes();
    const seedCount = Math.min(3, initial.length);
    for (let i = 0; i < seedCount; i++) {
      pushFloatingWish(initial[i]);
      wishCursor = (i + 1) % initial.length;
    }

    setInterval(() => {
      const wishes = getWishes();
      if (wishes.length === 0) return;
      const item = wishes[wishCursor % wishes.length];
      wishCursor = (wishCursor + 1) % wishes.length;
      pushFloatingWish(item);
    }, 3600);
  }

  renderSavedWishesModal();
  startWishStream();

  const wishesContainer = document.getElementById("floating-wishes-container");
  const syncFloatingWishesHeroState = () => {
    if (!wishesContainer) return;
    wishesContainer.classList.toggle("is-past-hero", window.scrollY > 140);
  };
  syncFloatingWishesHeroState();
  window.addEventListener("scroll", syncFloatingWishesHeroState, { passive: true });

  /* ------------------------------------------------------------------------
     7. MODALS MANAGEMENT (RSVP, WISHES, GIFT, LIGHTBOX, CUSTOMIZER)
     ------------------------------------------------------------------------ */
  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove("active");
    if (!document.querySelector(".modal-overlay.active, .lightbox-overlay.active")) {
      document.body.style.overflow = "";
    }
  }

  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => closeModal(btn.dataset.closeModal));
  });

  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  document.getElementById("btn-open-rsvp")?.addEventListener("click", () => openModal("modal-rsvp"));
  document.getElementById("btn-open-rsvp-tb")?.addEventListener("click", () => openModal("modal-rsvp"));
  document.getElementById("btn-open-gift-modal")?.addEventListener("click", () => openModal("modal-gift"));

  const giftSectionEl = document.getElementById("gift-section");
  const giftEnvelopeStageEl = document.getElementById("gift-envelope-stage");
  const giftRevealPanelEl = document.getElementById("gift-reveal-panel");
  const btnGiftEnvelopeEl = document.getElementById("btn-gift-envelope");
  const btnGiftCollapseEl = document.getElementById("btn-gift-collapse");

  function setGiftEnvelopeOpened(opened) {
    if (!giftSectionEl || !giftEnvelopeStageEl || !giftRevealPanelEl) return;
    giftSectionEl.classList.toggle("is-opened", opened);
    giftEnvelopeStageEl.hidden = opened;
    giftRevealPanelEl.hidden = !opened;
    btnGiftEnvelopeEl?.setAttribute("aria-expanded", opened ? "true" : "false");
    const cards = giftRevealPanelEl.querySelectorAll("[data-anim]");
    if (opened) {
      requestAnimationFrame(() => {
        cards.forEach((el) => markElementRevealed(el));
      });
    } else {
      cards.forEach((el) => el.classList.remove("anim-in"));
    }
  }

  btnGiftEnvelopeEl?.addEventListener("click", () => setGiftEnvelopeOpened(true));
  btnGiftCollapseEl?.addEventListener("click", () => setGiftEnvelopeOpened(false));

  function openWishModalOnTab(tabName) {
    document.querySelectorAll("[data-wish-tab]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.wishTab === tabName);
    });
    document.getElementById("wish-tab-write")?.classList.toggle("hidden", tabName !== "write");
    document.getElementById("wish-tab-list")?.classList.toggle("hidden", tabName !== "list");
    openModal("modal-wish");
  }

  document.getElementById("btn-open-wish-modal")?.addEventListener("click", () => openWishModalOnTab("write"));
  document.getElementById("btn-open-guestbook-list")?.addEventListener("click", () => openWishModalOnTab("list"));

  document.querySelectorAll("[data-wish-tab]").forEach((btn) => {
    btn.addEventListener("click", () => openWishModalOnTab(btn.dataset.wishTab));
  });

  // Wish char counter & form submit
  const wishContentEl = document.getElementById("wish-content");
  wishContentEl?.addEventListener("input", () => {
    setText("wish-char-count", String(wishContentEl.value.length));
  });

  document.getElementById("wish-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("wish-name")?.value.trim();
    const message = wishContentEl?.value.trim();
    if (!name || !message) {
      showToast("Vui lòng nhập họ tên và lời chúc!");
      return;
    }

    const wishes = getWishes();
    const entry = { name, message, createdAt: new Date().toISOString() };
    wishes.unshift(entry);
    saveWishes(wishes);
    renderSavedWishesModal();
    pushFloatingWish(entry);

    e.target.reset();
    setText("wish-char-count", "0");
    closeModal("modal-wish");
    showToast("Cảm ơn lời chúc ngọt ngào của bạn! ❤️");
    burstPetals();
  });

  // RSVP form submit
  document.getElementById("rsvp-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("rsvp-name")?.value.trim();
    const status = document.querySelector('input[name="rsvp-status"]:checked')?.value || "yes";
    const side = document.querySelector('input[name="rsvp-side"]:checked')?.value || "Nhà gái";
    const phone = document.getElementById("rsvp-phone")?.value.trim() || "";
    const note = document.getElementById("rsvp-note")?.value.trim() || "";

    if (!name) {
      showToast("Vui lòng nhập họ tên của bạn!");
      return;
    }

    const record = { name, status, side, phone, note, createdAt: new Date().toISOString() };
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_RSVP_KEY) || "[]");
      existing.unshift(record);
      localStorage.setItem(STORAGE_RSVP_KEY, JSON.stringify(existing));
    } catch (err) {
      console.warn(err);
    }

    if (cfg.rsvpWebhookUrl) {
      fetch(cfg.rsvpWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record)
      }).catch(() => {});
    }

    e.target.reset();
    closeModal("modal-rsvp");
    showToast(
      status === "yes"
        ? `Cảm ơn ${name}! Hẹn gặp bạn tại ngày vui nhé 🥂`
        : `Cảm ơn ${name} đã phản hồi. Rất trân trọng tấm lòng của bạn!`
    );
    burstPetals();
  });

  // Copy STK delegation (works for both inline & modal gift cards)
  document.addEventListener("click", (e) => {
    const copyBtn = e.target.closest("[data-copy-stk]");
    if (!copyBtn) return;
    const stk = copyBtn.dataset.copyStk;
    if (stk) copyText(stk, `Đã sao chép số tài khoản: ${stk}`);
  });

  // Bottom toolbar collapse toggle
  const toolbarWrap = document.getElementById("bottom-toolbar-wrap");
  const toolbarIcon = document.getElementById("tb-toggle-icon");
  document.getElementById("btn-toggle-toolbar")?.addEventListener("click", () => {
    const collapsed = toolbarWrap?.classList.toggle("is-collapsed");
    if (toolbarIcon) toolbarIcon.textContent = collapsed ? "☰" : "✕";
  });

  /* ------------------------------------------------------------------------
     8. LIGHTBOX GALLERY
     ------------------------------------------------------------------------ */
  const lbOverlay = document.getElementById("modal-lightbox");
  const lbImg = document.getElementById("lb-img");
  const lbCaption = document.getElementById("lb-caption");
  let lbIndex = 0;

  function showLightbox(index) {
    const items = cfg.gallery || [];
    if (!items.length || !lbOverlay || !lbImg) return;
    lbIndex = (index + items.length) % items.length;
    const item = items[lbIndex];
    const lbSrc = RESPONSIVE_ASSETS.has(item.src) ? `${toHdPath(item.src)}?v=${CACHE_VER}` : item.src;
    lbImg.removeAttribute("srcset");
    lbImg.src = lbSrc;
    lbImg.alt = item.caption || "";
    if (lbCaption) lbCaption.textContent = item.caption || "";
    lbOverlay.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    lbOverlay?.classList.remove("active");
    if (!document.querySelector(".modal-overlay.active")) {
      document.body.style.overflow = "";
    }
  }

  document.getElementById("album-collage-grid")?.addEventListener("click", (e) => {
    const tile = e.target.closest("[data-gallery-idx]");
    if (!tile) return;
    showLightbox(Number(tile.dataset.galleryIdx));
  });

  document.getElementById("lb-close")?.addEventListener("click", closeLightbox);
  document.getElementById("lb-prev")?.addEventListener("click", () => showLightbox(lbIndex - 1));
  document.getElementById("lb-next")?.addEventListener("click", () => showLightbox(lbIndex + 1));
  lbOverlay?.addEventListener("click", (e) => {
    if (e.target === lbOverlay) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeLightbox();
      document.querySelectorAll(".modal-overlay.active").forEach((m) => closeModal(m.id));
    }
    if (lbOverlay?.classList.contains("active")) {
      if (e.key === "ArrowLeft") showLightbox(lbIndex - 1);
      if (e.key === "ArrowRight") showLightbox(lbIndex + 1);
    }
  });

  /* ------------------------------------------------------------------------
     9. SUBTLE FALLING PETALS CANVAS
     ------------------------------------------------------------------------ */
  const canvas = document.getElementById("petals-canvas");
  const petals = [];
  if (canvas) {
    const ctx = canvas.getContext("2d");
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth || 450;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const palette = ["rgba(216,131,134,0.45)", "rgba(244,180,184,0.5)", "rgba(181,77,56,0.3)"];
    for (let i = 0; i < 16; i++) {
      petals.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        rx: Math.random() * 4 + 3,
        ry: Math.random() * 2.5 + 2,
        vy: Math.random() * 0.65 + 0.45,
        vx: (Math.random() - 0.5) * 0.4,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.03,
        color: palette[i % palette.length]
      });
    }

    function animatePetals() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of petals) {
        p.y += p.vy;
        p.x += p.vx + Math.sin(p.y * 0.015) * 0.35;
        p.rot += p.vRot;

        if (p.y > canvas.height + 16) {
          p.y = -12;
          p.x = Math.random() * canvas.width;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.rx, p.ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      requestAnimationFrame(animatePetals);
    }
    requestAnimationFrame(animatePetals);
  }

  function burstPetals() {
    if (!canvas) return;
    for (let i = 0; i < Math.min(8, petals.length); i++) {
      petals[i].y = Math.random() * 80;
      petals[i].x = Math.random() * canvas.width;
    }
  }

  /* ------------------------------------------------------------------------
     10. STAGGERED SCROLL CHOREOGRAPHY & SVG DRAW (NGAYCHUNGDOI STYLE)
     ------------------------------------------------------------------------ */
  const STATIC_ANIM_SPEC = [
    ["#story .story-header", "slide-up", 0],
    ["#story-p1", "fade-in", 0.1],
    ["#story .story-end-quote", "fade-in", 0.14],
    ["#story-p2", "slide-left", 0.16],
    ["#story .story-polaroid", "fade-in", 0.15],
    ["#family .salutation-main", "slide-up", 0.08],
    ["#family .salutation-sub", "fade-in", 0.16],
    ["#family .burgundy-banner", "slide-up", 0],
    ["#family .family-col:first-child .family-side-label", "slide-right", 0],
    ["#groom-father", "slide-up", 0.08],
    ["#groom-mother", "slide-up", 0.14],
    ["#groom-hometown", "slide-right", 0.16],
    ["#groom-role", "slide-right", 0.2],
    ["#groom-short", "fade-in", 0.22],
    ["#family .family-col:first-child .arch-portrait", "slide-right", 0.2],
    ["#family .family-col:last-child .family-side-label", "slide-left", 0],
    ["#bride-father", "slide-left", 0.08],
    ["#bride-mother", "slide-left", 0.14],
    ["#bride-hometown", "slide-left", 0.16],
    ["#bride-role", "slide-left", 0.2],
    ["#bride-short", "fade-in", 0.22],
    ["#family .family-col:last-child .arch-portrait", "slide-left", 0.2],
    ["#c1-title", "fade-in", 0],
    ["#c1-time", "fade-in", 0.1],
    ["#ceremony-1 .editorial-date-box", "scale-in", 0.12],
    ["#c1-loc-tag", "slide-up", 0.16],
    ["#c1-address", "fade-in", 0.22],
    ["#ceremony-2 .arch-welcome-frame", "fade-in", 0.1],
    ["#ceremony-2 .curved-arch-text", "fade-in", 0.22],
    ["#c2-title", "fade-in", 0],
    ["#c2-time", "fade-in", 0.1],
    ["#c2-lunar", "fade-in", 0.16],
    ["#ceremony-2 .calendar-photo-card", "fade-in", 0.15],
    ["#c2-venue-tag", "slide-up", 0.05],
    ["#c2-address", "slide-up", 0.12],
    ["#venue .map-embed-card", "fade-in", 0.15],
    ["#venue-map-link", "slide-up", 0.2],
    ["#rsvp-gift .rsvp-ticket-card", "slide-up", 0.08],
    ["#btn-open-rsvp", "fade-in", 0.16],
    ["#gift-section .gift-script-heading", "fade-in", 0.06],
    ["#gift-section .gift-graceful-note", "fade-in", 0.1],
    ["#gift-envelope-stage", "slide-up", 0.14],
    ["#album .album-header", "fade-in", 0.04],
    ["#friendly-note .thought-dots", "slide-up", 0.04],
    ["#friendly-title", "slide-up", 0.06],
    ["#closing .closing-thankyou", "slide-up", 0.04],
    ["#closing-names-date", "fade-in", 0.12]
  ];

  function stampScrollAttributes() {
    STATIC_ANIM_SPEC.forEach(([selector, anim, delay]) => {
      document.querySelectorAll(selector).forEach((el) => {
        if (!el.hasAttribute("data-anim")) {
          el.setAttribute("data-anim", anim);
        }
        if (delay && !el.hasAttribute("data-delay")) {
          el.setAttribute("data-delay", String(delay));
        }
      });
    });

    document.querySelectorAll("[data-anim]").forEach((el) => {
      const delay = el.getAttribute("data-delay");
      if (delay) {
        el.style.setProperty("--anim-delay", `${delay}s`);
      }
    });

    document.querySelectorAll(".story-flourish path, .red-thread-svg path").forEach((pathEl) => {
      if (!pathEl.classList.contains("svg-draw-path") && typeof pathEl.getTotalLength === "function") {
        const len = Math.ceil(pathEl.getTotalLength());
        pathEl.style.strokeDasharray = String(len);
        pathEl.style.strokeDashoffset = String(len);
        pathEl.classList.add("svg-draw-path");
      }
    });
  }

  function markElementRevealed(el) {
    if (el.classList.contains("svg-draw-path")) {
      el.classList.add("is-drawn");
    } else {
      el.classList.add("anim-in");
    }
  }

  let animObserver = null;
  function setupScrollChoreography() {
    stampScrollAttributes();

    const targets = document.querySelectorAll("[data-anim], .svg-draw-path");
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reducedMotion || !("IntersectionObserver" in window)) {
      targets.forEach(markElementRevealed);
      return;
    }

    if (animObserver) animObserver.disconnect();
    animObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            markElementRevealed(entry.target);
            animObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.04, rootMargin: "0px 0px 60px 0px" }
    );

    const viewportH = window.innerHeight || document.documentElement.clientHeight || 800;
    targets.forEach((el) => {
      if (el.classList.contains("anim-in") || el.classList.contains("is-drawn")) return;
      const inHero = Boolean(el.closest("#hero"));
      if (inHero) return; // Hero runs staggered mount entrance below

      const rect = el.getBoundingClientRect();
      if (rect.top < viewportH * 0.94 && rect.bottom > 0) {
        markElementRevealed(el);
      } else if (rect.bottom <= 0) {
        // Already scrolled past above current viewport
        markElementRevealed(el);
      } else {
        animObserver.observe(el);
      }
    });

    // Commit initial hidden styles before triggering Hero staggered entrance
    document.getElementById("hero")?.getBoundingClientRect();
    requestAnimationFrame(() => {
      document.querySelectorAll("#hero [data-anim]").forEach(markElementRevealed);
    });
  }

  function revealVisibleOrPassed() {
    const viewportH = window.innerHeight || document.documentElement.clientHeight || 800;
    document.querySelectorAll("[data-anim]:not(.anim-in), .svg-draw-path:not(.is-drawn)").forEach((el) => {
      if (el.closest("#hero")) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < viewportH * 0.96) {
        markElementRevealed(el);
        animObserver?.unobserve(el);
      }
    });
  }

  refreshScrollAnimations = setupScrollChoreography;
  setupScrollChoreography();
  window.addEventListener("scroll", revealVisibleOrPassed, { passive: true });
});
