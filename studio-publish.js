"use strict";

let studioPublishRequestInFlight = false;

function studioBodyMentions() {
  const roles = new Set();
  const users = new Set();
  let everyone = false;
  for (const child of state?.containers?.[0]?.children || []) {
    const texts = child.kind === "text" ? [child.content] : child.kind === "section" ? child.texts : [];
    for (const content of Array.isArray(texts) ? texts : []) {
      const value = String(content || "");
      for (const match of value.matchAll(/<@&([0-9]{5,25})>/g)) roles.add(match[1]);
      for (const match of value.matchAll(/<@!?([0-9]{5,25})>/g)) users.add(match[1]);
      if (/(^|[^\w])@(everyone|here)\b/i.test(value)) everyone = true;
    }
  }
  return { roles: [...roles], users: [...users], everyone };
}

function studioBodyRoleButtons(sectionIndex = "") {
  const options = currentPublishingIdentity()?.pingOptions || [];
  if (!options.length) return "";
  return `<div class="field-help">Insert an approved role mention here: ${options.map((ping) => `<button type="button" class="add-inline-btn" style="width:auto;margin:4px 4px 0 0;padding:4px 7px" data-insert-body-role="${esc(ping.id)}" data-role-section-index="${sectionIndex}">${esc(ping.label)}</button>`).join("")}</div>`;
}

const studioTextInspectorBeforeRoleInsertion = renderTextInspector;
renderTextInspector = function renderTextInspectorWithRoleInsertion(component) {
  return studioTextInspectorBeforeRoleInsertion(component).replace("</textarea>", `</textarea>${studioBodyRoleButtons()}`);
};

const studioSectionInspectorBeforeRoleInsertion = renderSectionInspector;
renderSectionInspector = function renderSectionInspectorWithRoleInsertion(component) {
  let index = 0;
  return studioSectionInspectorBeforeRoleInsertion(component).replace(/<\/textarea>/g, () => `</textarea>${studioBodyRoleButtons(index++)}`);
};

app.addEventListener("click", (event) => {
  const button = event.target.closest("[data-insert-body-role]");
  if (!button) return;
  const component = selectedEntity();
  const index = button.dataset.roleSectionIndex;
  const editor = index === ""
    ? document.querySelector(`[data-text-editor="${CSS.escape(component?.id || "")}"]`)
    : document.querySelector(`[data-section-text-index="${index}"]`);
  if (!editor || (component?.kind !== "text" && component?.kind !== "section")) return;
  const insertion = `<@&${button.dataset.insertBodyRole}>`;
  const start = editor.selectionStart;
  const updated = editor.value.slice(0, start) + insertion + editor.value.slice(editor.selectionEnd);
  mutate(() => {
    if (component.kind === "text") component.content = updated;
    else component.texts[Number(index)] = updated;
  });
});

const studioDiscordPayloadBeforeBodyMentions = toDiscordPayload;
toDiscordPayload = function toDiscordPayloadWithBodyMentions() {
  const payload = studioDiscordPayloadBeforeBodyMentions();
  const identity = currentPublishingIdentity();
  const body = studioBodyMentions();
  const approvedRoles = new Set((identity?.pingOptions || []).map((ping) => ping.id));
  payload.allowed_mentions.roles = [...new Set([...(payload.allowed_mentions.roles || []), ...body.roles.filter((id) => approvedRoles.has(id))])];
  payload.allowed_mentions.users = [...new Set([...(payload.allowed_mentions.users || []), ...body.users])];
  if (body.everyone && identity?.allowEveryone) payload.allowed_mentions.parse = ["everyone"];
  return payload;
};

function studioPublishChannel(identity = currentPublishingIdentity()) {
  return (identity?.channels || []).find((channel) => String(channel.id) === String(state?.message?.channelId || "")) || identity?.channels?.[0] || null;
}

function studioPublishNotifications(identity = currentPublishingIdentity()) {
  const items = [];
  const body = studioBodyMentions();
  if (state?.message?.pingEveryone || body.everyone) items.push("@everyone/@here");
  for (const ping of studioRolePings(identity)) items.push(ping.label);
  for (const user of studioUserPings()) items.push(`@${user.display_name || user.username || "user"}`);
  for (const id of body.roles) items.push((identity?.pingOptions || []).find((ping) => ping.id === id)?.label || `<@&${id}>`);
  for (const id of body.users) items.push(`<@${id}>`);
  return [...new Set(items)];
}

