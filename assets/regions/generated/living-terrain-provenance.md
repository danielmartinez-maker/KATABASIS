# Living Terrain Art Provenance

Eight original biome atlases were generated with the OpenAI ImageGen game-asset workflow on 2026-10-02 and copied unchanged from the generator output directory into this project. The reference image was used only for high-level map density, path contrast, patterned floorwork, and atmosphere. The generated art uses new silhouettes and compositions.

Reference supplied in the task: `C:\Users\dmcfu\AppData\Local\Temp\codex-clipboard-23905523-53ea-45ab-89dc-0e5a072a78ea.png`.

## Shared seven-family prompt

The following exact prompt body was sent once per family. `${family.palette}` and `${family.cells}` were replaced with the corresponding values in the table below; the resulting fully resolved prompt is therefore recoverable for every atlas.

```text
Create an ORIGINAL square transparent 4-by-4 sprite atlas for a Greek-myth action roguelite, one square terrain cell per slot (16 total), evenly aligned into four rows and four columns with no visible grid. Keep a clean gutter and keep each painted silhouette, shadow, and detail entirely inside its own cell; do not let neighboring cells touch. Every cell is a large readable top-down 2.5D terrain formation viewed at one consistent elevated isometric angle, with hand-painted brush texture, carved side faces, a grounded cast shadow, and transparent empty space around its silhouette. Use consistent scale, lighting from the upper left, rich layered edges, fine Greek geometric ornament only where it belongs on masonry, and clear separation between walkable surfaces and vertical cliff faces. Family palette: ${family.palette}. Fill the atlas row-major with: ${family.cells}. The attached image is a visual reference only for intricate map density, contrasting playable paths, patterned stone floorwork, and atmospheric lighting. Invent all shapes and motifs; do not reproduce the image's characters, spell circle, room layout, symbols, or composition. No people, weapons, interface, text, complete screenshot, floor plane, logos, or watermark. Original landscape art for an offline game atlas.
```

| Family | Exact palette substitution | Exact row-major cell substitution |
|---|---|---|
| river | deep teal and blue-black stone, moonlit silver-blue water, saltstone ivory highlights, restrained turquoise caustics, subtle bronze lamps | 0 shallow tidal basin edged by saltstone, 1 broken sea-cliff ridge, 2 narrow sea ravine, 3 flowing river channel with foam at its rim, 4 tidepool island, 5 stepped coastal terrace, 6 mossy river rootbank, 7 drowned quay ruins, 8 saltstone shelf, 9 pebbled ferry bank, 10 descending shore ramp, 11 worn ferry stairs, 12 stone bridge above dark water, 13 sea-worn causeway, 14 driftwood and shell rubble, 15 scattered saltstone chips and foam |
| grove | deep cypress green, moss, muted jade, warm bark, pale blossom and small firefly-gold lights | 0 spring basin ringed by moss, 1 cypress-root ridge, 2 fern-filled ravine, 3 narrow stream channel, 4 root-bound island, 5 soft earthen terrace, 6 giant exposed rootbank, 7 vine-draped shrine ruin, 8 mossy stone shelf, 9 flowered stream bank, 10 rootwoven ramp, 11 natural root steps, 12 arched living-root bridge, 13 worn woodland causeway, 14 old stump and stone rubble, 15 leaf litter, petals and small stones |
| fields | limestone cream, laurel green, poppy red, dry gold, muted rose and warm sunlight | 0 shallow spring basin with laurel rim, 1 chalky limestone ridge, 2 dry ravine with grass, 3 irrigation channel, 4 poppy-covered island, 5 stepped marble terrace, 6 laurel rootbank, 7 fallen field shrine, 8 carved limestone shelf, 9 grass and poppy bank, 10 worn field ramp, 11 shallow marble stairs, 12 modest stone footbridge, 13 runner's causeway, 14 broken urn and limestone rubble, 15 fallen leaves, poppy petals and chalk fragments |
| lava | black obsidian, molten bronze, slag red, furnace orange, smoky charcoal and aged brass | 0 cooling magma basin with bright inner fissures, 1 jagged obsidian ridge, 2 slag-cut ravine, 3 narrow molten channel, 4 basalt island with bronze seams, 5 foundry terrace, 6 ember-black rootbank, 7 collapsed bronze-smith shrine, 8 elevated basalt shelf, 9 cooled slag bank, 10 hammered bronze-and-stone ramp, 11 basalt forge steps, 12 heavy bridge over a safe lava runnel, 13 worn foundry causeway, 14 slag and bronze rubble, 15 scattered glowing cinders and obsidian shards |
| ruins | cool marble, faded terracotta, charcoal grout, worn ivory, dusty violet shadows and modest bronze | 0 sunken marble court basin, 1 broken column ridge, 2 collapsed corridor ravine, 3 tiled drainage channel, 4 ivy-ringed courtyard island, 5 layered temple terrace, 6 root-split retaining bank, 7 collapsed pediment and columns, 8 fractured mosaic shelf, 9 worn courtyard bank, 10 chipped marble ramp, 11 broad temple stair, 12 ruined arch bridge, 13 patterned processional causeway, 14 broken column rubble, 15 mosaic chips, pottery and stone fragments |
| storm | cloudstone slate, deep navy, storm teal, pale lightning blue, muted bronze, bright cloud edges | 0 cloud-shadow basin rim, 1 titan-stone ridge, 2 split thunder ravine, 3 rainwater channel, 4 hovering storm-swept island, 5 cloudstone terrace, 6 wind-bent rootbank, 7 broken titan shrine, 8 high cloudstone shelf, 9 rain-polished bank, 10 wind-cut ascent ramp, 11 broad storm stairs, 12 ancient bridge across a cloud cleft, 13 lightning-scored causeway, 14 cracked titan-stone rubble, 15 rain-dark chips and tiny luminous sparks |
| terraces | warm ivory marble, sunstone gold, pale cloud blue, deep carved shadows and gentle peach highlights | 0 high-altitude spring basin, 1 sunstone escarpment, 2 wind-cut cliff ravine, 3 narrow cloudwater channel, 4 floating marble island, 5 layered sunlit terrace, 6 olive-root retaining bank, 7 broken summit sanctuary, 8 polished marble shelf, 9 cloud-fringed bank, 10 broad ascent ramp, 11 sunstone switchback stairs, 12 monumental marble bridge, 13 processional summit causeway, 14 broken balustrade rubble, 15 loose marble chips and windblown laurel leaves |

