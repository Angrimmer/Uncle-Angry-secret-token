import { MODULE_ID, FLAG_EXTRA_BARS } from "./constants.mjs";

/**
 * Reads the extra-bars list for a given document - works on a real
 * TokenDocument OR a PrototypeToken, both expose an identical
 * Document-style getFlag (PrototypeToken#getFlag just delegates to
 * Document.prototype.getFlag.call(this, ...), see common/data/data.mjs).
 */
export function getExtraBars(document) {
  return document?.getFlag(MODULE_ID, FLAG_EXTRA_BARS) ?? [];
}

/**
 * Always send the WHOLE array back. Document#update() replaces
 * array-valued fields wholesale rather than merging element-by-element
 * (expandObject/setProperty only ever build plain nested objects from a
 * dotted path, never arrays) - a dotted-path write into one element would
 * leave stale entries behind after a row is removed. Same convention this
 * project already uses for offerings/relations arrays elsewhere.
 *
 * Bypasses Document#setFlag() on purpose - it always calls update() with no
 * options, which defaults to `render !== false` and re-renders every open
 * sheet for this document (confirmed in Foundry's own source,
 * common/abstract/document.mjs's _onUpdate). That re-render was rebuilding
 * the whole Token Config Resources tab on every single field edit (a color
 * pick, a tier text keystroke), collapsing the tiers <details> and losing
 * focus each time. `render: false` here suppresses that - the
 * config-dialog UI updates itself directly (matching the isolated,
 * one-field-at-a-time save discipline the sibling Journal module's own
 * autosave.mjs already established), and the canvas redraw still happens
 * regardless via the module's own `updateToken` hook, which isn't affected
 * by this option at all (a completely separate dispatch path).
 */
export async function setExtraBars(document, extraBars) {
  return document.update({ [`flags.${MODULE_ID}.${FLAG_EXTRA_BARS}`]: extraBars }, { render: false });
}

/**
 * TokenConfig#token / PrototypeTokenConfig#token both return an
 * uncommitted preview clone (this._preview ?? this.document / this.#prototype)
 * used only to live-render the on-canvas preview while the dialog is open -
 * writing flags there would silently vanish on close. Always resolve to the
 * real, persisted document instead: the TokenDocument itself for a placed
 * token's own config, or the actor's PrototypeToken for the "template"
 * config that future tokens dropped from that actor will inherit.
 */
export function resolvePersistentDocument(app) {
  return app.isPrototype ? app.actor?.prototypeToken : app.document;
}
