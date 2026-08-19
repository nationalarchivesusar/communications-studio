"use strict";

/* Final managed-header typography: normal-size bold office/title with the
 * identity-owned emoji, followed by Discord subtext address lines. */
studioHeaderPayloadText = function studioHeaderPayloadTextCompact(identity = currentPublishingIdentity()) {
  const lines = [
    `${studioOfficeEmoji(identity)} | **${studioHeaderTitle(identity)}**`,
    `-# ${studioAddressLine1()}`,
    `-# ${studioAddressLine2()}`
  ];
  const mentions = [
    ...(state?.message?.pingEveryone ? ["@everyone"] : []),
    ...studioRolePings(identity).map((ping) => `<@&${ping.id}>`),
    ...studioUserPings().map((user) => `<@${user.id}>`)
  ];
  if (mentions.length) lines.push(`-# cc: ${mentions.join(" ")}`);
  return lines.join("\n");
};

studioHeaderPreviewHtml = function studioHeaderPreviewHtmlCompact(identity = currentPublishingIdentity()) {
  const mentions = studioMentionPreviewItems(identity);
  const address1 = studioAddressLine1() || "Address line 1";
  const address2 = studioAddressLine2() || "Address line 2";
  const title = `${studioOfficeEmoji(identity)} | **${studioHeaderTitle(identity)}**`;
  const cc = mentions.length
    ? `<div class="dc-subtext managed-cc">cc: ${mentions.map((item) => `<span class="dc-mention">${esc(item.label)}</span>`).join(" ")}</div>`
    : "";
  return `<div class="dc-component managed-framing managed-header">
    <div class="dc-markdown">
      <p>${renderInline(title)}</p>
      <div class="dc-subtext">${esc(address1)}</div>
      <div class="dc-subtext">${esc(address2)}</div>
      ${cc}
    </div>
  </div>`;
};
