"use strict";
  function renderMessageInspector() {
    return `
      <h2 class="inspector-heading">Message</h2><div class="inspector-type">Webhook appearance</div>
      ${field("Display name", `<input class="text-input" value="${esc(state.message.displayName)}" maxlength="80" data-bind="message.displayName" data-input-render="preview">`, "This will become the webhook username when publishing is connected.")}
      ${field("Avatar URL", `<input class="text-input" value="${esc(state.message.avatarUrl)}" placeholder="https://…" data-bind="message.avatarUrl" data-input-render="preview">`, "Use an HTTPS image URL for preview. The backend can later supply the department seal automatically.")}
      ${field("Timestamp label", `<input class="text-input" value="${esc(state.message.timestamp)}" maxlength="64" data-bind="message.timestamp" data-input-render="preview">`)}
      ${toggleField("Application badge", "Show the Discord APP badge beside the webhook name.", state.message.showAppBadge, "message.showAppBadge")}
      ${field("Allowed mentions", `<select class="select-input" data-bind="message.allowedMentions"><option value="none" ${state.message.allowedMentions === "none" ? "selected" : ""}>None — safest default</option><option value="roles" ${state.message.allowedMentions === "roles" ? "selected" : ""}>Approved roles only</option><option value="all" ${state.message.allowedMentions === "all" ? "selected" : ""}>All mentions (backend gated)</option></select>`, "Exported as Discord allowed_mentions. Production role permissions should still be gated by the backend.")}
      <div class="inspector-card"><div class="inspector-card-head"><strong>Draft storage</strong></div><div class="field-help">The builder automatically saves the full editable state to this browser. OAuth/provider credentials are never stored with the draft.</div><button class="add-inline-btn" data-action="confirm-reset" style="margin-top:10px">Start a fresh announcement</button></div>`;
  }

  function renderContainerInspector(container) {
    if (!container) return "";
    return `
      <h2 class="inspector-heading">Container</h2><div class="inspector-type">Component type 17</div>
      ${toggleField("Accent bar", "Show Discord's optional color accent.", container.accentEnabled, "container.accentEnabled")}
      <div class="field-group"><div class="field-label">Accent color <small>${esc(container.accentColor)}</small></div><div class="color-field"><div class="color-swatch"><input type="color" value="${esc(container.accentColor)}" data-bind="container.accentColor" data-input-render="preview"></div><input class="text-input" value="${esc(container.accentColor)}" data-bind="container.accentColor" data-input-render="preview" pattern="#[0-9A-Fa-f]{6}"></div></div>
      ${toggleField("Spoiler", "Blur the full container until it is revealed in Discord.", container.spoiler, "container.spoiler")}
      <div class="inspector-card"><div class="inspector-card-head"><strong>Container contents</strong></div><div class="field-help">${container.children.length} child component${container.children.length === 1 ? "" : "s"}. Discord allows Text Display, Section, Media Gallery, Separator, File, and Action Row children here.</div><button class="add-inline-btn" data-action="open-picker" data-container-id="${container.id}" style="margin-top:10px">+ Add child component</button></div>
      <div class="danger-zone"><button class="danger-button" data-action="delete-container" data-container-id="${container.id}">Delete this container</button></div>`;
  }

  function renderComponentInspector(component) {
    if (!component) return "";
    let body = "";
    switch (component.kind) {
      case "text": body = renderTextInspector(component); break;
      case "section": body = renderSectionInspector(component); break;
      case "separator": body = renderSeparatorInspector(component); break;
      case "gallery": body = renderGalleryInspector(component); break;
      case "file": body = renderFileInspector(component); break;
      case "actionRow": body = renderActionRowInspector(component); break;
    }
    return `<h2 class="inspector-heading">${componentName(component)}</h2><div class="inspector-type">${componentTypeLabel(component.kind)}</div>${body}<div class="danger-zone"><button class="danger-button" data-action="delete-component" data-container-id="${selection.containerId}" data-component-id="${component.id}">Delete this component</button></div>`;
  }

  function componentTypeLabel(kind) {
    return ({ text: "Component type 10", section: "Component type 9", separator: "Component type 14", gallery: "Component type 12", file: "Component type 13", actionRow: "Component type 1" })[kind] || "Component";
  }

  function renderTextInspector(component) {
    const chars = component.content.length;
    return `
      <div class="field-group">
        <div class="field-label">Markdown <small>${chars.toLocaleString()} characters</small></div>
        ${markdownToolbar(component.id)}
        <textarea class="text-area" data-text-editor="${component.id}" data-bind="component.content" data-input-render="preview">${esc(component.content)}</textarea>
        <div class="field-help">Discord Markdown is rendered live, including headings, lists, quotes, subtext, links, inline/code blocks, mentions, spoilers, and custom emoji syntax.</div>
      </div>`;
  }

  function renderSectionInspector(component) {
    const accessory = component.accessory || { kind: "thumbnail" };
    return `
      <div class="field-group"><div class="field-label">Text Displays <small>${component.texts.length}/3</small></div><div class="inline-list">
        ${component.texts.map((text, index) => `<div class="inspector-card"><div class="inspector-card-head"><strong>Text ${index + 1}</strong>${component.texts.length > 1 ? `<button class="mini-action danger" data-action="section-remove-text" data-index="${index}">${icon("trash")}</button>` : ""}</div><textarea class="text-area" style="min-height:86px" data-section-text-index="${index}" data-input-render="preview">${esc(text)}</textarea></div>`).join("")}
        ${component.texts.length < 3 ? '<button class="add-inline-btn" data-action="section-add-text">+ Add Text Display</button>' : ""}
      </div></div>
      ${field("Accessory", `<select class="select-input" data-action="section-accessory-kind"><option value="thumbnail" ${accessory.kind === "thumbnail" ? "selected" : ""}>Thumbnail</option><option value="button" ${accessory.kind === "button" ? "selected" : ""}>Button</option></select>`)}
      ${accessory.kind === "thumbnail" ? renderThumbnailAccessoryInspector(accessory) : renderButtonAccessoryInspector(accessory)}`;
  }

  function renderThumbnailAccessoryInspector(accessory) {
    return `${field("Image URL", `<input class="text-input" placeholder="https://…" value="${esc(accessory.url || "")}" data-accessory-field="url" data-input-render="preview">`)}
      ${field("Alt text", `<input class="text-input" maxlength="1024" value="${esc(accessory.description || "")}" data-accessory-field="description" data-input-render="preview">`)}
      ${toggleField("Thumbnail spoiler", "Blur this image until revealed.", Boolean(accessory.spoiler), "accessory.spoiler")}`;
  }

