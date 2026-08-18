"use strict";
  function renderContainerTree(container, index) {
    const selected = selection.kind === "container" && selection.containerId === container.id;
    return `<div class="tree-container" data-container-wrap="${container.id}">
      <div class="tree-container-head">
        <button class="tree-item ${selected ? "selected" : ""}" draggable="true" data-drag-container="${container.id}" data-select-kind="container" data-container-id="${container.id}">
          <span class="drag-handle">⋮⋮</span>
          <span class="tree-icon">${icon("container")}</span>
          <span class="tree-copy"><strong>Container ${index + 1}</strong><span>${container.children.length} child component${container.children.length === 1 ? "" : "s"}</span></span>
        </button>
        <div class="tree-actions">
          <button class="mini-action" data-action="duplicate-container" data-container-id="${container.id}" title="Duplicate">${icon("copy")}</button>
          <button class="mini-action danger" data-action="delete-container" data-container-id="${container.id}" title="Delete">${icon("trash")}</button>
        </div>
      </div>
      <div class="tree-children">
        ${container.children.map((component) => renderComponentTree(container.id, component)).join("")}
      </div>
      <div class="add-component-wrap"><button class="add-component-btn" data-action="open-picker" data-container-id="${container.id}">+ Add component</button></div>
    </div>`;
  }

  function renderComponentTree(containerId, component) {
    const selected = selection.kind === "component" && selection.componentId === component.id;
    return `<button class="tree-item ${selected ? "selected" : ""}" draggable="true" data-drag-component="${component.id}" data-drag-parent="${containerId}" data-select-kind="component" data-container-id="${containerId}" data-component-id="${component.id}">
      <span class="drag-handle">⋮⋮</span>
      <span class="tree-icon">${icon(component.kind === "actionRow" ? "buttons" : component.kind)}</span>
      <span class="tree-copy"><strong>${componentName(component)}</strong><span>${esc(componentSummary(component))}</span></span>
    </button>`;
  }

  function renderPreviewPanel() {
    return `
      <section class="panel preview-panel ${activeMobilePanel === "preview" ? "mobile-active" : ""}">
        <div class="preview-toolbar">
          <span class="panel-title">Live Discord Preview</span>
          <span class="preview-meta">Desktop-focused Components V2 renderer</span>
          <div class="segmented">
            <button class="${state.preview.theme === "dark" ? "active" : ""}" data-action="preview-theme" data-theme="dark">Dark</button>
            <button class="${state.preview.theme === "light" ? "active" : ""}" data-action="preview-theme" data-theme="light">Light</button>
          </div>
          <div class="segmented">
            <button class="${state.preview.device === "desktop" ? "active" : ""}" data-action="preview-device" data-device="desktop">Desktop</button>
            <button class="${state.preview.device === "mobile" ? "active" : ""}" data-action="preview-device" data-device="mobile">Mobile</button>
          </div>
        </div>
        <div class="preview-stage">
          <div>
            <div id="previewContent">${renderDiscordPreview()}</div>
            <div class="preview-warning">Preview targets Discord desktop proportions and current Components V2 behavior. Exact rasterization can vary with Discord client version, theme, UI density, operating system, and the proprietary gg sans font.</div>
          </div>
        </div>
      </section>`;
  }

  function renderDiscordPreview() {
    const avatar = state.message.avatarUrl ? `<img src="${esc(state.message.avatarUrl)}" alt="" onerror="this.style.display='none'">` : esc(initials(state.message.displayName));
    return `<div class="discord-frame ${state.preview.device === "mobile" ? "mobile" : ""}" data-theme="${state.preview.theme}">
      <div class="discord-message">
        <div class="dc-avatar">${avatar}</div>
        <div class="dc-message-main">
          <div class="dc-author-line">
            <span class="dc-author">${esc(state.message.displayName || "Webhook")}</span>
            ${state.message.showAppBadge ? '<span class="dc-app-badge">APP</span>' : ""}
            <span class="dc-timestamp">${esc(state.message.timestamp || "Today at 5:50 PM")}</span>
          </div>
          <div class="dc-components">
            ${state.containers.length ? state.containers.map(renderDiscordContainer).join("") : '<div class="discord-empty">Add a Container to begin.</div>'}
          </div>
        </div>
      </div>
    </div>`;
  }

  function renderDiscordContainer(container) {
    const isSelected = selection.kind === "container" && selection.containerId === container.id;
    const spoilerClass = container.spoiler ? "dc-spoiler-container" : "";
    return `<div class="dc-container ${container.accentEnabled ? "has-accent" : ""} ${isSelected ? "selected-preview" : ""} ${spoilerClass}" style="--accent:${esc(container.accentColor)}" data-preview-kind="container" data-preview-container="${container.id}">
      <div class="dc-container-inner">${container.children.map((component) => renderDiscordComponent(container.id, component)).join("")}</div>
      ${container.spoiler ? '<div class="dc-spoiler-overlay" data-action="reveal-container">SPOILER</div>' : ""}
    </div>`;
  }

  function renderDiscordComponent(containerId, component) {
    const selected = selection.kind === "component" && selection.componentId === component.id;
    const attrs = `class="dc-component preview-selectable ${selected ? "preview-selected" : ""}" data-preview-kind="component" data-preview-container="${containerId}" data-preview-component="${component.id}"`;
    switch (component.kind) {
      case "text":
        return `<div ${attrs}>${renderDiscordMarkdown(component.content)}</div>`;
      case "section":
        return `<div ${attrs}><div class="dc-section"><div class="dc-section-content">${component.texts.map((text) => renderDiscordMarkdown(text)).join("")}</div>${renderAccessory(component.accessory)}</div></div>`;
      case "separator":
        return `<div ${attrs}><div class="dc-separator ${component.spacing === 2 ? "large" : "small"}">${component.divider ? '<div class="dc-separator-line"></div>' : ""}</div></div>`;
      case "gallery":
        return `<div ${attrs}>${renderGallery(component)}</div>`;
      case "file":
        return `<div ${attrs}>${renderFile(component)}</div>`;
      case "actionRow":
        return `<div ${attrs}><div class="dc-action-row">${component.mode === "select" ? renderSelect(component.select) : component.buttons.map(renderButton).join("")}</div></div>`;
      default:
        return "";
    }
  }

  function renderAccessory(accessory) {
    if (!accessory) return "";
    if (accessory.kind === "button") return renderButton(accessory, true);
    const body = accessory.url ? `<img src="${esc(accessory.url)}" alt="${esc(accessory.description || "Thumbnail")}" onerror="this.style.display='none';this.parentElement.classList.add('image-error')">` : "Thumbnail";
    return `<div class="dc-thumbnail ${accessory.spoiler ? "spoiler" : ""}">${body}</div>`;
  }

