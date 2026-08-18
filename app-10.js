"use strict";
  function downloadJson() {
    const builderMode = modal?.mode === "builder";
    const data = builderMode ? state : toDiscordPayload();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = builderMode ? "communications-studio-builder.json" : "discord-components-v2-payload.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function toast(message, type = "success") {
    let stack = document.getElementById("toastStack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      stack.id = "toastStack";
      document.body.appendChild(stack);
    }
    const item = document.createElement("div");
    item.className = `toast ${type}`;
    item.textContent = message;
    stack.appendChild(item);
    setTimeout(() => item.remove(), 3600);
  }

  function initials(name) {
    return String(name || "US").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "US";
  }

  async function auth(provider) {
    if (!CONFIG.apiBase) {
      toast(`${provider === "discord" ? "Discord" : "Roblox"} OAuth is ready for the backend endpoint, but no apiBase is configured yet.`, "warn");
      return;
    }
    const path = provider === "discord" ? CONFIG.discordAuthPath : CONFIG.robloxAuthPath;
    const returnTo = `${location.origin}${location.pathname}`;
    location.href = `${CONFIG.apiBase.replace(/\/$/, "")}${path}?return_to=${encodeURIComponent(returnTo)}`;
  }

  async function restoreServerSession() {
    if (!CONFIG.apiBase) return false;
    try {
      const response = await fetch(`${CONFIG.apiBase.replace(/\/$/, "")}${CONFIG.sessionPath}`, { credentials: "include", headers: { Accept: "application/json" } });
      if (!response.ok) return false;
      const data = await response.json();
      if (!data?.authenticated) return false;
      session = {
        displayName: data.user?.display_name || data.user?.username || "Authenticated User",
        provider: data.user?.provider || "Connected",
        user: data.user || {}
      };
      return true;
    } catch {
      return false;
    }
  }

  function restorePreviewSession() {
    try {
      const data = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      if (!data || data.expiresAt < Date.now()) return false;
      session = data;
      return true;
    } catch {
      return false;
    }
  }

  function createPreviewSession() {
    session = { displayName: "Preview User", provider: "Browser preview", expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30 };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    state = loadDraft();
    renderStudio();
  }

  async function logout() {
    if (CONFIG.apiBase) {
      try { await fetch(`${CONFIG.apiBase.replace(/\/$/, "")}${CONFIG.logoutPath}`, { method: "POST", credentials: "include" }); } catch { /* no-op */ }
    }
    localStorage.removeItem(SESSION_KEY);
    session = null;
    renderLogin();
  }

