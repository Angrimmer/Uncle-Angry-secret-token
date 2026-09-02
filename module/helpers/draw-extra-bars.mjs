import { getExtraBars } from "./extra-bars-store.mjs";

// Matches core's own `8 * heightMultiplier * uiScale` in Token#_drawBar
// (client/canvas/placeables/token.mjs).
const BASE_BAR_HEIGHT = 8;
// Small visual gap between stacked bars so they read as distinct even when
// their colors are close - without it, a bar sitting flush against its
// neighbour with a similar palette can look like it "melts" into it.
const STACK_GAP = 2;

/**
 * Grows/shrinks token.bars.uastExtra to match extraBars.length, creating or
 * destroying PIXI.Graphics as needed. Called from both drawToken and
 * refreshToken so a row added/removed via the config dialog while the
 * token is already on canvas is picked up without needing a full redraw.
 * token.bars is guaranteed to exist by the time either hook fires - it's
 * built synchronously in Token#_draw() (#drawAttributeBars), and
 * drawToken/refreshToken both fire strictly after _draw() completes.
 */
function reconcileGraphics(token, extraBars) {
  const container = token.bars;
  const graphics = (container.uastExtra ??= []);
  while (graphics.length < extraBars.length) {
    graphics.push(container.addChild(new PIXI.Graphics()));
  }
  while (graphics.length > extraBars.length) {
    const removed = graphics.pop();
    container.removeChild(removed);
    removed.destroy();
  }
  return graphics;
}

/**
 * Resolves {value, max} regardless of source - "attribute" bars read a live
 * actor attribute via getBarAttribute (Foundry's own documented bypass for
 * an arbitrary path, no real bar3/bar4 schema field needed), "manual" bars
 * just read their own stored value/max directly, since they have no actor
 * attribute at all. Takes the TokenDocument (not the placeable) since
 * that's all it ever needs - shared with module/helpers/token-hud-ui.mjs,
 * which only has the document handy, not a placeable.
 */
export function resolveBarData(tokenDoc, entry) {
  const source = entry?.source ?? "attribute";
  if (source === "manual") {
    const max = Number(entry.max);
    const value = Number(entry.value);
    if (!Number.isFinite(max) || max <= 0 || !Number.isFinite(value)) return null;
    return { value, max };
  }
  if (!entry?.attribute) return null;
  const data = tokenDoc.getBarAttribute("", { alternative: entry.attribute });
  if (!data || data.type !== "bar" || !data.max) return null;
  return data;
}

export function onDrawToken(token) {
  reconcileGraphics(token, getExtraBars(token.document));
}

export function onRefreshToken(token, flags) {
  const extraBars = getExtraBars(token.document);
  const graphics = reconcileGraphics(token, extraBars);

  // A non-owner never sees any real number - native bar1/bar2 included.
  // Core's own drawBars() has no ownership check of its own (unconditional
  // bar.visible = true), so this is the only place anything hides them; the
  // hover-status tooltip (hover-status.mjs) is what replaces them instead.
  // token.isOwner already short-circuits true for any GM.
  if (!token.isOwner) {
    token.bars.bar1.visible = false;
    token.bars.bar2.visible = false;
    graphics.forEach(g => (g.visible = false));
    return;
  }

  if (!graphics.length) return;

  // Same overall gate Token#drawBars() itself uses - keep our extra bars
  // in lockstep with whether core would even attempt to draw bar1/bar2.
  if (!token.actor || token.document.displayBars === CONST.TOKEN_DISPLAY_MODES.NONE) {
    graphics.forEach(g => (g.visible = false));
    return;
  }
  if (!flags?.refreshBars) return;

  const { width, height } = token.document.getSize();
  const s = canvas.dimensions.uiScale;
  const bh = BASE_BAR_HEIGHT * (token.document.height >= 2 ? 1.5 : 1) * s;
  // Fallback when a bar has no custom colors set - core's own bar2 palette.
  const defaultColors = CONFIG.Token.barConfig.bar2.colors;

  // Two independent stacks, since the "right" side depends on the token's
  // own art (a token with a decorative frame close to one edge may only
  // have clean room on the other side) - chosen per bar via entry.side.
  let bottomStackIndex = 0; // beneath bar1 (bar1 occupies y in [height-bh, height])
  let topStackIndex = 0; // above bar2 (bar2 occupies y in [0, bh])

  for (let i = 0; i < extraBars.length; i++) {
    const bar = graphics[i];
    const entry = extraBars[i];
    const data = resolveBarData(token.document, entry);
    if (!data) {
      bar.visible = false;
      continue;
    }

    const pct = Math.clamp(data.value, 0, data.max) / data.max;
    const empty = entry.colorEmpty ? foundry.utils.Color.from(entry.colorEmpty) : defaultColors.empty;
    const full = entry.colorFull ? foundry.utils.Color.from(entry.colorFull) : defaultColors.full;
    const color = foundry.utils.Color.mix(empty, full, pct);

    bar.clear();
    bar.lineStyle(s, 0x000000, 1.0);
    bar.beginFill(0x000000, 0.5).drawRoundedRect(0, 0, width, bh, 3 * s);
    bar.beginFill(color, 1.0).drawRoundedRect(0, 0, pct * width, bh, 2 * s);

    // A small STACK_GAP keeps stacked extra bars from reading as merged
    // into one another (or into bar1/bar2) even when colors are close, or
    // when the token's own art has a frame right at that edge.
    if (entry.side === "top") {
      bar.position.set(0, -(topStackIndex + 1) * (bh + STACK_GAP));
      topStackIndex++;
    } else {
      bar.position.set(0, height + STACK_GAP + bottomStackIndex * (bh + STACK_GAP));
      bottomStackIndex++;
    }
    bar.visible = true;
  }
}
