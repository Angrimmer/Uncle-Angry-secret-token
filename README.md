# Uncle Angry Secret Token

*[Read this in English](README.en.md)*

Module Foundry VTT (v13/v14) qui permet d'ajouter autant de barres de ressource supplémentaires que voulu sur un token, au-delà des deux barres natives. Indépendant de tout système de jeu.

## Fonctionnalités

- **Barres liées à un attribut** — n'importe quel attribut suivi de la fiche liée au token (santé, mana, une ressource propre à votre système...), pas seulement les deux barres natives.
- **Compteurs manuels** — une barre dont la valeur et le maximum ne dépendent d'aucun attribut de fiche, pour des ressources qui n'existent que sur ce token (jauge de combo, points de vie temporaires...).
- **Édition en direct depuis le HUD du token** — comme les barres natives, chaque barre supplémentaire se modifie d'un clic dans le HUD, avec la même syntaxe (`+5`, `-3`, `=10`, `50%`).
- **Couleur et positionnement personnalisables** — couleur à vide/pleine par barre, empilée au-dessus ou en dessous des barres natives selon votre choix.
- **Statut narratif au survol** — pour un joueur qui n'est pas propriétaire du token, aucune barre (natives comprises) ne s'affiche ; survoler le token montre à la place un texte qualitatif configurable par barre (par exemple : « En bon état » → « Ne tient qu'à un fil »), sur deux axes possibles (Vie / Énergie). Le propriétaire et le MJ voient toujours les vrais chiffres.

## Utilisation

Tout se configure depuis la fenêtre de configuration du token (icône ⚙ ou clic droit → Configurer), onglet **Ressources** — aussi bien sur un token déjà placé que sur le Token de base d'un Acteur (les nouveaux tokens glissés depuis cet acteur hériteront alors de la configuration).

## Compatibilité

- Foundry VTT v13 et v14.
- Aucune dépendance à un système de jeu précis.

## Installation

Dans Foundry, onglet **Modules complémentaires** → **Installer un module**, puis collez cette URL de manifest :

```
https://github.com/Angrimmer/Uncle-Angry-secret-token/releases/latest/download/module.json
```

Vous pouvez aussi télécharger la dernière version depuis l'onglet [Releases](../../releases) de ce dépôt et l'extraire dans votre dossier `Data/modules`.

## Pourquoi ce module

Foundry limite chaque token à exactement deux barres de ressource. J'en avais besoin de plus pour certains personnages avec des mécaniques bien à eux, alors j'ai construit ce module pour lever cette limite — sans toucher au cœur de Foundry, juste par-dessus.

L'idée du statut narratif au survol — permettre aux alliés de vérifier l'état de leurs compagnons sans voir leurs vraies barres — m'a été inspirée par un autre module dont je ne me souviens malheureusement plus le nom.

## Langues

Français (complet), anglais (complet).

## Retours et suggestions

Toute suggestion ou retour d'expérience est le bienvenu, n'hésitez pas à ouvrir une [issue](../../issues).

## Soutenir le projet

Si ce module vous a été utile, un petit coup de pouce sur [Ko-fi](https://ko-fi.com/angrimmer) fait toujours plaisir. Aucune obligation, bien sûr !
