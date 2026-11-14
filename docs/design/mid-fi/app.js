(() => {
  const screens = {
    home: document.getElementById("screen-home"),
    challenge: document.getElementById("screen-challenge"),
    activity: document.getElementById("screen-activity"),
    profile: document.getElementById("screen-profile"),
    record: document.getElementById("screen-record"),
    confirm: document.getElementById("screen-confirm"),
    privacy: document.getElementById("screen-privacy"),
    join: document.getElementById("screen-join"),
  };

  const nav = document.getElementById("bottom-nav");
  const optOut = document.getElementById("opt-out-toggle");
  const previewDefault = document.getElementById("privacy-preview-default");
  const previewOpted = document.getElementById("privacy-preview-opted");
  const joinAck = document.getElementById("join-ack");
  const joinContinue = document.getElementById("join-continue");
  const screenLabel = document.getElementById("current-screen-label");
  const viewerBanner = document.getElementById("viewer-banner");
  const privacySave = document.getElementById("privacy-save");
  const confirmDone = document.getElementById("confirm-done");
  const stateBadge = document.getElementById("scenario-state");

  const tabScreens = new Set(["home", "challenge", "activity", "profile"]);
  let historyStack = ["home"];

  /** Prototype scenario state (synthetic · self-reported) */
  const state = {
    recorded: false, // false: £1,190; true after £50: £1,240
    alexOptedOut: false,
    viewer: "self", // "self" | "member" (simulated approved-member view)
  };

  const figures = {
    before: {
      personal: "£1,190 of £2,000",
      pct: 60,
      pctLabel: "Current 60%",
      shareAmount: "£3,030 of £5,500",
      sharePct: 55,
      shareWho: "Alex, Sam, Riley",
      commitment: { cls: "chip", text: "This week · £50 · Not started" },
    },
    after: {
      personal: "£1,240 of £2,000",
      pct: 62,
      pctLabel: "Current 62%",
      shareAmount: "£3,080 of £5,500",
      sharePct: 56,
      shareWho: "Alex, Sam, Riley",
      commitment: { cls: "chip success", text: "✓ This week · £50 · Completed" },
    },
    // Alex opted out — sharing members only = Sam + Riley
    optedShare: {
      amount: "£1,840 of £3,500",
      pct: 53,
      who: "Sam, Riley",
    },
  };

  function personal() {
    return state.recorded ? figures.after : figures.before;
  }

  function setActiveNav(name) {
    nav.querySelectorAll("button[data-nav]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.nav === name);
    });
  }

  function showScreen(name, { push = true } = {}) {
    if (!screens[name]) return;

    applyScenario();

    Object.entries(screens).forEach(([key, el]) => {
      el.classList.toggle("active", key === name);
    });

    const showNav = tabScreens.has(name);
    nav.hidden = !showNav;
    if (showNav) setActiveNav(name);

    if (push) {
      const last = historyStack[historyStack.length - 1];
      if (last !== name) historyStack.push(name);
    }

    if (screenLabel) {
      screenLabel.textContent = screens[name].dataset.label || name;
    }

    screens[name].querySelectorAll(".progress > span[data-width]").forEach((bar) => {
      const width = bar.getAttribute("data-width");
      bar.style.width = "0%";
      requestAnimationFrame(() => {
        bar.style.transition = "width 0.55s ease";
        bar.style.width = width;
      });
    });
  }

  function goBack() {
    if (historyStack.length > 1) {
      historyStack.pop();
      showScreen(historyStack[historyStack.length - 1], { push: false });
      return;
    }
    showScreen("home", { push: false });
  }

  function syncPrivacyPreview() {
    const on = optOut.checked;
    previewDefault.hidden = on;
    previewOpted.hidden = !on;
  }

  function syncJoinContinue() {
    const ok = joinAck.checked;
    joinContinue.disabled = !ok;
    joinContinue.setAttribute("aria-disabled", String(!ok));
  }

  function updateStateBadge() {
    if (!stateBadge) return;
    const bits = [
      state.recorded ? "After £50" : "Before £50",
      state.alexOptedOut ? "Alex opted out" : "Alex sharing",
      state.viewer === "member" ? "Member view" : "Self view",
    ];
    stateBadge.textContent = bits.join(" · ");
  }

  function setText(sel, text) {
    document.querySelectorAll(sel).forEach((el) => {
      el.textContent = text;
    });
  }

  function setBar(sel, pct) {
    document.querySelectorAll(sel).forEach((el) => {
      el.setAttribute("data-width", `${pct}%`);
      el.style.width = `${pct}%`;
    });
  }

  function setMiniBar(sel, pct) {
    document.querySelectorAll(sel).forEach((el) => {
      el.style.width = `${pct}%`;
    });
  }

  function applyScenario() {
    const p = personal();
    const memberView = state.viewer === "member";
    const hideAlexMoney = memberView && state.alexOptedOut;

    // Viewer banner
    if (viewerBanner) {
      viewerBanner.hidden = !memberView;
      const label = viewerBanner.querySelector("[data-viewer-label]");
      if (label) {
        label.textContent = state.alexOptedOut
          ? "Simulated approved-member view (e.g. Sam) — Alex opted out"
          : "Simulated approved-member view — Alex still sharing";
      }
    }
    document.body.classList.toggle("member-view", memberView);

    // Personal figures — self always sees own money on Home / self challenge row
    setText("[data-personal-amount]", p.personal);
    setText("[data-personal-meta]", `Self-reported · ${p.pctLabel}`);
    setBar("[data-personal-bar]", p.pct);
    setText("[data-personal-pct]", `${p.pct}%`);
    setMiniBar("[data-alex-mini]", p.pct);

    // Commitment chips
    document.querySelectorAll("[data-commitment-chip]").forEach((el) => {
      el.className = p.commitment.cls;
      el.textContent = p.commitment.text;
    });

    // Sharing totals
    if (hideAlexMoney || (state.alexOptedOut && !memberView)) {
      // Opted-out Alex is excluded from Sharing members only (self or member view)
      setText("[data-share-amount]", figures.optedShare.amount);
      setBar("[data-share-bar]", figures.optedShare.pct);
      setText(
        "[data-share-meta]",
        `Sharing members only — ${figures.optedShare.who}. Excludes opted-out Alex and Jordan. Not a full-group total (G1.1-06).`
      );
      setText(
        "[data-share-meta-short]",
        "Excludes members who opted out · not a full-group total"
      );
    } else {
      setText("[data-share-amount]", p.shareAmount);
      setBar("[data-share-bar]", p.sharePct);
      setText(
        "[data-share-meta]",
        `Sharing members only — ${p.shareWho}. Excludes opted-out Jordan. Not a full-group total (G1.1-06).`
      );
      setText(
        "[data-share-meta-short]",
        "Excludes members who opted out · not a full-group total"
      );
    }

    // Challenge roster — Alex row
    const alexSharing = document.getElementById("alex-roster-sharing");
    const alexPrivate = document.getElementById("alex-roster-private");
    if (alexSharing && alexPrivate) {
      if (hideAlexMoney) {
        alexSharing.hidden = true;
        alexPrivate.hidden = false;
      } else {
        alexSharing.hidden = false;
        alexPrivate.hidden = true;
        const name = alexSharing.querySelector(".person-name");
        if (name) name.textContent = memberView ? "Alex" : "Alex (you)";
        setText(
          "#alex-roster-sharing [data-alex-roster-meta]",
          `${p.personal} · Self-reported · ${p.pctLabel}`
        );
      }
    }

    // Home: when member view, personal card reframes as “what you see of Alex”
    const homePersonal = document.getElementById("home-personal-card");
    const homeMemberNote = document.getElementById("home-member-note");
    if (homePersonal && homeMemberNote) {
      if (hideAlexMoney) {
        homePersonal.hidden = true;
        homeMemberNote.hidden = false;
      } else {
        homePersonal.hidden = false;
        homeMemberNote.hidden = true;
      }
    }

    // Confirm screen stays fixed £50 beat (post-record figures)
    // Privacy preview personal amount follows recorded state for consistency after save path
    const previewAmt = state.recorded ? figures.after.personal : figures.before.personal;
    setText("[data-privacy-preview-amount]", `Alex · ${previewAmt} · Self-reported`);

    // Activity: Alex Halfway — amounts only if sharing toward others
    document.querySelectorAll("[data-alex-feed-private]").forEach((el) => {
      el.hidden = !hideAlexMoney;
    });
    document.querySelectorAll("[data-alex-feed-public]").forEach((el) => {
      el.hidden = hideAlexMoney;
    });

    updateStateBadge();
    if (optOut) optOut.checked = state.alexOptedOut;
    syncPrivacyPreview();
  }

  document.querySelectorAll("[data-go]").forEach((el) => {
    el.addEventListener("click", () => {
      const target = el.getAttribute("data-go");
      if (target === "back") {
        goBack();
        return;
      }
      if (target === "confirm") {
        // Entering confirm implies the £50 scenario outcome
        showScreen("confirm");
        return;
      }
      showScreen(target);
    });
  });

  nav.querySelectorAll("button[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      // Tab navigation returns to self view unless staying in member demo via Challenge after opt-out save
      if (btn.dataset.nav !== "challenge" || state.viewer !== "member") {
        // Keep member view only while exploring challenge/home/activity after opt-out save;
        // Profile always snaps back to self tooling
        if (btn.dataset.nav === "profile") state.viewer = "self";
      }
      historyStack = [btn.dataset.nav];
      showScreen(btn.dataset.nav, { push: false });
    });
  });

  if (optOut) {
    optOut.addEventListener("change", syncPrivacyPreview);
  }

  if (joinAck && joinContinue) {
    joinAck.addEventListener("change", syncJoinContinue);
    syncJoinContinue();
  }

  if (confirmDone) {
    confirmDone.addEventListener("click", (e) => {
      e.preventDefault();
      state.recorded = true;
      state.viewer = "self";
      historyStack = ["home"];
      showScreen("home", { push: false });
    });
  }

  if (privacySave) {
    privacySave.addEventListener("click", (e) => {
      e.preventDefault();
      state.alexOptedOut = optOut.checked;
      if (state.alexOptedOut) {
        state.viewer = "member";
        historyStack = ["privacy", "challenge"];
        showScreen("challenge", { push: false });
      } else {
        state.viewer = "self";
        historyStack = ["profile"];
        showScreen("profile", { push: false });
      }
    });
  }

  document.querySelectorAll("[data-viewer]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.viewer = btn.getAttribute("data-viewer");
      const go = btn.getAttribute("data-viewer-go") || "challenge";
      showScreen(go);
    });
  });

  document.querySelectorAll("[data-reset-scenario]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.recorded = false;
      state.alexOptedOut = false;
      state.viewer = "self";
      if (optOut) optOut.checked = false;
      historyStack = ["home"];
      showScreen("home", { push: false });
    });
  });

  // Capture mode hides stage chrome for media/mid-fi screenshots
  const params = new URLSearchParams(location.search);
  if (params.has("capture")) {
    document.body.classList.add("capture");
  }
  // Capture helpers: ?recorded=1&optout=1&viewer=member
  if (params.get("recorded") === "1") state.recorded = true;
  if (params.get("optout") === "1") state.alexOptedOut = true;
  if (params.get("viewer") === "member") state.viewer = "member";

  const hash = (location.hash || "").replace("#", "");
  if (hash && screens[hash]) {
    historyStack = tabScreens.has(hash) ? [hash] : ["home", hash];
    showScreen(hash, { push: false });
  } else {
    showScreen("home", { push: false });
  }

  window.addEventListener("hashchange", () => {
    const next = (location.hash || "").replace("#", "");
    if (next && screens[next]) showScreen(next);
  });
})();