function studioPublishErrorLabel(code) {
  const labels = {
    authentication_required: "Your Communications Studio session expired. Sign in again.",
    discord_guild_membership_required: "Your Discord server membership could not be verified.",
    identity_not_authorized: "You are no longer authorized to publish as this office.",
    channel_not_authorized: "That publication channel is not authorized for this office.",
    ping_not_authorized: "One of the selected role notifications is not authorized.",
    everyone_not_authorized: "This office is not authorized to use @everyone.",
    invalid_user_mention: "One of the selected Discord users is invalid.",
    user_mention_not_in_guild: "One of the selected Discord users is no longer in the server.",
    too_many_user_mentions: "Too many individual Discord users are selected.",
    explicit_publish_confirmation_required: "Publishing was blocked because the explicit confirmation latch was not present.",
    required_header_fields_missing: "Complete the required header fields before publishing.",
    required_framing_fields_missing: "Complete the required header and footer fields before publishing.",
    exactly_one_container_required: "The announcement must contain exactly one Container.",
    container_body_required: "Add content to the announcement before publishing.",
    too_many_components: "The announcement exceeds Discord's component limit.",
    file_components_not_allowed: "File components are not enabled for live publishing yet.",
    discord_manage_webhooks_required: "The Communications Studio bot needs Manage Webhooks in that channel.",
    discord_webhook_send_forbidden: "Discord refused the publication webhook in that channel.",
    discord_bot_unavailable: "The Communications Studio Discord bot is unavailable.",
    discord_publish_failed: "Discord rejected the announcement. Check the components and try again.",
    discord_api_error: "Discord returned an error while publishing.",
    invalid_thumbnail_url: "A Section thumbnail needs a valid http/https image URL.",
    invalid_gallery_url: "A Media Gallery item needs a valid http/https media URL.",
    invalid_button_url: "A link button needs a valid http/https URL.",
    select_custom_id_required: "A select menu is missing its custom ID.",
    button_custom_id_required: "An interactive button is missing its custom ID."
  };
  return labels[String(code || "")] || "The announcement could not be published.";
}

function studioOpenPublishConfirmation() {
  if (isBuilderPreviewSession()) {
    toast("Sign in with your connected accounts to publish.", "warn");
    return;
  }
  if (!CONFIG.apiBase) {
    toast("The publication backend is not configured.", "error");
    return;
  }
  const issues = validateState();
  const blocking = issues.find((issue) => issue.level === "error");
  if (blocking) {
    toast(blocking.text || "Fix the blocking issue before publishing.", "error");
    selection = { kind: "message" };
    renderStudio();
    return;
  }
  const identity = currentPublishingIdentity();
  const body = studioBodyMentions();
  if (body.roles.some((id) => !(identity?.pingOptions || []).some((ping) => ping.id === id)) || (body.everyone && !identity?.allowEveryone)) {
    toast("The container contains a notification this office is not authorized to send.", "error");
    return;
  }
  if (new Set([...studioUserPings().map((user) => user.id), ...body.users]).size > STUDIO_MAX_USER_PINGS) {
    toast(`No more than ${STUDIO_MAX_USER_PINGS} individual users may be mentioned.`, "error");
    return;
  }
  modal = { type: "publish-confirm" };
  renderStudio();
}

