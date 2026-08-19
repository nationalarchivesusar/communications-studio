"use strict";

/* Keep notification types independent. `sendPing` is now a derived summary
 * flag only; it must never be used to infer or re-enable a role ping. */
normalizeMessageRouting = function normalizeMessageRoutingIndependent(message, identity) {
  if (!message || !identity) return;

  const allowedChannels = identity.channels || [];
  if (!allowedChannels.some((channel) => channel.id === String(message.channelId || ""))) {
    message.channelId = allowedChannels[0]?.id || "";
  }

  const allowedPingKeys = new Set((identity.pingOptions || []).map((ping) => ping.key));
  const pingKeys = Array.isArray(message.pingKeys) ? message.pingKeys.map(String) : [];
  message.pingKeys = [...new Set(pingKeys.filter((key) => allowedPingKeys.has(key)))];
  message.pingEveryone = Boolean(message.pingEveryone && identity.allowEveryone);

  const hasUserPings = Array.isArray(message.userPings) && message.userPings.length > 0;
  message.sendPing = message.pingKeys.length > 0 || message.pingEveryone || hasUserPings;
};
