# Ground Overlay Atlas Art Record

Generated 2026-10-02 with the built-in image generation tool for the approved
map-density visual update. The user-provided screenshot was treated as a high-level
composition reference for continuous patterned floors, broken borders, and organic
perimeter dressing. No game art, symbols, characters, or exact map layout were copied.

## Shared prompt

```text
Create an original ground-decoration atlas for the {family} biome in a top-down 2.5D Greek-myth roguelite. Use case: reusable in-game terrain overlay sprites. Asset type: transparent raster atlas, exactly 4 columns by 4 rows, sixteen separate ground-plane patches with consistent cell size. Composition reference: the attached inspiration is only a high-level guide for a believable arena made from connected floor zones, ornamental bands, broken edges and organic perimeter detail; do not reproduce its exact design, symbols, characters, layout or colors. Subject: sixteen distinct broad, walkable surface patches, not stand-alone props. In each cell show a different irregular rectangular or oval patch of {family detail} with a detailed readable center and fractured or organic border; include several inset floor motifs, some edge bands, small scuffs and tasteful scattered debris. Style: original painterly game environment art, rich hand-painted material detail, directional soft shadows that all fall down-right, consistent scale and camera across all cells. Camera: fixed overhead three-quarter view, readable as ground lying flat in a game map. Layout: strict even 4x4 grid; keep every patch fully inside its cell with a small transparent gutter; no overlap between cells. Keep meaningful alpha transparency outside each patch. No text, no labels, no grid lines, no characters, no upright walls, no large isolated rocks, no UI. Each patch must read as a connected piece of floor terrain with a clear walkable center.
```

Transparent background was enabled. The family detail substituted into the prompt was:

| Family | Family detail | Source image | Packaged asset |
|---|---|---|---|
| ash | Cinder-black basalt ground slabs with warm ember seams, scorched ash in the joints, chipped obsidian edges, a few small dark ash scatterings. | `exec-b4df7517-8ed1-4e58-baa0-590302dc26be.png` | `ash-ground-kit.webp` |
| river | Ancient Greek riverbank ground made from blue-grey limestone and silt, thin shallow water pools, damp pebble seams, pale foam trace and worn stepping-stone bands. | `exec-c9f20dbb-9d38-44da-9310-2a29de5b0c70.png` | `river-ground-kit.webp` |
| grove | Ancient grove ground of pale old stone broken by moss, thick surface roots, scattered leaves and tiny restrained blossoms; broad roots frame walkable patches. | `exec-59733631-43e0-49a8-a9aa-34553ea672cc.png` | `grove-ground-kit.webp` |
| fields | Sunlit ancient Greek field paving of cream marble, laurel-leaf mosaic bands, poppy petals, dusty soil seams and small patches of hardy grass. | `exec-4092ba45-35bd-41f7-8f91-6937a58aca72.png` | `fields-ground-kit.webp` |
| lava | Bronze-black volcanic ground with cooled slag plates, obsidian fractures, sparse orange magma glow in deep cracks and heat-darkened stone transitions. | `exec-9a53b52b-b95c-4dc9-a0d0-5d602c1e10e9.png` | `lava-ground-kit.webp` |
| ruins | Aged Greek marble ground with faded geometric mosaic fragments, chipped pale flagstones, dusty earth and broken-tile transitions worn by time. | `exec-659ac86a-d33c-48f4-9f54-09d62c1e10d1.png` | `ruins-ground-kit.webp` |
| storm | Dark storm-temple cloudstone ground with blue-grey marble, subtle lightning scoring, rain-slick patches and pale electric traces in hairline cracks. | `exec-c9f361d3-e3e4-45a0-b01e-e4da927fef00.png` | `storm-ground-kit.webp` |
| terraces | High mountain terrace paving in warm sunstone and cool ivory marble, wind-scoured tile bands, sparse olive leaves, cloud-shadow gradients and crisp broken edges. | `exec-d04851f2-c371-4131-b7fd-a4fb53e0b788.png` | `terraces-ground-kit.webp` |

All eight source images measured 4x4 grids with alpha. They were encoded as lossless
WebP and retained as separate assets, rather than modifying the original family kits.
