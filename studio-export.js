"use strict";

/* Keep the Discord API export strictly Discord-shaped. Publishing metadata is
 * stored in the editable builder state and sent separately by the publisher. */
const studioPayloadWithInternalMetadata = toDiscordPayload;
toDiscordPayload = function toDiscordPayloadForExport() {
  const payload = studioPayloadWithInternalMetadata();
  if (payload && typeof payload === "object") delete payload._studio;
  return payload;
};
