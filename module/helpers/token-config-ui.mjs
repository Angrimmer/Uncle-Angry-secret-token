import { getExtraBars, setExtraBars, resolvePersistentDocument } from "./extra-bars-store.mjs";
import { getNativeBars, setNativeBars } from "./native-bars-store.mjs";
import { TIER_COUNT } from "./constants.mjs";

/**
 * TokenConfig and PrototypeTokenConfig share one mixin-produced class
 * literally named "TokenApplication" (TokenApplicationMixin(Base)), so
 * this single hook covers both dialogs' Resources tab - no subclassing
 * of either config class needed.
 */
export function onRenderTokenApplication(app, element, context) {
  const tab = element.querySelector('.tab[data-tab="resources"]');
  if (!tab) return; // Resources part wasn't part of this render pass

  tab.querySelector(".uast-native-bars")?.remove(); // idempotent re-injection
  tab.querySelector(".uast-extra-bars")?.remove();

  const tokenDoc = resolvePersistentDocument(app);
  const rerender = () => app.render({ parts: ["resources"] });
  const nativeSection = buildNativeBarsSection(tokenDoc, rerender);
  const extraSection = buildSection(app, tokenDoc, context);

  const firstFieldset = tab.querySelector("fieldset");
  if (firstFieldset) firstFieldset.before(nativeSection, extraSection);
  else tab.append(nativeSection, extraSection);
}

function buildSection(app, tokenDoc, context) {
  const extraBars = getExtraBars(tokenDoc);

  const section = document.createElement("fieldset");
  section.className = "uast-extra-bars";
  section.innerHTML = `<legend>${game.i18n.localize("UAST.ExtraBars.Legend")}</legend>`;

  extraBars.forEach((entry, index) => section.append(buildRow(app, tokenDoc, context, extraBars, index)));

  const addButton = document.createElement("button");
  addButton.type = "button"; // never submit - must not trigger the host TokenConfig/PrototypeTokenConfig form
  addButton.className = "uast-add-bar";
  addButton.innerHTML = `<i class="fa-solid fa-plus"></i> ${game.i18n.localize("UAST.ExtraBars.Add")}`;
  addButton.addEventListener("click", async () => {
    const current = getExtraBars(tokenDoc);
    current.push({ attribute: null });
    await setExtraBars(tokenDoc, current);
    app.render({ parts: ["resources"] });
  });
  section.append(addButton);

  return section;
}

/**
 * Reads the CURRENT stored entry (not the possibly-stale `entry` closed
 * over at row-build time), merges in one changed field, and writes the
 * whole array back - never replaces the whole entry object, or a change to
 * one field (e.g. side) would silently wipe out another (e.g. colorFull)
 * set moments earlier.
 */
async function patchEntry(tokenDoc, index, patch) {
  const current = getExtraBars(tokenDoc);
  current[index] = { ...current[index], ...patch };
  await setExtraBars(tokenDoc, current);
}

/** Same merge discipline as patchEntry, for the separate bar1/bar2 flag. */
async function patchNativeBar(tokenDoc, barKey, patch) {
  const current = getNativeBars(tokenDoc);
  const merged = { ...current, [barKey]: { ...current[barKey], ...patch } };
  await setNativeBars(tokenDoc, merged);
}

/**
 * Fixed 4 seed phrases (2 for "life" wording, 2 shared as a generic
 * fallback) - a starting point the GM edits, not a fixed vocabulary. Every
 * bar's tiers are fully independent once created (see hover-status.mjs).
 */
function defaultTiersFor(role) {
  const keys = role === "energy"
    ? ["DefaultEnergy1", "DefaultEnergy2", "DefaultEnergy3", "DefaultEnergy4"]
    : ["DefaultLife1", "DefaultLife2", "DefaultLife3", "DefaultLife4"];
  const thresholds = [75, 50, 25, 0];
  return keys.map((key, i) => ({ threshold: thresholds[i], text: game.i18n.localize(`UAST.Tiers.${key}`) }));
}

/**
 * Shared role + tiers editor, used both for native bar1/bar2 and for each
 * extraBars[] row. `config` is whatever object currently holds
 * role/tiers (a nativeBars[barKey] entry, or an extraBars[] entry).
 * `onPatch` persists a partial patch into that same object. `rerender`
 * re-renders the whole Resources tab, needed only when the tiers editor's
 * very presence changes (role picked/cleared), not on every keystroke.
 */
