"use strict";
  function renderStringSelectOptions(menu) {
    return `<div class="field-group"><div class="field-label">Options <small>${menu.options.length}/25</small></div><div class="inline-list">
      ${menu.options.map((option, index) => `<div class="select-option-card"><div class="inspector-card-head"><strong>Option ${index + 1}</strong>${menu.options.length > 1 ? `<button class="mini-action danger" data-action="select-option-remove" data-option-id="${option.id}">${icon("trash")}</button>` : ""}</div>
        <div class="field-row"><input class="text-input" maxlength="100" placeholder="Label" value="${esc(option.label || "")}" data-option-field="label" data-option-id="${option.id}"><input class="text-input" maxlength="100" placeholder="Value" value="${esc(option.value || "")}" data-option-field="value" data-option-id="${option.id}"></div>
        <input class="text-input" style="margin-top:7px" maxlength="100" placeholder="Description (optional)" value="${esc(option.description || "")}" data-option-field="description" data-option-id="${option.id}">
        <div class="field-row" style="margin-top:7px"><input class="text-input" maxlength="8" placeholder="Emoji" value="${esc(option.emoji || "")}" data-option-field="emoji" data-option-id="${option.id}"><label class="toggle-line compact"><div class="toggle-copy"><strong>Default</strong></div><span class="switch"><input type="checkbox" ${option.default ? "checked" : ""} data-option-field="default" data-option-id="${option.id}"><span class="switch-slider"></span></span></label></div>
      </div>`).join("")}
      ${menu.options.length < 25 ? '<button class="add-inline-btn" data-action="select-option-add">+ Add option</button>' : ""}
    </div></div>`;
  }

  function renderButtonEditor(button, index, total) {
    return `<div class="inspector-card"><div class="inspector-card-head"><strong>Button ${index + 1}</strong>${total > 1 ? `<button class="mini-action danger" data-action="button-remove" data-button-id="${button.id}">${icon("trash")}</button>` : ""}</div>
      <div class="field-row"><input class="text-input" maxlength="80" placeholder="Button label" value="${esc(button.label)}" data-button-field="label" data-button-id="${button.id}" data-input-render="preview">${buttonStyleSelect(button.style, `data-button-field="style" data-button-id="${button.id}"`)}</div>
      <input class="text-input" style="margin-top:7px" maxlength="8" placeholder="Emoji (optional)" value="${esc(button.emoji || "")}" data-button-field="emoji" data-button-id="${button.id}" data-input-render="preview">
      ${button.style === 5 ? `<input class="text-input" style="margin-top:7px" placeholder="https://…" value="${esc(button.url || "")}" data-button-field="url" data-button-id="${button.id}" data-input-render="preview">` : `<input class="text-input" style="margin-top:7px" maxlength="100" placeholder="custom_id (backend interaction)" value="${esc(button.customId || "")}" data-button-field="customId" data-button-id="${button.id}" data-input-render="preview">`}
      <div class="toggle-line" style="margin-top:7px"><div class="toggle-copy"><strong>Disabled</strong></div><label class="switch"><input type="checkbox" ${button.disabled ? "checked" : ""} data-button-field="disabled" data-button-id="${button.id}"><span class="switch-slider"></span></label></div>
    </div>`;
  }

  function buttonStyleSelect(value, attrs = "") {
    const labels = [[1,"Primary"],[2,"Secondary"],[3,"Success"],[4,"Danger"],[5,"Link"]];
    return `<select class="select-input" ${attrs}>${labels.map(([style, label]) => `<option value="${style}" ${Number(value) === style ? "selected" : ""}>${label}</option>`).join("")}</select>`;
  }

  function markdownToolbar(componentId) {
    return `<div class="markdown-tools">
      <button class="markdown-tool" data-action="markdown-wrap" data-component-id="${componentId}" data-before="**" data-after="**" title="Bold">B</button>
      <button class="markdown-tool" data-action="markdown-wrap" data-component-id="${componentId}" data-before="*" data-after="*" title="Italic"><em>I</em></button>
      <button class="markdown-tool" data-action="markdown-wrap" data-component-id="${componentId}" data-before="__" data-after="__" title="Underline"><u>U</u></button>
      <button class="markdown-tool" data-action="markdown-wrap" data-component-id="${componentId}" data-before="&#96;" data-after="&#96;" title="Inline code">&lt;/&gt;</button>
      <button class="markdown-tool" data-action="markdown-prefix" data-component-id="${componentId}" data-prefix="# " title="Heading">H1</button>
      <button class="markdown-tool" data-action="markdown-prefix" data-component-id="${componentId}" data-prefix="> " title="Quote">❯</button>
      <button class="markdown-tool" data-action="markdown-prefix" data-component-id="${componentId}" data-prefix="-# " title="Subtext">-#</button>
    </div>`;
  }

  function field(label, control, help = "") {
    return `<div class="field-group"><div class="field-label">${label}</div>${control}${help ? `<div class="field-help">${help}</div>` : ""}</div>`;
  }

  function toggleField(label, description, checked, binding) {
    return `<div class="field-group"><div class="toggle-line"><div class="toggle-copy"><strong>${label}</strong><span>${description}</span></div><label class="switch"><input type="checkbox" ${checked ? "checked" : ""} data-bind="${binding}"><span class="switch-slider"></span></label></div></div>`;
  }

  function renderModal() {
    if (modal.type === "picker") return renderPickerModal();
    if (modal.type === "export") return renderExportModal();
    if (modal.type === "import") return renderImportModal();
    if (modal.type === "confirm-reset") return renderResetModal();
    return "";
  }

  function renderPickerModal() {
    const choices = [
      ["text", "Text Display", "Markdown-formatted text content."],
      ["section", "Section", "1–3 text blocks beside a thumbnail or button."],
      ["separator", "Separator", "Vertical spacing with an optional divider."],
      ["gallery", "Media Gallery", "A responsive gallery containing 1–10 media items."],
      ["file", "File", "Display one uploaded attachment."],
      ["actionRow", "Action Row", "Up to five interactive or link buttons."]
    ];
    return `<div class="modal-backdrop" data-action="modal-backdrop"><div class="modal narrow" role="dialog" aria-modal="true"><div class="modal-header"><h2>Add a component</h2><button class="modal-close" data-action="modal-close">×</button></div><div class="modal-body"><div class="picker-grid">${choices.map(([kind,name,desc]) => `<button class="picker-item" data-action="picker-add" data-kind="${kind}" data-container-id="${modal.containerId}"><span class="picker-icon">${icon(kind === "actionRow" ? "buttons" : kind)}</span><strong>${name}</strong><span>${desc}</span></button>`).join("")}</div></div></div></div>`;
  }

  function renderExportModal() {
    const payload = JSON.stringify(toDiscordPayload(), null, 2);
    const stateJson = JSON.stringify(state, null, 2);
    const showBuilder = modal.mode === "builder";
    return `<div class="modal-backdrop" data-action="modal-backdrop"><div class="modal" role="dialog" aria-modal="true"><div class="modal-header"><h2>Export</h2><button class="modal-close" data-action="modal-close">×</button></div><div class="modal-body"><div class="segmented" style="margin-bottom:12px"><button class="${!showBuilder ? "active" : ""}" data-action="export-mode" data-mode="discord">Discord API</button><button class="${showBuilder ? "active" : ""}" data-action="export-mode" data-mode="builder">Editable Builder</button></div><textarea class="code-output" readonly id="exportOutput">${esc(showBuilder ? stateJson : payload)}</textarea></div><div class="modal-footer"><button class="btn" data-action="copy-export">Copy JSON</button><button class="btn primary" data-action="download-export">Download ${showBuilder ? "builder" : "payload"}.json</button></div></div></div>`;
  }