The seven calls also supplied the same reference path as `referenced_image_paths` and used `transparent_background: true`.

## Ash prompt

The Ash atlas used this exact prompt and the same reference image through `referenced_image_paths`:

```text
Create an ORIGINAL square 1024x1024 transparent sprite atlas for a Greek-myth action roguelite. Exact layout: 4 equal columns by 4 equal rows, 16 isolated cells, each 256x256 pixels, clean transparent gutters, no visible grid lines, no cell may cross its boundaries. Every cell contains one large, readable top-down 2.5D terrain formation viewed from a consistent elevated isometric angle, with painted side faces, grounded cast shadow, and empty transparent space around the silhouette. Use painterly hand-inked forms and rich layered brushwork, moody dramatic light from upper left, deep blue-black shadow, ember-orange seams, muted ash and iron palette. Original art; use the attached image only as a reference for intricate level density, readable open floor paths, patterned underfloor material, and atmospheric lighting. Do not copy its characters, recognizable motifs, layout, symbols, or composition. The 16 cells in row-major order: shallow volcanic basin, fractured basalt ridge, broken ravine rim, cinder channel bank, jagged volcanic island, stepped obsidian terrace, ash-rooted bank, half-buried ancient stone ruin, angular basalt shelf, ember-lit riverbank, worn blackstone ramp, two-step basalt stair, heavy basalt bridge, cracked processional causeway, loose rubble boulder cluster, scattered obsidian fragments. No text, UI, complete scene, floor plane, humans, weapons, logos, or watermarks. Keep every shape's contour and shadow inside its own cell; strong silhouette and painted texture should remain clear at gameplay scale.
```

## Generator outputs

All source images remain in `C:\Users\dmcfu\.codex\generated_images\01a0fed9-8024-74d3-8877-6438203f9c5a`. The files below are byte-for-byte copies of those outputs. Actual PNG dimensions are 1254×1254; the atlas manifest slices each file as four columns by four rows.

