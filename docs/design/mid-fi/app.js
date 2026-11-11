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

  const tabScreens = new Set(["home", "challenge", "activity", "profile"]);
  let historyStack = ["home"];

  function setActiveNav(name) {
    nav.querySelectorAll("button[data-nav]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.nav === name);
    });
  }

  function showScreen(name, { push = true } = {}) {
    if (!screens[name]) return;

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

    // Soft progress fill animation (honours reduced motion via CSS)
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

  document.querySelectorAll("[data-go]").forEach((el) => {
    el.addEventListener("click", () => {
      const target = el.getAttribute("data-go");
      if (target === "back") {
        goBack();
        return;
      }
      showScreen(target);
    });
  });

  nav.querySelectorAll("button[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      historyStack = [btn.dataset.nav];
      showScreen(btn.dataset.nav, { push: false });
    });
  });

  function syncPrivacyPreview() {
    const on = optOut.checked;
    previewDefault.hidden = on;
    previewOpted.hidden = !on;
  }

  if (optOut) {
    optOut.addEventListener("change", syncPrivacyPreview);
    syncPrivacyPreview();
  }

  function syncJoinContinue() {
    const ok = joinAck.checked;
    joinContinue.disabled = !ok;
    joinContinue.setAttribute("aria-disabled", String(!ok));
  }

  if (joinAck && joinContinue) {
    joinAck.addEventListener("change", syncJoinContinue);
    syncJoinContinue();
  }

  // Capture mode hides stage chrome for media/mid-fi screenshots
  if (new URLSearchParams(location.search).has("capture")) {
    document.body.classList.add("capture");
  }

  // Deep-link support for screenshots / walkthrough anchors
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
