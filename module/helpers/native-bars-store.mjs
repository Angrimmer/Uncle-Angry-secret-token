import { MODULE_ID, FLAG_NATIVE_BARS } from "./constants.mjs";

/**
 * Reads the {bar1, bar2} role/tiers config - bar1/bar2 aren't part of
 * extraBars[] (they're real TokenDocument schema fields, not module data),
 * so they get their own small flag. Same document-resolution rules as
 * extra-bars-store.mjs (see resolvePersistentDocument there).
 */
export function getNativeBars(document) {
  return document?.getFlag(MODULE_ID, FLAG_NATIVE_BARS) ?? {};
}

/**
 * Always send the WHOLE object back, same reasoning as setExtraBars - each
 * bar's own `tiers` is itself an array, so staying consistent with
 * whole-replace avoids ever needing a dotted-path write into a nested array.
 * Bypasses setFlag() for the same `render: false` reason documented in
 * extra-bars-store.mjs - avoids Foundry auto-rebuilding the whole Resources
 * tab (and collapsing the tiers editor) on every single field edit.
 */
export async function setNativeBars(document, nativeBars) {
  return document.update({ [`flags.${MODULE_ID}.${FLAG_NATIVE_BARS}`]: nativeBars }, { render: false });
}
