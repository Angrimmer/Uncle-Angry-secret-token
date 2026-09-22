# Uncle Angry Secret Token

*[Lire ceci en français](README.md)*

A Foundry VTT module (v13/v14) that lets you add as many extra resource bars as you want to a token, beyond the two native ones. System-agnostic.

## Features

- **Attribute-linked bars** — any tracked attribute from the token's linked sheet (health, mana, a resource specific to your own system...), not just the two native bars.
- **Manual counters** — a bar whose value and maximum don't depend on any sheet attribute, for resources that only ever exist on this token (a combo gauge, temporary hit points...).
- **Live editing straight from the token's HUD** — just like the native bars, every extra bar is edited with a click in the HUD, using the same syntax (`+5`, `-3`, `=10`, `50%`).
- **Customisable colour and placement** — empty/full colour per bar, stacked above or below the native bars as you choose.
- **Narrative status on hover** — for a player who doesn't own the token, no bar (native ones included) is ever shown; hovering the token instead displays a qualitative text you configure per bar (for example: "Healthy" → "Hanging by a thread"), across two possible roles (Life / Energy). The owner and the GM always see the real numbers.

## Usage

Everything is configured from the token's own configuration window (⚙ icon or right-click → Configure), **Resources** tab — whether on an already-placed token, or on an Actor's own Prototype Token (new tokens dragged from that actor will then inherit the configuration).

## Compatibility

- Foundry VTT v13 and v14.
- No dependency on any specific game system.

## Installation

In Foundry, go to the **Add-on Modules** tab → **Install Module**, then paste this manifest URL:

```
https://github.com/Angrimmer/Uncle-Angry-secret-token/releases/latest/download/module.json
```

You can also download the latest version from this repository's [Releases](../../releases) tab and extract it into your `Data/modules` folder.

## Why this module

Foundry limits every token to exactly two resource bars. I needed more for some characters with mechanics of their own, so I built this module to lift that limit — without touching Foundry's core, just building on top of it.

The idea behind the narrative status on hover — letting allies check on their companions' condition without seeing their actual bars — was inspired by another module whose name I unfortunately don't remember.

## Languages

French (complete), English (complete).

## Feedback and suggestions

Any suggestion or feedback is welcome, feel free to open an [issue](../../issues).

## Support the project

If this module has been useful to you, a small tip on [Ko-fi](https://ko-fi.com/angrimmer) is always appreciated. No obligation, of course!

As for AI use, it mainly helps me with automation and quality-of-life tasks.
