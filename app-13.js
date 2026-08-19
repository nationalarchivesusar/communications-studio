"use strict";
  function handleKeyDown(event) {
    if (event.key === "Escape" && modal) {
      modal = null;
      renderStudio();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
      if (event.target.matches("textarea,input")) return;
      event.preventDefault();
      undo();
    }
    if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === "y" || (event.shiftKey && event.key.toLowerCase() === "z"))) {
      if (event.target.matches("textarea,input")) return;
      event.preventDefault();
      redo();
    }
  }

  app.addEventListener("click", handleClick);
  app.addEventListener("input", handleInput);
  app.addEventListener("change", handleChange);
  app.addEventListener("focusin", handleFocusIn);
  app.addEventListener("focusout", handleFocusOut);
  app.addEventListener("dragstart", handleDragStart);
  app.addEventListener("dragover", handleDragOver);
  app.addEventListener("dragleave", handleDragLeave);
  app.addEventListener("drop", handleDrop);
  document.addEventListener("keydown", handleKeyDown);

  async function boot() {
    const ui = (() => { try { return JSON.parse(localStorage.getItem(THEME_KEY) || "{}"); } catch { return {}; } })();
    const server = await restoreServerSession();

    if (server) {
      const hasDiscord = Boolean(session?.discord || session?.user?.discord);
      const hasRoblox = Boolean(session?.roblox || session?.user?.roblox);
      const stage = authFlowStage();

      if (hasDiscord && hasRoblox) {
        setAuthFlowStage("");
        state = loadDraft();
        if (ui.previewTheme) state.preview.theme = ui.previewTheme;
        renderStudio();
        return;
      }

      if (stage === "discord-pending" && hasDiscord && !hasRoblox) {
        setAuthFlowStage("roblox-pending");
        auth("roblox");
        return;
      }

      if (stage === "roblox-pending" && !hasRoblox) {
        setAuthFlowStage("roblox-needed");
      }

      renderLogin();
      return;
    }

    if (["discord-pending", "roblox-pending"].includes(authFlowStage())) setAuthFlowStage("");

    const preview = restorePreviewSession();
    if (preview) {
      state = loadDraft();
      if (ui.previewTheme) state.preview.theme = ui.previewTheme;
      renderStudio();
    } else {
      renderLogin();
    }
  }

  window.addEventListener("beforeunload", () => {
    if (state) {
      try { localStorage.setItem(APP_KEY, JSON.stringify(state)); } catch { /* no-op */ }
    }
  });

  boot();
