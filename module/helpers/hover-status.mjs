import { getExtraBars } from "./extra-bars-store.mjs";
import { getNativeBars } from "./native-bars-store.mjs";
import { resolveBarData } from "./draw-extra-bars.mjs";

let tooltipEl = null;
let currentHoverToken = null;

function ensureTooltip() {
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.className = "uast-hover-status";
    document.body.append(tooltipEl);
  }
  return tooltipEl;
}

function resolveNativeBarData(tokenDoc, barKey) {
  // No `alternative` - reads tokenDoc[barKey].attribute, exactly like core
  // resolves bar1/bar2 itself.
  const data = tokenDoc.getBarAttribute(barKey);
  if (!data || data.type !== "bar" || !data.max) return null;
  return data;
}

function pickTierText(tiers, basis) {
  if (!Array.isArray(tiers) || !tiers.length) return null;
  const hit = tiers.find(t => basis >= (t?.threshold ?? 0));
  return hit?.text || null;
}

/**
 * Fixed resolution order (bar1, bar2, then extraBars in array order) - the
 * first bar found with a given role wins, later duplicates are silently
 * ignored. No exclusivity enforced in the config UI on purpose: simpler,
 * and a GM accidentally tagging two bars "life" isn't harmful, just means
 * the second one never shows.
 */
function resolveRoleBars(tokenDoc) {
  const candidates = [];
  const native = getNativeBars(tokenDoc);
  for (const barKey of ["bar1", "bar2"]) {
    const cfg = native[barKey];
    if (!cfg?.role) continue;
    const data = resolveNativeBarData(tokenDoc, barKey);
    if (!data) continue;
    candidates.push({ role: cfg.role, tiers: cfg.tiers, data, isManual: false });
  }
  for (const entry of getExtraBars(tokenDoc)) {
    if (!entry.role) continue;
    const data = resolveBarData(tokenDoc, entry);
    if (!data) continue;
    candidates.push({ role: entry.role, tiers: entry.tiers, data, isManual: entry.source === "manual" });
  }

  const result = { life: null, energy: null };
  for (const c of candidates) {
    if (c.role === "life" && !result.life) result.life = c;
    if (c.role === "energy" && !result.energy) result.energy = c;
  }
  return result;
}

/**
 * A percentage makes sense for an attribute-based bar (health-like, scale
 * independent of the actual max), but not for a manual counter with
 * meaningful absolute thresholds (e.g. "exactly 5 of 10 combo points to
 * unleash an attack") - manual bars compare tiers against the raw clamped
 * value instead, native/attribute bars against a 0-100 percentage.
 */
function buildLines(tokenDoc) {
  const { life, energy } = resolveRoleBars(tokenDoc);
  const lines = [];
  for (const entry of [life, energy]) {
    if (!entry) continue;
    const clamped = Math.clamp(entry.data.value, 0, entry.data.max);
    const basis = entry.isManual ? clamped : (clamped / entry.data.max) * 100;
    const text = pickTierText(entry.tiers, basis);
    if (text) lines.push(text);
  }
  return lines;
}

function positionTooltip(token) {
  if (!tooltipEl) return;
  // Same getSize()/center primitives already used in draw-extra-bars.mjs -
  // Token#getSize() (the placeable's own) is deprecated since v13 in favor
  // of TokenDocument#getSize(), which is what's used here.
  const { height } = token.document.getSize();
  const { x, y } = canvas.stage.worldTransform.apply(token.center);
  const scale = canvas.stage.scale.x;
  tooltipEl.style.left = `${x}px`;
  tooltipEl.style.top = `${y - (height * scale) / 2}px`;
}

function hideTooltip() {
  currentHoverToken = null;
  if (tooltipEl) tooltipEl.style.display = "none";
}

/**
 * Non-owners only - owners/GM already see the real bars (draw-extra-bars.mjs
 * hides nothing for them), no need for a narrative substitute. hoverToken
 * fires for anyone regardless of ownership (Token#_canHover only gates on
 * "secret" disposition / mid-drag), so this check has to happen here.
 */
export function onHoverToken(token, hovered) {
  if (!hovered) {
    if (currentHoverToken === token) hideTooltip();
    return;
  }
  if (token.isOwner) return;

  const lines = buildLines(token.document);
  if (!lines.length) return; // no role configured anywhere, or no data - show nothing, not an empty box

  const el = ensureTooltip();
  el.innerHTML = lines.map(line => `<div class="uast-hover-status-line">${foundry.utils.escapeHTML(line)}</div>`).join("");
  currentHoverToken = token;
  positionTooltip(token);
  el.style.display = "block";
}

export function onCanvasPan() {
  if (currentHoverToken) positionTooltip(currentHoverToken);
}

/** Safety net so a tooltip never survives a scene change mid-hover. */
export function onCanvasReady() {
  hideTooltip();
}