function buildRoleAndTiersField(config, onPatch, rerender) {
  const role = config?.role ?? "";
  const roleSelect = foundry.applications.fields.createSelectInput({
    name: `uast-role-${foundry.utils.randomID()}`,
    // MUST stay an array of {value,label} - a plain {key:label} object
    // isn't iterable and throws, silently aborting this whole section's
    // render (already hit once with the side selector, fixed there too).
    options: [
      { value: "", label: game.i18n.localize("UAST.Roles.None") },
      { value: "life", label: game.i18n.localize("UAST.Roles.Life") },
      { value: "energy", label: game.i18n.localize("UAST.Roles.Energy") }
    ],
    value: role
  });
  roleSelect.dataset.tooltip = game.i18n.localize("UAST.Roles.Legend");
  roleSelect.addEventListener("change", async () => {
    const patch = { role: roleSelect.value || null };
    // Seed default tiers only the first time a role is picked - never
    // clobber tier text the GM already wrote.
    if (roleSelect.value && !config?.tiers) patch.tiers = defaultTiersFor(roleSelect.value);
    await onPatch(patch);
    rerender();
  });

  let tiersBlock = null;
  if (role) {
    const tiers = config.tiers ?? defaultTiersFor(role);
    tiersBlock = document.createElement("details");
    tiersBlock.className = "uast-tiers";
    tiersBlock.innerHTML = `<summary>${game.i18n.localize("UAST.Tiers.Summary")}</summary>`;

    for (let i = 0; i < TIER_COUNT; i++) {
      const tier = tiers[i] ?? { threshold: 0, text: "" };
      const isLast = i === TIER_COUNT - 1;

      const threshold = foundry.applications.fields.createNumberInput({
        name: `uast-tier-threshold-${foundry.utils.randomID()}`,
        value: isLast ? 0 : tier.threshold,
        min: 0,
        max: 100,
        step: 1
      });
      threshold.disabled = isLast; // last slot is always the catch-all (>= 0)
      threshold.addEventListener("change", () => {
        const next = [...(config.tiers ?? tiers)];
        next[i] = { ...next[i], threshold: Number(threshold.value) || 0 };
        onPatch({ tiers: next });
      });

      const text = foundry.applications.fields.createTextInput({
        name: `uast-tier-text-${foundry.utils.randomID()}`,
        value: tier.text ?? ""
      });
      text.addEventListener("change", () => {
        const next = [...(config.tiers ?? tiers)];
        next[i] = { ...next[i], text: text.value };
        onPatch({ tiers: next });
      });

      tiersBlock.append(foundry.applications.fields.createFormGroup({
        label: game.i18n.format("UAST.Tiers.Threshold", { n: i + 1 }),
        input: [threshold, text]
      }));
    }
  }

  return { roleSelect, tiersBlock };
}

function buildNativeBarsSection(tokenDoc, rerender) {
  const native = getNativeBars(tokenDoc);
  const section = document.createElement("fieldset");
  section.className = "uast-native-bars";
  section.innerHTML = `<legend>${game.i18n.localize("UAST.NativeBars.Legend")}</legend>`;

  for (const [barKey, labelKey] of [["bar1", "Bar1Label"], ["bar2", "Bar2Label"]]) {
    const { roleSelect, tiersBlock } = buildRoleAndTiersField(
      native[barKey],
      patch => patchNativeBar(tokenDoc, barKey, patch),
      rerender
    );
    const row = document.createElement("div");
    row.className = "uast-bar-row";
    row.append(foundry.applications.fields.createFormGroup({
      label: game.i18n.localize(`UAST.NativeBars.${labelKey}`),
      input: [roleSelect]
    }));
    if (tiersBlock) row.append(tiersBlock);
    section.append(row);
  }

  return section;
}

