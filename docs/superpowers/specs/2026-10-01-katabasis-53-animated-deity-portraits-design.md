# Katabasis: 53 Animated Deity Boon Portraits

**Status:** Merged into the [unified world, mythology, deity art, and endgame spec](./2026-10-01-katabasis-procedural-world-and-gear-endgame-design.md#animated-deity-portraits-and-boon-card-art). This file is retained as a source record and is no longer an independent design brief.

**Date:** 2026-10-01

## Goal

Create 53 distinct animated deity cover portraits for Katabasis. A god's portrait appears on every boon card associated with that god, so the art establishes who is granting the power. The same portrait asset is reused across that god's boons; the project does not need a separate cover for each boon.

The target is deliberately ambitious. Production will happen in validated batches, while the complete target remains 53 finished deity portraits.

## User intent and constraints

- Produce animated cover art for 53 gods.
- Show each god's cover on the god's boon cards.
- Keep the art within Katabasis's Greek Underworld identity: mythic silhouettes, dark stone, terracotta, cream, and restrained gold.
- Use Hades as a pacing and presentation reference while keeping all character designs and artwork original to Katabasis.
- Preserve the game's existing offline, image-based asset direction.

## Current project context

The current source data defines 12 god IDs. The Codex text refers to an “Olympian Thirteen,” so the intended 53-name roster is not yet represented consistently in the god data. The asset router already resolves deity art through a god ID, and boon cards request the associated god portrait. This provides a reuse point for the new library.

Before image generation begins, the project needs an approved roster of exactly 53 deity names and stable IDs. The roster should also identify which entries already have boon content and which need separate gameplay-content work. This art specification does not invent boon mechanics or rebalance existing boons.

## Art direction

Each portrait is a readable, character-forward cover with:

- One clearly recognizable divine figure as the focal point.
- A distinctive silhouette, face, attribute, and symbolic motif tied to that god's identity.
- A restrained palette accent that helps distinguish gods without breaking the shared Katabasis palette.
- A central safe area that keeps the face and signature motif visible when the portrait is cropped into the compact boon-card art slot.
- No baked-in labels, names, UI frames, or text; the game renders those separately.

Use a consistent portrait composition and lighting language across all 53 covers. Individual gods may vary in posture, materials, symbols, and secondary motion so the set feels authored rather than recolored.

## Image-generation brief

Prepare one generation record per deity with its approved name and ID, epithet, domain, signature symbols, palette accent, silhouette/pose, and one or two animation cues. These fields keep prompts specific while preserving a common visual system.

Use this prompt structure for each approved roster member:

> Create an original Katabasis Greek-Underworld deity cover portrait of **[name and epithet]**, whose domain is **[domain]**. Show **[pose and silhouette]** with **[signature symbols]**. Use **[palette accent]** within a dark-stone, terracotta, cream, and restrained-gold visual language. Keep the face and signature symbol in the central crop-safe area. Compose this as the still keyframe for a subtle idle loop; later frames will change only **[one or two cues]**. Keep the silhouette readable at small card size, and the artwork free of text, logos, and interface frames. The design must be original to Katabasis.

Generate and approve a still keyframe first. Use that image as the reference for subsequent loop frames; change only the named motion cues while preserving face, pose, palette, lighting, and crop. Assemble and inspect the frames as a loop before approving a deity's final asset. The generation record becomes the source of truth for prompt revisions and asset naming.

## Animation design

Each god receives one seamless idle loop built around that portrait. Target 4–8 frames over roughly 1.5–2.5 seconds. The figure remains stable and recognizable while one or two identity-specific details move: examples include a shifting flame, slow water motion, cloth, hair, a soft eye-glint, or a faint metal shimmer.

The loop should:

- Feel like a living mythic portrait, with no scene cuts or abrupt camera movement.
- Remain legible at boon-card size and avoid rapid flashing or high-frequency motion.
- Start and end on visually compatible frames so the loop does not visibly jump.
- Include a clean poster frame for reduced-motion settings, persistent boon-tray chips, and any context where animation is paused.

The first production pilot will compare a short sprite-sheet loop with a single-cover runtime motion treatment. Select the smallest reliable method that preserves the requested animated impression, visual quality, and offline bundle performance. The final method must be applied consistently to all 53 gods.

## Display behavior

- Reward-choice boon cards show the animated portrait for the boon-granting god.
- Codex deity and boon details reuse the same portrait and can show its loop while visible.
- Persistent HUD boon chips use the poster frame to preserve readability and limit simultaneous animation.
- Multi-god boons show the portraits of their associated gods in a compact paired composition. Their roster mapping must come from boon data rather than guessed from the art.
- When reduced motion is requested, show the poster frame with no animated movement.
- Portraits remain decorative: boon names, descriptions, effects, rarity, and accessibility labels stay as live text.

## Asset and integration requirements

- Assign one stable god ID and one portrait asset entry to each of the 53 roster members.
- Store each master cover and its approved 4–8-frame loop in the project's raster asset pipeline; use the existing manifest and god-ID lookup pattern where possible.
- Reuse the same portrait reference across every boon associated with that god.
- Keep animation playback limited to visible card and detail surfaces; pause it when those surfaces are hidden.
- Preserve offline loading and include every required image in the standalone bundle.
- Keep boon calculations, rarity, rewards, combat timing, and save behavior unchanged.
- Include a readable loading/error state if a required portrait asset is missing. Use the poster frame as the motion fallback when animation is unavailable.

## Production workflow

1. **Freeze the roster.** Approve exactly 53 names, IDs, pronunciation/display names, symbols, and palette accents. Mark which already have boon data.
2. **Make a style reference.** Use existing Katabasis art and palette so new covers fit the established Underworld direction.
3. **Build a pilot.** Create two contrasting gods, such as a storm-focused and sea-focused figure. Review at the actual boon-card size, the full Codex size, and with motion disabled.
4. **Approve the animation treatment.** Check loop continuity, silhouette stability, crop safety, and memory/bundle cost before scaling up.
5. **Generate in batches.** Produce the remaining covers in small themed batches, reviewing consistency and distinct identity after each batch.
6. **Integrate by god ID.** Connect each approved portrait to its god entry and verify that all associated boon cards resolve the same art.
7. **Package for offline play.** Add the finished images to the existing manifest/bundle path and verify that the standalone edition loads them.

## Acceptance criteria

- Exactly 53 approved deity IDs map to 53 distinct, finished cover portraits.
- Every portrait has a recognizable still frame and an approved looping presentation.
- Portraits remain distinguishable at the smallest boon-card size.
- Every boon card displays the correct god's portrait, with one asset reused across that god's boon set.
- Multi-god boons display only their associated gods.
- Reduced-motion mode and persistent HUD chips display static poster frames.
- The project remains offline-capable, and portraits are included in its standalone bundle.
- Existing boon effects, reward rules, combat behavior, and save data remain unchanged.

## Risks and mitigations

- **Roster ambiguity:** freeze the 53 names and IDs before generation; do not prompt against an assumed list.
- **Style drift across a large set:** maintain one approved style reference and review small batches against the pilot.
- **Unstable generated animation frames:** approve the animation method on two contrasting gods before producing the remaining 51.
- **Poor legibility at card size:** keep faces and signature symbols inside the central safe area and review at real UI scale.
- **Bundle and playback cost:** measure the pilot assets, reuse one portrait per god, pause hidden cards, and keep the poster-frame path available.

## Out of scope

- Creating or balancing new boon effects.
- Writing stories for additional gods. If the approved 53-name art roster requires new gameplay god entries, define that roster expansion as a separate content design before attaching covers to those gods' boon cards.
- Generating or integrating the 53 final images before the roster and this specification are reviewed.
