import { MODULE_ID, MODULE_TITLE } from "./helpers/constants.mjs";
import { onDrawToken, onRefreshToken } from "./helpers/draw-extra-bars.mjs";
import { onRenderTokenApplication } from "./helpers/token-config-ui.mjs";
import { onRenderTokenHUD } from "./helpers/token-hud-ui.mjs";
import { onHoverToken, onCanvasPan, onCanvasReady } from "./helpers/hover-status.mjs";

Hooks.once("init", () => {
  console.log(`${MODULE_TITLE} | Initialisation`);
});

Hooks.on("drawToken", onDrawToken);
Hooks.on("refreshToken", onRefreshToken);
Hooks.on("renderTokenApplication", onRenderTokenApplication);
Hooks.on("renderTokenHUD", onRenderTokenHUD);
Hooks.on("hoverToken", onHoverToken);
Hooks.on("canvasPan", onCanvasPan);
Hooks.on("canvasReady", onCanvasReady);

/**
 * Core's own Token#_onUpdate only sets the refreshBars render flag when
 * displayBars/bar1/bar2 changed - it has no idea our flag exists, so a
 * flags-only update wouldn't otherwise ever trigger our refreshToken
 * handler. Nudge it ourselves.
 */
Hooks.on("updateToken", (tokenDocument, changed) => {
  if (!changed.flags || !(MODULE_ID in changed.flags)) return;
  tokenDocument.object?.renderFlags.set({ refreshBars: true });
});
