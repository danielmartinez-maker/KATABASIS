# Deity portrait motion pilot

**Decision:** Use one still WebP poster with a restrained CSS runtime motion treatment across all 53 portraits.

The contrasting Zeus and Poseidon covers served as the pilot. Their 1024×1536 masters produce the same 320×400 poster format used by reward cards, the Codex, and static HUD chips. The pilot review checked both identities at compact and Codex sizes, with motion on and off. The full 53-cover contact sheet confirms the approved symbols and faces remain recognizable at thumbnail scale.

The packaged set contains 2,323,290 bytes of WebP posters (2.22 MiB). A decoded RGBA 320×400 poster uses 512,000 bytes; displaying all 53 at once would use about 25.88 MiB of image pixels. A six-frame 320×400 sprite strip for each identity would use about 155.27 MiB decoded if all strips were resident. Runtime motion reuses each poster, so it adds no portrait image bytes and needs only one decoded poster per identity. The 53 archival PNG masters total 145.15 MiB and are not required by the standalone game bundle.

The six-frame comparison is an exact raw-pixel estimate at the shipped poster dimensions, not a compressed sprite-file measurement; no alternate painted loop frames were authored. The final standalone build is 382,573,737 bytes because it embeds the game's other assets as well as the portrait posters. In one offline Chromium run on this machine, the 53-poster bundle loaded without external requests or page errors in 9.6 seconds. Its 600-frame simulation-and-draw sample measured 1.0 ms median and 2.3 ms p95; that run does not isolate portrait animation cost or promise a device-independent frame rate.

Reward and Codex portraits move only while visible. HUD chips, hidden surfaces, and reduced-motion settings retain the clean still poster. Every portrait remains decorative and uses live text for its name and effects.