function buildRow(app, tokenDoc, context, extraBars, index) {
  const entry = extraBars[index];
  const source = entry.source ?? "attribute";

  const sourceSelect = foundry.applications.fields.createSelectInput({
    name: `uast-extra-bar-source-${index}`,
    options: [
      { value: "attribute", label: game.i18n.localize("UAST.ExtraBars.SourceAttribute") },
      { value: "manual", label: game.i18n.localize("UAST.ExtraBars.SourceManual") }
    ],
    value: source
  });
  sourceSelect.addEventListener("change", async () => {
    const patch = { source: sourceSelect.value };
    // Seed sane defaults on first switch to manual, so the bar isn't
    // immediately hidden by draw-extra-bars.mjs's max<=0 guard while the
    // GM is still filling in the fields.
    if (sourceSelect.value === "manual") {
      const current = getExtraBars(tokenDoc)[index];
      if (typeof current.value !== "number") patch.value = 0;
      if (typeof current.max !== "number") patch.max = 10;
    }
    await patchEntry(tokenDoc, index, patch);
    app.render({ parts: ["resources"] }); // shape change (which fields show) - same rebuild rule as add/remove
  });

  const sourceFields = source === "manual"
    ? buildManualFields(tokenDoc, index, entry)
    : [buildAttributeSelect(tokenDoc, context, index, entry)];

  const side = foundry.applications.fields.createSelectInput({
    name: `uast-extra-bar-side-${index}`,
    // createSelectInput/prepareSelectOptionGroups expects an ARRAY of
    // {value, label} - a plain {key: label} object isn't iterable with
    // for...of and throws, silently aborting the whole section's render.
    options: [
      { value: "bottom", label: game.i18n.localize("UAST.ExtraBars.SideBottom") },
      { value: "top", label: game.i18n.localize("UAST.ExtraBars.SideTop") }
    ],
    value: entry.side === "top" ? "top" : "bottom"
  });
  side.dataset.tooltip = game.i18n.localize("UAST.ExtraBars.SideHint");
  side.addEventListener("change", () => patchEntry(tokenDoc, index, { side: side.value }));

  const colorEmpty = document.createElement("input");
  colorEmpty.type = "color";
  colorEmpty.value = entry.colorEmpty || "#ff0000";
  colorEmpty.dataset.tooltip = game.i18n.localize("UAST.ExtraBars.ColorEmpty");
  colorEmpty.addEventListener("change", () => patchEntry(tokenDoc, index, { colorEmpty: colorEmpty.value }));

  const colorFull = document.createElement("input");
  colorFull.type = "color";
  colorFull.value = entry.colorFull || "#7fff00";
  colorFull.dataset.tooltip = game.i18n.localize("UAST.ExtraBars.ColorFull");
  colorFull.addEventListener("change", () => patchEntry(tokenDoc, index, { colorFull: colorFull.value }));

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "uast-remove-bar inline-control icon fa-solid fa-trash";
  removeButton.dataset.tooltip = game.i18n.localize("UAST.ExtraBars.Remove");
  removeButton.addEventListener("click", async () => {
    const current = getExtraBars(tokenDoc);
    current.splice(index, 1);
    await setExtraBars(tokenDoc, current);
    app.render({ parts: ["resources"] });
  });

  const { roleSelect, tiersBlock } = buildRoleAndTiersField(
    entry,
    patch => patchEntry(tokenDoc, index, patch),
    () => app.render({ parts: ["resources"] })
  );

  const wrapper = document.createElement("div");
  wrapper.className = "uast-bar-row";
  wrapper.append(foundry.applications.fields.createFormGroup({
    label: game.i18n.format("UAST.ExtraBars.Label", { n: index + 1 }),
    input: [sourceSelect, ...sourceFields, side, colorEmpty, colorFull, roleSelect, removeButton]
  }));
  if (tiersBlock) wrapper.append(tiersBlock);
  return wrapper;
}

function buildAttributeSelect(tokenDoc, context, index, entry) {
  const select = foundry.applications.fields.createSelectInput({
    name: `uast-extra-bar-attribute-${index}`, // display-only - persisted via setFlag below, not form submission
    options: context.barAttributes, // same array bar1/bar2 use - stays in sync with the active system's CONFIG.Actor.trackableAttributes
    value: entry.attribute ?? "",
    blank: game.i18n.localize("COMMON.None"),
    valueAttr: "value",
    labelAttr: "label"
  });
  select.addEventListener("change", () => patchEntry(tokenDoc, index, { attribute: select.value || null }));
  return select;
}

function buildManualFields(tokenDoc, index, entry) {
  const label = foundry.applications.fields.createTextInput({
    name: `uast-extra-bar-label-${index}`,
    value: entry.label ?? "",
    placeholder: game.i18n.localize("UAST.ExtraBars.ManualLabelPlaceholder")
  });
  label.addEventListener("change", () => patchEntry(tokenDoc, index, { label: label.value }));

  const value = foundry.applications.fields.createNumberInput({
    name: `uast-extra-bar-value-${index}`,
    value: entry.value ?? 0,
    step: 1
  });
  value.dataset.tooltip = game.i18n.localize("UAST.ExtraBars.ManualValue");
  value.addEventListener("change", () => patchEntry(tokenDoc, index, { value: Number(value.value) || 0 }));

  const max = foundry.applications.fields.createNumberInput({
    name: `uast-extra-bar-max-${index}`,
    value: entry.max ?? 10,
    step: 1,
    min: 0
  });
  max.dataset.tooltip = game.i18n.localize("UAST.ExtraBars.ManualMax");
  max.addEventListener("change", () => patchEntry(tokenDoc, index, { max: Number(max.value) || 0 }));

  return [label, value, max];
}
