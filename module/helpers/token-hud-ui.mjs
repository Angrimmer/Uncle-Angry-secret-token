import { getExtraBars, setExtraBars } from "./extra-bars-store.mjs";
import { resolveBarData } from "./draw-extra-bars.mjs";

const HUD_ROW_CLASS = "uast-hud-bar";

/**
 * Injects one editable row per extra bar into the Token HUD - both sources:
 * "manual" counters (no actor attribute, edited straight into our own flag)
 * and "attribute" bars (edited the same way core edits bar1/bar2, through
 * Actor#modifyTokenAttribute). Positioned to match each bar's own
 * top/bottom side setting: "top" rows stack upward from bar2 (closest bar
 * first), "bottom" rows stack downward from bar1 - same visual order as
 * the bars actually drawn on the token (see draw-extra-bars.mjs).
 */
// Matches core's own --control-size/.col gap (public/css/foundry2.css) -
// .col.middle uses justify-content:space-between on exactly 2 children
// (bar2/bar1) to pin them to the top/bottom edges. Inserting a 3rd child
// there breaks that assumption and redistributes every child's position -
// confirmed live (a 3rd row landed centered over the portrait). Our rows
// are pulled out of that flex flow entirely (position:absolute, see CSS)
// and stacked with this same pixel math instead, independent of however
// many core rows exist.
const CONTROL_SIZE = 35;
const ROW_GAP = 8;

export function onRenderTokenHUD(app, element) {
  element.querySelectorAll(`.${HUD_ROW_CLASS}`).forEach(el => el.remove()); // idempotent re-injection

  const tokenDoc = app.document; // TokenHUD#document is always the real, placed TokenDocument - never a preview
  const middleCol = element.querySelector(".col.middle");
  if (!tokenDoc || !middleCol) return;

  addNativeBarTooltips(tokenDoc, middleCol);

  let topIndex = 0; // stacks upward from bar2, closest bar first - same order as draw-extra-bars.mjs
  let bottomIndex = 0; // stacks downward from bar1

  getExtraBars(tokenDoc).forEach((entry, index) => {
    const data = resolveBarData(tokenDoc, entry);
    if (!data) return; // same hide condition as the drawn bar itself

    const row = buildBarRow(tokenDoc, entry, index, data);
    if (entry.side === "top") {
      row.style.top = `${-(topIndex + 1) * (CONTROL_SIZE + ROW_GAP)}px`;
      topIndex++;
    } else {
      row.style.bottom = `${-(bottomIndex + 1) * (CONTROL_SIZE + ROW_GAP)}px`;
      bottomIndex++;
    }
    middleCol.append(row);
  });
}

function buildBarRow(tokenDoc, entry, index, data) {
  const wrapper = document.createElement("div");
  wrapper.className = `attribute ${HUD_ROW_CLASS}`; // reuses core's own .attribute box styling exactly

  // No separate visible label - native bar1/bar2/elevation don't show one
  // either (just the number, color-coded). A persistent label + input side
  // by side broke the clean single-box alignment (the input's own
  // width:100% rule fights a sibling for space) - the name only shows on
  // hover instead, via the tooltip already set below.
  const labelText = barLabel(entry);

  const input = document.createElement("input");
  input.type = "text";
  input.value = String(data.value);
  // Same idea as core's own bar1 (green)/bar2 (blue) input borders - reuse
  // the bar's own configured color so it's identifiable at a glance rather
  // than blending into every other field.
  input.style.border = `1px solid ${entry.colorFull || entry.colorEmpty || "#d9b568"}`;
  wrapper.dataset.tooltip = `${labelText} (${data.value}/${data.max})`;

  // .attribute > input gets focus-select + Enter-preventDefault-blur for
  // free from BasePlaceableHUD#_postRender, which runs right after this
  // hook on the same render pass. "change" is the one behavior we must
  // hand-roll and guard: deliberately no name attribute (excluded from the
  // host form's own FormData entirely) plus stopPropagation(), so
  // TokenHUD's generic per-field submit path never sees this field and
  // can't write a raw number over the whole bar entry.
  input.addEventListener("change", async event => {
    event.stopPropagation();
    const fresh = await submitBar(tokenDoc, index, entry, data, input.value);
    input.value = String(fresh?.value ?? data.value);
    if (fresh) wrapper.dataset.tooltip = `${labelText} (${fresh.value}/${fresh.max})`;
  });

  wrapper.append(input);
  return wrapper;
}

/**
 * Native bar1/bar2 have no tooltip at all in core (checked the template -
 * plain `<div class="attribute bar2"><input .../></div>`, no data-tooltip
 * anywhere) - give them the same "Label (value/max)" hover hint the
 * module's own bars already have, for consistency.
 */
function addNativeBarTooltips(tokenDoc, middleCol) {
  for (const barKey of ["bar1", "bar2"]) {
    const wrapper = middleCol.querySelector(`.attribute.${barKey}`);
    if (!wrapper) continue;
    const data = tokenDoc.getBarAttribute(barKey); // no alternative -> resolves tokenDoc[barKey].attribute
    if (!data || data.type !== "bar" || !data.max) continue;
    const last = (data.attribute ?? "").split(".").pop() || barKey;
    const label = last.charAt(0).toUpperCase() + last.slice(1);
    wrapper.dataset.tooltip = `${label} (${data.value}/${data.max})`;
  }
}

function barLabel(entry) {
  if ((entry.source ?? "attribute") === "manual") {
    return entry.label || game.i18n.localize("UAST.ExtraBars.ManualBarFallbackLabel");
  }
  const last = (entry.attribute ?? "").split(".").pop() || "?";
  return last.charAt(0).toUpperCase() + last.slice(1);
}

/**
 * Local copy of BasePlaceableHUD#_parseAttributeInput's pure delta/=/%
 * logic (client/applications/hud/placeable-hud.mjs) - reused by copy, not
 * by reaching into core's protected prototype method. Always resolves to a
 * final absolute value (deltas already applied), never a raw delta.
 */
function parseDelta(current, max, input) {
  const isEqual = input.startsWith("=");
  const isDelta = input.startsWith("+") || input.startsWith("-");
  const raw = isEqual ? input.slice(1) : input;
  const v = raw.endsWith("%") ? max * (Number(raw.slice(0, -1)) / 100) : Number(raw);
  if (!Number.isFinite(v)) return current; // bad input -> no-op, matches core's own silent no-op on NaN
  return isDelta ? current + v : v;
}

async function submitBar(tokenDoc, index, entry, data, rawInput) {
  const target = Math.clamp(parseDelta(data.value, data.max, rawInput), 0, data.max);
  const source = entry.source ?? "attribute";

  if (source === "manual") {
    const current = getExtraBars(tokenDoc);
    const fresh = current[index];
    if (!fresh || (fresh.source ?? "attribute") !== "manual") return null; // stale-index guard
    current[index] = { ...fresh, value: target };
    await setExtraBars(tokenDoc, current); // same setFlag -> updateToken -> refreshBars nudge already wired
    return { value: target, max: data.max };
  }

  // Attribute-based: write through the actor, exactly like core's own
  // bar1/bar2 HUD path (TokenHUD#onSubmitBar -> Actor#modifyTokenAttribute).
  // isDelta:false since parseDelta already resolved the final target value.
  await tokenDoc.actor?.modifyTokenAttribute(entry.attribute, target, false, true);
  return { value: target, max: data.max };
}
