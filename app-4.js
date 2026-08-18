"use strict";
  function renderGallery(component) {
    const items = component.items || [];
    const visible = items.slice(0, 4);
    const countClass = items.length <= 4 ? `count-${Math.max(1, items.length)}` : "count-many";
    if (!items.length) return '<div class="discord-empty">Media Gallery needs at least one item.</div>';
    return `<div class="dc-gallery ${countClass}">${visible.map((item, index) => {
      const content = item.url ? `<img src="${esc(item.url)}" alt="${esc(item.description || "Media")}" onerror="this.style.display='none'">` : '<div style="display:grid;place-items:center;height:100%;min-height:120px;color:var(--dc-muted);font-size:10px">Media URL</div>';
      const more = index === 3 && items.length > 4 ? `<div class="dc-gallery-more">+${items.length - 4}</div>` : "";
      return `<div class="dc-gallery-item ${item.spoiler ? "spoiler" : ""}">${content}${more}</div>`;
    }).join("")}</div>`;
  }

  function renderFile(component) {
    const ext = (component.filename || "FILE").split(".").pop().slice(0, 4).toUpperCase();
    return `<div class="dc-file"><div class="dc-file-icon">${esc(ext)}</div><div class="dc-file-copy"><div class="dc-file-name">${esc(component.filename || "attachment")}</div><div class="dc-file-size">${esc(component.sizeLabel || "Attachment")}</div></div></div>`;
  }

  function renderSelect(menu) {
    if (!menu) return "";
    const label = menu.placeholder || ({ 3: "Make a selection", 5: "Select users", 6: "Select roles", 7: "Select users or roles", 8: "Select channels" })[Number(menu.type)] || "Make a selection";
    return `<button type="button" class="dc-select ${menu.disabled ? "disabled" : ""}" ${menu.disabled ? "disabled" : ""}><span>${esc(label)}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5"/></svg></button>`;
  }

  function renderButton(button, accessory = false) {
    const styles = { 1: "primary", 2: "secondary", 3: "success", 4: "danger", 5: "link", 6: "secondary" };
    const external = button.style === 5 ? icon("external") : "";
    const emoji = button.emoji ? `<span>${esc(button.emoji)}</span>` : "";
    return `<button class="dc-button ${styles[button.style] || "secondary"} ${button.disabled ? "disabled" : ""}" type="button" ${button.disabled ? "disabled" : ""} ${accessory ? 'style="align-self:start"' : ""}>${emoji}<span>${esc(button.label || "Button")}</span>${external}</button>`;
  }

  function renderDiscordMarkdown(raw) {
    const source = String(raw || "").replace(/\r\n/g, "\n");
    const fences = [];
    let text = source.replace(/```([\w+-]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      const token = `\u0000FENCE${fences.length}\u0000`;
      fences.push(`<pre><code${lang ? ` data-language="${esc(lang)}"` : ""}>${esc(code.replace(/\n$/, ""))}</code></pre>`);
      return token;
    });
    const lines = text.split("\n");
    const out = [];
    let listType = null;
    let listItems = [];
    const flushList = () => {
      if (!listType) return;
      out.push(`<${listType}>${listItems.map((item) => `<li>${renderInline(item)}</li>`).join("")}</${listType}>`);
      listType = null;
      listItems = [];
    };
    for (const line of lines) {
      const fenceMatch = line.match(/^\u0000FENCE(\d+)\u0000$/);
      if (fenceMatch) {
        flushList();
        out.push(fences[Number(fenceMatch[1])]);
        continue;
      }
      const bullet = line.match(/^\s*[-*]\s+(.+)$/);
      const numbered = line.match(/^\s*\d+[.)]\s+(.+)$/);
      if (bullet || numbered) {
        const type = bullet ? "ul" : "ol";
        if (listType && listType !== type) flushList();
        listType = type;
        listItems.push((bullet || numbered)[1]);
        continue;
      }
      flushList();
      if (!line.length) {
        out.push('<div class="dc-line-break"><br></div>');
        continue;
      }
      const sub = line.match(/^-#\s?(.*)$/);
      if (sub) {
        out.push(`<div class="dc-subtext">${renderInline(sub[1])}</div>`);
        continue;
      }
      const heading = line.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        const level = heading[1].length;
        out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
        continue;
      }
      const quote = line.match(/^>\s?(.*)$/);
      if (quote) {
        out.push(`<blockquote>${renderInline(quote[1])}</blockquote>`);
        continue;
      }
      out.push(`<p>${renderInline(line)}</p>`);
    }
    flushList();
    return `<div class="dc-markdown">${out.join("")}</div>`;
  }

  function renderInline(raw) {
    const stash = [];
    const hold = (html) => `\u0001${stash.push(html) - 1}\u0001`;
    let text = String(raw || "");

    text = text.replace(/`([^`\n]+)`/g, (_, code) => hold(`<code>${esc(code)}</code>`));
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) => hold(`<a href="${esc(url)}" target="_blank" rel="noreferrer noopener">${renderInline(label)}</a>`));
    text = text.replace(/<(a?):([A-Za-z0-9_]+):(\d+)>/g, (_, animated, name, id) => hold(`<img class="dc-emoji" src="https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "webp"}?size=48&quality=lossless" alt=":${esc(name)}:" title=":${esc(name)}:">`));
    text = text.replace(/<@&(\d+)>/g, (_, id) => hold(`<span class="dc-mention" title="Role ${id}">@role</span>`));
    text = text.replace(/<@(\d+)>/g, (_, id) => hold(`<span class="dc-mention" title="User ${id}">@user</span>`));
    text = text.replace(/<#(\d+)>/g, (_, id) => hold(`<span class="dc-mention" title="Channel ${id}">#channel</span>`));
    text = text.replace(/\|\|(.+?)\|\|/g, (_, spoiler) => hold(`<span class="dc-spoiler" data-action="reveal-spoiler">${renderInline(spoiler)}</span>`));
    text = esc(text);
    text = text.replace(/__(.+?)__/g, "<u>$1</u>");
    text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/~~(.+?)~~/g, "<s>$1</s>");
    text = text.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, "<em>$1</em>");
    text = text.replace(/(?<!_)_([^_]+?)_(?!_)/g, "<em>$1</em>");
    text = text.replace(/\u0001(\d+)\u0001/g, (_, index) => stash[Number(index)] || "");
    return text;
  }

  function renderInspectorPanel() {
    const entity = selectedEntity();
    let content;
    if (selection.kind === "message") content = renderMessageInspector();
    else if (selection.kind === "container") content = renderContainerInspector(entity);
    else content = renderComponentInspector(entity);
    return `
      <aside class="panel inspector-panel ${activeMobilePanel === "inspector" ? "mobile-active" : ""}">
        <div class="panel-header"><span class="panel-title">Properties</span><span class="panel-subtitle">Live</span></div>
        <div class="panel-body inspector-scroll">
          <div id="validationBox">${renderValidation()}</div>
          ${content}
        </div>
      </aside>`;
  }

  function renderValidation() {
    const issues = validateState();
    if (!issues.length) return `<div class="validation-box ok"><strong>Discord payload valid</strong>${countComponents()} of ${MAX_COMPONENTS} components • ${totalTextCharacters().toLocaleString()} text characters.</div>`;
    const errors = issues.filter((issue) => issue.level === "error");
    const top = errors[0] || issues[0];
    return `<div class="validation-box"><strong>${errors.length ? `${errors.length} blocking issue${errors.length === 1 ? "" : "s"}` : "Builder note"}</strong>${esc(top.text)}${issues.length > 1 ? ` <span title="${esc(issues.slice(1).map((issue) => issue.text).join(" • "))}">(+${issues.length - 1} more)</span>` : ""}</div>`;
  }