| Family | Generator output | Project asset | Bytes | SHA-256 |
|---|---|---|---:|---|
| ash | `exec-6a83e783-da9b-4058-8628-c42fddaeb0ff.png` | `living-terrain-ash.png` | 2385421 | `ba4b767a733c48420bd00316d70cac91b3c07bc3aa29c49765918247c6568282` |
| river | `exec-40cc2590-2f88-45ed-94b2-3ea344012a8f.png` | `living-terrain-river.png` | 2767595 | `4ad26d244b10659fca92b6b9345857a54c85d195f1c4d2360f7cdf91f9511004` |
| grove | `exec-96c640bc-3f6b-45a3-aaa3-0925fdf00bf9.png` | `living-terrain-grove.png` | 2745156 | `8715cdf08b1bb5de2213d9a9a8728d33839fbd94be8371a8dfae50e1c093aaa2` |
| fields | `exec-0b8a16f9-e5b2-438b-b64f-028f28c4c06d.png` | `living-terrain-fields.png` | 2735471 | `e8dfce9c6d3bc98d62144621a397651c6f555041840295bcf211f66d30126c21` |
| lava | `exec-3a3bd3f8-337b-47be-9d97-64abbcc4e2a0.png` | `living-terrain-lava.png` | 2401181 | `a06fec13b24250210175c188a846c9f4d80ba56634bdb87856f4a81d1040c02d` |
| ruins | `exec-3c8cc663-c587-4728-b29e-b1bd52bcce7f.png` | `living-terrain-ruins.png` | 2836351 | `3559de10a3101ee894a8d25d2d76400af4d1e807c9b99eb8f37495bf6ea07002` |
| storm | `exec-a58f9f57-d9a2-4aa1-865c-24e4cf99abb0.png` | `living-terrain-storm.png` | 2848477 | `9fdd57e38aab11f170de2536a09d87ab8ccd83fa84aaaac93719554e034bc23e` |
| terraces | `exec-28bdcece-cefd-45b5-8591-350764a3ee19.png` | `living-terrain-terraces.png` | 2769970 | `6d77d5431e2d2155b8d2946755258c20c6596124d28867c30ab96ee1dd3b0203` |

## Low-profile floor-detail atlases

Generated on 2026-10-03. The gameplay-scale review showed that large paving-island sprites read as detached platforms when used around an otherwise continuous floor. These eight additional atlases contain small, shallow ground details, so the base floor stays visible and raised landforms remain separate. Each family atlas is an original transparent 4×4 PNG. The generated files were copied byte-for-byte into the project.

### Shared exact prompt for river, grove, fields, lava, ruins, storm, and terraces

The following prompt body was sent once for each family; `${family.details}` was replaced by the family-specific text in the table below.

```text
Create a production-ready transparent PNG sprite atlas, exactly a clean 4 by 4 grid of sixteen distinct isolated small floor-hugging decorative ground decals for a Greek myth action roguelike. ${family.details}. Orthographic near top-down view, very shallow relief, painterly hand-painted 2.5D game art, sharp readable silhouettes. Every cell is a separate loose cluster that fits within its equal cell with generous true transparent padding. These are flat details placed on top of a continuous existing floor: absolutely no floating island, no raised platform, no cliff, no pedestal, no thick-edged floor slab, no cast shadow suggesting levitation, no large scenery, no text, no labels, no cell borders, no connection between cells.
```

| Family | Exact `${family.details}` substitution |
|---|---|
| river | waterlogged Greek myth arena floor decals: river-polished pale blue stone chips, silt smears, shell fragments, low reeds, small white foam flecks, thin turquoise water seep lines; deep slate blue, sea-glass cyan, muted silver palette |
| grove | overgrown Greek myth arena floor decals: flat moss and leaf clusters, creeping surface roots, fallen blossom petals, acorns and bark fragments, little mushrooms; deep olive green, sage, faded rose palette |
| fields | sunlit Greek myth arena floor decals: pale marble chips, scattered poppy petals, dry grasses, tiny laurel leaves, dusty soil scuffs and faint gold flecks; warm ivory, terracotta red and antique gold palette |
| lava | volcanic Greek myth arena floor decals: charcoal ash smears, small black slag, bronze tile shards, sparse embers and thin red-orange fissures; blackened basalt, copper and ember palette |
| ruins | ancient Greek myth arena floor decals: broken pale marble mosaic, chipped blue-and-gold tesserae, column chips, fallen olive leaves, dust and muted violet weed clusters; cool stone, desaturated indigo and antique gold |
| storm | storm-swept Greek myth arena floor decals: blue-grey cloudstone chips, feathers, wind-scoured dust trails, small lightning-glass slivers and thin pale electric-blue fissures; midnight slate, silver and restrained cyan |
| terraces | high Greek myth terrace floor decals: sun-worn cream limestone chips, tiny laurel leaves, pink petals, pale wind-drifted grit and fragments of engraved marble trim; warm alabaster, muted green and soft gold |

