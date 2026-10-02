# Six Greek Regions and the Last Road to Olympus

**Status:** Approved for implementation
**Date:** 2026-09-30

## Goal

Extend the mandatory campaign from 18 to 24 Greek-myth regions and give each added region a distinct image backdrop, a unique staged boss, a cutscene with mythic figures, and a meaningful choice before Olympus and Typhon.

## Locked scope

Insert the following six regions after Gigantomachy and before Olympus Approach, in this order:

1. Delphi — Pytho, the Oracle Serpent (delphi_python)
2. Pelion — Nessus, the Centaur Ambusher (pelion_nessus)
3. Arcadia — Erymanthian Boar (arcadia_boar)
4. Thebes — Sphinx of the Seven Gates (thebes_sphinx)
5. Marathon — Bull of Marathon (marathon_bull)
6. Mycenae — Tisiphone of the House of Atreus (mycenae_tisiphone)

Every region has eight chambers, a unique final capstone, and one mandatory post-boss campaign chapter. Existing Olympus Approach, Olympus, and Typhon Core remain the final three regions and preserve the ending choice.

## Campaign scenes

- Delphi: Apollo, the Pythia, and the surviving oracle serpent.
- Pelion: Chiron, Heracles, and Nessus.
- Arcadia: Artemis, Pan, and Atalanta.
- Thebes: the Sphinx, Oedipus, and Antigone.
- Marathon: Theseus, Athena, and Heracles.
- Mycenae: Electra, Orestes, and Tisiphone.

Each scene offers the existing two-choice campaign interaction and applies a heal or obol reward through the current story-choice system.

## Art and animation

- Generate six distinct wide raster region backdrops and six unique boss sprite sheets.
- Each boss sheet is transparent, image-based, and arranged as four columns by six rows: idle, movement, wind-up, attack, hurt, and defeat.
- Preserve the project’s painterly mythic-underworld style and actual sprite readability.
- Use generated images for all new illustrations. No geometric or code-drawn game art may stand in for a new asset.
- Reuse existing image-based floor and prop atlases through region-specific art aliases where a matching pack already exists.
- Register each generated image in assets/manifest.json; keep the source and bundled game offline-capable.

## Progression and acceptance

- Keep one-to-one alignment among the 24 regions, 24 capstones, and 24 campaign chapters.
- Keep the six new boss identities and signature attacks distinct.
- Extend tier multipliers across all 24 regions with a gradual monotonic curve.
- Rebuild katabasis.html after source changes.
- Pass the headless smoke test and standalone bundle browser check. Both should confirm the six regions, art references, capstones, story order, image-only sprite definitions, and final campaign ending.
