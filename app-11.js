"use strict";
  function handleClick(event) {
    const target = event.target.closest("button, [data-preview-kind], [data-action]");
    if (!target) return;

    if (target.dataset.selectKind) {
      if (target.dataset.selectKind === "message") selection = { kind: "message" };
      if (target.dataset.selectKind === "container") selection = { kind: "container", containerId: target.dataset.containerId };
      if (target.dataset.selectKind === "component") selection = { kind: "component", containerId: target.dataset.containerId, componentId: target.dataset.componentId };
      renderStudio();
      return;
    }

    if (target.dataset.previewKind === "container") {
      selection = { kind: "container", containerId: target.dataset.previewContainer };
      renderStudio();
      return;
    }
    if (target.dataset.previewKind === "component") {
      selection = { kind: "component", containerId: target.dataset.previewContainer, componentId: target.dataset.previewComponent };
      renderStudio();
      return;
    }

    const action = target.dataset.action;
    if (!action) return;
    switch (action) {
      case "auth-signin": startSignIn(); break;
      case "auth-discord": auth("discord"); break;
      case "auth-roblox": auth("roblox"); break;
      case "auth-preview": createPreviewSession(); break;
      case "logout": logout(); break;
      case "undo": undo(); break;
      case "redo": redo(); break;
      case "add-container": {
        const container = makeContainer();
        mutate(() => state.containers.push(container));
        selection = { kind: "container", containerId: container.id };
        renderStudio();
        break;
      }
      case "duplicate-container": duplicateContainer(target.dataset.containerId); break;
      case "delete-container": removeContainer(target.dataset.containerId); break;
      case "open-picker": modal = { type: "picker", containerId: target.dataset.containerId }; renderStudio(); break;
      case "picker-add": addComponent(target.dataset.containerId, target.dataset.kind); break;
      case "delete-component": removeComponent(target.dataset.containerId, target.dataset.componentId); break;
      case "preview-theme": {
        mutate((s) => s.preview.theme = target.dataset.theme, { history: false });
        try { localStorage.setItem(THEME_KEY, JSON.stringify({ previewTheme: target.dataset.theme })); } catch { /* no-op */ }
        break;
      }
      case "preview-device": mutate((s) => s.preview.device = target.dataset.device, { history: false }); break;
      case "mobile-panel": activeMobilePanel = target.dataset.panel; renderStudio(); break;
      case "modal-close": modal = null; renderStudio(); break;
      case "modal-backdrop": if (event.target === target) { modal = null; renderStudio(); } break;
      case "export": modal = { type: "export", mode: "discord" }; renderStudio(); break;
      case "import": modal = { type: "import" }; renderStudio(); break;
      case "export-mode": modal.mode = target.dataset.mode; renderStudio(); break;
      case "copy-export": {
        const output = document.getElementById("exportOutput");
        navigator.clipboard?.writeText(output?.value || "").then(() => toast("JSON copied to clipboard.", "success")).catch(() => toast("Clipboard access was blocked.", "warn"));
        break;
      }
      case "download-export": downloadJson(); break;
      case "apply-import": applyImport(); break;
      case "confirm-reset": modal = { type: "confirm-reset" }; renderStudio(); break;
      case "apply-reset": {
        recordUndo();
        state = defaultState();
        selection = { kind: "message" };
        modal = null;
        saveDraftSoon();
        renderStudio();
        toast("Started a fresh announcement.", "success");
        break;
      }
      case "section-add-text": mutate(() => { const c = selectedEntity(); if (c?.kind === "section" && c.texts.length < 3) c.texts.push("New text display"); }); break;
      case "section-remove-text": mutate(() => { const c = selectedEntity(); if (c?.kind === "section" && c.texts.length > 1) c.texts.splice(Number(target.dataset.index), 1); }); break;
      case "gallery-add": mutate(() => { const c = selectedEntity(); if (c?.kind === "gallery" && c.items.length < 10) c.items.push({ id: uid("media"), url: "", description: "", spoiler: false }); }); break;
      case "gallery-remove": mutate(() => { const c = selectedEntity(); if (c?.kind === "gallery" && c.items.length > 1) c.items = c.items.filter((item) => item.id !== el.dataset.itemId); }); break;
      case "button-add": mutate(() => { const c = selectedEntity(); if (c?.kind === "actionRow" && c.buttons.length < 5) c.buttons.push({ id: uid("btn"), label: "Button", style: 2, url: "", customId: "", disabled: false, emoji: "" }); }); break;
      case "button-remove": mutate(() => { const c = selectedEntity(); if (c?.kind === "actionRow" && c.buttons.length > 1) c.buttons = c.buttons.filter((button) => button.id !== target.dataset.buttonId); }); break;
      case "select-option-add": mutate(() => { const c = selectedEntity(); if (c?.kind === "actionRow" && c.select?.type === 3 && c.select.options.length < 25) c.select.options.push({ id: uid("opt"), label: `Option ${c.select.options.length + 1}`, value: `option_${c.select.options.length + 1}`, description: "", emoji: "", default: false }); }); break;
      case "select-option-remove": mutate(() => { const c = selectedEntity(); if (c?.kind === "actionRow" && c.select?.options?.length > 1) c.select.options = c.select.options.filter((option) => option.id !== target.dataset.optionId); }); break;
      case "markdown-wrap":
      case "markdown-prefix": applyMarkdownAction(target); break;
      case "reveal-spoiler": target.classList.toggle("revealed"); event.stopPropagation(); break;
      case "reveal-container": target.remove(); target.parentElement?.classList.remove("dc-spoiler-container"); event.stopPropagation(); break;
      default: break;
    }
  }