### Ash prompt and transparency correction

Ash used this family-specific prompt:

```text
Create a production-ready transparent PNG sprite atlas for a Greek-myth action roguelike: exactly a clean 4 by 4 grid of sixteen distinct, isolated, small floor-hugging ground-detail decals, orthographic near top-down camera, very shallow relief. Ashen volcanic floor set: broken basalt tile edges, scattered small rocks and rubble, soot smears, a few thin glowing ember cracks, sparse low scrub, chipped bronze tile fragments. Painterly hand-painted 2.5D game art with strong readable silhouettes and restrained charcoal, blue-grey, and copper-orange palette. Each decal must be a loose cluster that fits within its own equal cell with generous transparent padding; no touching adjacent cells, no cell borders, no shadows outside the decal footprint. These are flat details placed ON TOP OF an existing continuous floor: absolutely no floating island, no raised platform, no cliff, no pedestal, no large scenic object, no floor tile slab with a thick edge, no cast shadow suggesting levitation. Transparent background, evenly spaced exact 4x4 layout, no words, no labels, no UI.
```

The initial output included a visible checker pattern despite that text. The same sheet was sent to ImageGen with `transparent_background: true` and this exact edit instruction; the corrected output is the project source:

```text
Preserve the existing 4 by 4 atlas exactly: keep every one of the 16 volcanic floor-detail decals, their art, colors, scale, and positions unchanged. Remove the gray checkerboard completely and replace it with true alpha transparency. Keep clean transparent gutters between cells. Do not add or remove any decal and do not alter the grid.
```

### Ground-detail generator outputs

The source files remain in `C:\Users\dmcfu\.codex\generated_images\01a0fed9-8024-74d3-8877-6438203f9c5a`. All project files below are unchanged copies of those outputs.

| Family | Generator output | Project asset | Bytes | SHA-256 |
|---|---|---|---:|---|
| ash | `exec-1ee4edf5-de69-4b50-a23a-c48dfc186776.png` | `living-details-ash.png` | 1890311 | `CB362048F64634FFFB331AE710E5286D257E7535DD48295C13CB6094A7035011` |
| river | `exec-848d46d2-28f3-4e03-9b0b-08b1e23a3cdc.png` | `living-details-river.png` | 1740911 | `85F849D63751FD335D0B1790A82C1C9840A69B970F2A16C27ADF6B63BC053BB8` |
| grove | `exec-2ee49894-cba5-452d-ada7-966559cc6275.png` | `living-details-grove.png` | 2171957 | `97D67F921CF94989649344C91B053BE4EBDADCB30EB763B2F9F3AD6B85773FDC` |
| fields | `exec-75581b56-b615-471a-9531-31cac78143a5.png` | `living-details-fields.png` | 2012852 | `E840F823EE5B53ADC30D2ACDE212FF4AF5E6273AD31D1308EF04EA1B78AD2247` |
| lava | `exec-2164b33f-4f23-4017-a1f5-8a50be688c9d.png` | `living-details-lava.png` | 2031079 | `7BF9ECACAC6956F4B3D8394CEA15AD38EFEB4AD161F407A2999EF8013908CF17` |
| ruins | `exec-1047cdd0-8696-463e-a1b4-68697b0f1171.png` | `living-details-ruins.png` | 1891392 | `E247B2E167EE3FC82B8A2DE534BD6A9012BA0EC122F0AEDA555F326B157147A5` |
| storm | `exec-3bc58032-d4b6-43da-bfe5-0667416816ee.png` | `living-details-storm.png` | 1745826 | `5EFE699FB14D42653578EAA209CA06D40CE5F1AE5A5E8CBE1C4C7F62318E1884` |
| terraces | `exec-f4a02751-a804-4b06-ad84-02ef0acbc702.png` | `living-details-terraces.png` | 2020028 | `4318C3F25F374A9B575DA87B3529797DFCE8D494127F07BFF6B25763B34F254D` |