async function studioSendPublication() {
  if (studioPublishRequestInFlight) return;
  const identity = currentPublishingIdentity();
  const channel = studioPublishChannel(identity);
  if (!identity || !channel) {
    toast("No authorized publishing destination is selected.", "error");
    return;
  }

  studioPublishRequestInFlight = true;
  modal = { type: "publish-progress" };
  renderStudio();

  try {
    const confirmedDocument = clone(state);
    confirmedDocument._publish_confirmation = "explicit-user-confirmation";
    confirmedDocument._publish_action = "publish-now-button";
    const response = await fetch(`${CONFIG.apiBase.replace(/\/$/, "")}/api/publish`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Communications-Studio-Publish": "confirmed"
      },
      body: JSON.stringify({
        confirm_publish: true,
        identity_id: identity.id,
        channel_id: channel.id,
        ping_keys: [...(state.message.pingKeys || [])],
        ping_everyone: Boolean(state.message.pingEveryone),
        user_ping_ids: studioUserPings().map((user) => user.id),
        builder_document: confirmedDocument
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok) {
      const error = new Error(studioPublishErrorLabel(data?.error));
      error.code = data?.error || `http_${response.status}`;
      throw error;
    }
    modal = {
      type: "publish-success",
      messageUrl: String(data.message_url || ""),
      messageId: String(data.message_id || ""),
      channelLabel: channel.label,
      identityLabel: identity.displayName || identity.label
    };
    renderStudio();
    toast("Official communication published to Discord.", "success");
  } catch (error) {
    console.error(error);
    modal = { type: "publish-error", message: error.message || "The announcement could not be published." };
    renderStudio();
  } finally {
    studioPublishRequestInFlight = false;
  }
}

const studioRenderTopbarBeforePublish = renderTopbar;
renderTopbar = function renderTopbarWithPublish() {
  const html = studioRenderTopbarBeforePublish();
  const disabled = isBuilderPreviewSession() || !CONFIG.apiBase;
  const button = `<button class="toolbar-btn primary" data-action="publish" ${disabled ? "disabled" : ""} title="${disabled ? "Sign in to publish" : "Review and explicitly publish this communication to Discord"}"><span>${icon("message")}</span><span class="label">Publish</span></button>`;
  return html.replace('<div class="user-chip">', `${button}<div class="user-chip">`);
};

const studioRenderModalBeforePublish = renderModal;
renderModal = function renderModalWithPublish() {
  if (modal?.type === "publish-confirm") {
    const identity = currentPublishingIdentity();
    const channel = studioPublishChannel(identity);
    const notifications = studioPublishNotifications(identity);
    return `<div class="modal-backdrop" data-action="modal-backdrop"><div class="modal narrow" role="dialog" aria-modal="true">
      <div class="modal-header"><h2>Publish official communication?</h2><button class="modal-close" data-action="modal-close">×</button></div>
      <div class="modal-body">
        <div class="inspector-card" style="margin:0">
          <div class="inspector-card-head"><strong>${esc(identity?.displayName || identity?.label || "Publishing identity")}</strong></div>
          <div class="field-help" style="font-size:11px;line-height:1.65">Destination: <strong>${esc(channel?.label || "Discord channel")}</strong><br>Notifications: <strong>${esc(notifications.length ? notifications.join(", ") : "None — publish silently")}</strong></div>
        </div>
        <p class="field-help" style="font-size:11px;line-height:1.65;margin:12px 0 0"><strong>Nothing is sent automatically.</strong> The message is sent only if you click <strong>Publish now</strong> below. Page loads, draft saves, previews, exports, sign-ins, server restarts, and deployments never publish messages.</p>
        <p class="field-help" style="font-size:11px;line-height:1.65;margin:8px 0 0">After confirmation, Communications Studio re-checks your current authorization and sends the rendered Components V2 message immediately. The office identity, channel, emoji, and allowed mentions are enforced by the server.</p>
      </div>
      <div class="modal-footer"><button class="btn" data-action="modal-close">Cancel</button><button class="btn primary" data-action="publish-confirm-submit">Publish now</button></div>
    </div></div>`;
  }
  if (modal?.type === "publish-progress") {
    return `<div class="modal-backdrop"><div class="modal narrow" role="dialog" aria-modal="true"><div class="modal-header"><h2>Publishing…</h2></div><div class="modal-body"><p class="field-help" style="font-size:11px;line-height:1.65;margin:0">Verifying authorization and sending the official communication to Discord. Do not close this page.</p></div></div></div>`;
  }
  if (modal?.type === "publish-success") {
    return `<div class="modal-backdrop" data-action="modal-backdrop"><div class="modal narrow" role="dialog" aria-modal="true">
      <div class="modal-header"><h2>Published</h2><button class="modal-close" data-action="modal-close">×</button></div>
      <div class="modal-body"><div class="validation-box ok"><strong>Official communication sent</strong>${esc(modal.identityLabel || "Communication")} was published to ${esc(modal.channelLabel || "Discord")}.</div>${modal.messageId ? `<div class="field-help" style="margin-top:10px">Discord message ID: ${esc(modal.messageId)}</div>` : ""}</div>
      <div class="modal-footer"><button class="btn" data-action="modal-close">Close</button>${modal.messageUrl ? `<a class="btn primary" href="${esc(modal.messageUrl)}" target="_blank" rel="noreferrer noopener">Open in Discord</a>` : ""}</div>
    </div></div>`;
  }
  if (modal?.type === "publish-error") {
    return `<div class="modal-backdrop" data-action="modal-backdrop"><div class="modal narrow" role="dialog" aria-modal="true">
      <div class="modal-header"><h2>Publication failed</h2><button class="modal-close" data-action="modal-close">×</button></div>
      <div class="modal-body"><div class="validation-box"><strong>Nothing was sent</strong>${esc(modal.message || "The announcement could not be published.")}</div></div>
      <div class="modal-footer"><button class="btn" data-action="modal-close">Close</button><button class="btn primary" data-action="publish">Try again</button></div>
    </div></div>`;
  }
  return studioRenderModalBeforePublish();
};

const studioHandleClickBeforePublish = handleClick;
handleClick = function handleClickWithPublish(event) {
  const target = event.target.closest?.("button, [data-preview-kind], [data-action]");
  const action = target?.dataset?.action;
  if (action === "publish") {
    event.preventDefault();
    studioOpenPublishConfirmation();
    return;
  }
  if (action === "publish-confirm-submit") {
    event.preventDefault();
    void studioSendPublication();
    return;
  }
  studioHandleClickBeforePublish(event);
};
