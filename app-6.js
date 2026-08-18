"use strict";
  function renderButtonAccessoryInspector(accessory) {
    return `${field("Label", `<input class="text-input" maxlength="80" value="${esc(accessory.label || "Button")}" data-accessory-field="label" data-input-render="preview">`)}
      <div class="field-row">
        ${field("Style", buttonStyleSelect(accessory.style || 5, "data-accessory-field=\"style\""))}
        ${field("Emoji", `<input class="text-input" maxlength="8" value="${esc(accessory.emoji || "")}" data-accessory-field="emoji" data-input-render="preview">`)}
      </div>
      ${(accessory.style || 5) === 5 ? field("URL", `<input class="text-input" value="${esc(accessory.url || "")}" placeholder="https://…" data-accessory-field="url" data-input-render="preview">`) : field("Custom ID", `<input class="text-input" maxlength="100" value="${esc(accessory.customId || "")}" placeholder="action_id" data-accessory-field="customId" data-input-render="preview">`)}
      ${toggleField("Disabled", "Render the accessory button disabled.", Boolean(accessory.disabled), "accessory.disabled")}`;
  }

  function renderSeparatorInspector(component) {
    return `${toggleField("Divider line", "Show a visible horizontal divider in addition to spacing.", component.divider, "component.divider")}
      ${field("Spacing", `<select class="select-input" data-bind="component.spacing"><option value="1" ${component.spacing === 1 ? "selected" : ""}>Small (1)</option><option value="2" ${component.spacing === 2 ? "selected" : ""}>Large (2)</option></select>`, "Discord exposes exactly two separator spacing sizes.")}`;
  }

  function renderGalleryInspector(component) {
    return `<div class="field-group"><div class="field-label">Gallery items <small>${component.items.length}/10</small></div><div class="inline-list">
      ${component.items.map((item, index) => `<div class="inspector-card"><div class="inspector-card-head"><strong>Media ${index + 1}</strong>${component.items.length > 1 ? `<button class="mini-action danger" data-action="gallery-remove" data-item-id="${item.id}">${icon("trash")}</button>` : ""}</div>
        <input class="text-input" placeholder="https://… or attachment://file.png" value="${esc(item.url)}" data-gallery-field="url" data-item-id="${item.id}" data-input-render="preview">
        <input class="text-input" style="margin-top:7px" placeholder="Alt text (optional)" maxlength="1024" value="${esc(item.description)}" data-gallery-field="description" data-item-id="${item.id}" data-input-render="preview">
        <div class="toggle-line" style="margin-top:7px"><div class="toggle-copy"><strong>Spoiler</strong></div><label class="switch"><input type="checkbox" ${item.spoiler ? "checked" : ""} data-gallery-field="spoiler" data-item-id="${item.id}"><span class="switch-slider"></span></label></div>
      </div>`).join("")}
      ${component.items.length < 10 ? '<button class="add-inline-btn" data-action="gallery-add">+ Add media item</button>' : ""}
    </div></div>`;
  }

  function renderFileInspector(component) {
    return `${field("Attachment filename", `<input class="text-input" value="${esc(component.filename)}" placeholder="document.pdf" data-bind="component.filename" data-input-render="preview">`, "Discord File components only accept attachment://filename references. Actual file upload will be connected to the backend later.")}
      ${field("Preview size label", `<input class="text-input" value="${esc(component.sizeLabel || "Attachment")}" data-bind="component.sizeLabel" data-input-render="preview">`, "Visual-only metadata for this frontend preview; Discord supplies the real filename/size after upload.")}
      ${toggleField("File spoiler", "Mark the attached file as a spoiler.", component.spoiler, "component.spoiler")}`;
  }

  function renderActionRowInspector(component) {
    const mode = component.mode === "select" ? "select" : "buttons";
    return `${field("Row contents", `<select class="select-input" data-action="action-row-mode"><option value="buttons" ${mode === "buttons" ? "selected" : ""}>Buttons — up to 5</option><option value="select" ${mode === "select" ? "selected" : ""}>Select menu — exactly 1</option></select>`, "Discord Action Rows contain either up to five buttons or one select menu.")}
      ${mode === "select" ? renderSelectEditor(component.select) : `<div class="field-group"><div class="field-label">Buttons <small>${component.buttons.length}/5</small></div><div class="inline-list">
        ${component.buttons.map((button, index) => renderButtonEditor(button, index, component.buttons.length)).join("")}
        ${component.buttons.length < 5 ? '<button class="add-inline-btn" data-action="button-add">+ Add button</button>' : ""}
      </div></div>`}`;
  }

  function renderSelectEditor(menu) {
    const type = Number(menu?.type) || 3;
    const typeOptions = [[3,"String Select"],[5,"User Select"],[6,"Role Select"],[7,"Mentionable Select"],[8,"Channel Select"]];
    return `<div class="field-group"><div class="field-label">Select type</div><select class="select-input" data-select-field="type">${typeOptions.map(([value,label]) => `<option value="${value}" ${type === value ? "selected" : ""}>${label}</option>`).join("")}</select></div>
      ${field("Placeholder", `<input class="text-input" maxlength="150" value="${esc(menu.placeholder || "")}" placeholder="Choose an option" data-select-field="placeholder" data-input-render="preview">`)}
      ${field("Custom ID", `<input class="text-input" maxlength="100" value="${esc(menu.customId || "")}" placeholder="announcement_select" data-select-field="customId">`, "Interactive component custom_id values must be unique within the message.")}
      <div class="field-row">${field("Minimum", `<input class="text-input" type="number" min="0" max="25" value="${Number(menu.minValues ?? 1)}" data-select-field="minValues">`)}${field("Maximum", `<input class="text-input" type="number" min="1" max="25" value="${Number(menu.maxValues ?? 1)}" data-select-field="maxValues">`)}</div>
      ${toggleField("Disabled", "Render the select menu as disabled.", Boolean(menu.disabled), "actionRow.select.disabled")}
      ${type === 3 ? renderStringSelectOptions(menu) : `<div class="inspector-card"><div class="inspector-card-head"><strong>${selectTypeName(type)}</strong></div><div class="field-help">Discord populates this menu from the current server at interaction time. The preview therefore shows the placeholder rather than fabricated server values.</div></div>`}`;
  }

