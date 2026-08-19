"use strict";

/* Final managed-footer attribution. This line is preview-only client data;
 * production publishing re-derives the Discord username from the authenticated
 * backend session so the poster attribution cannot be edited or spoofed. */
function studioDiscordUsername() {
  return studioCleanLine(
    session?.user?.discord?.username || session?.discord?.username || "Discord username",
    100
  ).replace(/^@+/, "");
}

studioFooterPayloadText = function studioFooterPayloadTextWithPoster(identity = currentPublishingIdentity()) {
  const roleplay = studioRoleplayName();
  const roblox = studioRobloxUsername();
  const discord = studioDiscordUsername();
  const lines = [];
  if (roleplay) {
    lines.push(`*${roleplay}*`);
    if (roblox && roblox.toLowerCase() !== roleplay.toLowerCase()) lines.push(`-# ${roblox}`);
  } else {
    lines.push(`*${roblox}*`);
  }
  lines.push(`-# ${studioOfficeEmoji(identity)} ${studioPosition(identity)}`);
  lines.push(`-# Posted by @${discord}`);
  return lines.join("\n");
};
