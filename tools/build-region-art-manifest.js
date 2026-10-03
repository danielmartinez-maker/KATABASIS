'use strict';
const fs = require('fs');
const path = require('path');
const { K } = require('./debug-harness');
const root = path.resolve(__dirname, '..');
const families = {
  ash: { src: 'assets/regions/generated/ash-world-kit.webp', aspect: 1263 / 1245, biome: 'cinder, iron and basalt' },
  river: { src: 'assets/regions/generated/river-world-kit.webp', aspect: 1.5, biome: 'shallows, silt and saltstone' },
  grove: { src: 'assets/regions/generated/grove-world-kit.webp', aspect: 1.5, biome: 'roots, blossom and moss' },
  fields: { src: 'assets/regions/generated/fields-world-kit.webp', aspect: 1, biome: 'laurel, marble and poppy fields' },
  lava: { src: 'assets/regions/generated/lava-world-kit.webp', aspect: 1444 / 1089, biome: 'slag, bronze and obsidian' },
  ruins: { src: 'assets/regions/generated/ruins-world-kit.webp', aspect: 1448 / 1086, biome: 'marble, mosaic and fallen stone' },
  storm: { src: 'assets/regions/generated/storm-world-kit.webp', aspect: 1312 / 1199, biome: 'cloudstone, lightning and titan stone' },
  terraces: { src: 'assets/regions/generated/terraces-world-kit.webp', aspect: 1374 / 1145, biome: 'cloud, sunstone and wind-cut marble' }
};
const groundAtlases = Object.fromEntries(Object.keys(families).map(family => [family, {
  src: 'assets/regions/generated/' + family + '-ground-kit.webp',
  aspect: ({ ash: 1402 / 1122, river: 1402 / 1122, grove: 1402 / 1122, fields: 1402 / 1122, lava: 1402 / 1122, ruins: 1, storm: 1, terraces: 1401 / 1123 })[family]
}]));
const detailAtlases = Object.fromEntries(Object.keys(families).map(family => [family, {
  src: 'assets/regions/generated/living-details-' + family + '.png', aspect: 1,
  cells: ['basalt rubble','ash smear','scrub and stone','ember fissure','broken mosaic','root and leaves','scattered fragments','dust trail','stone shards','petals and grit','engraved trim','low brush','cracked paving','windblown debris','regional detritus','small ground scatter']
}]));
const terrainAtlases = Object.fromEntries(Object.keys(families).map(family => [family, {
  src: 'assets/regions/generated/living-terrain-' + family + '.png', aspect: 1, cols: 4, rows: 4,
  cells: ['basin','ridge','ravine','channel','island','terrace','rootbank','ruins','shelf','bank','ramp','stair','bridge','causeway','rubble','fragments']
}]));
const signatureAtlases = {
  'regionlandmark.01': { src:'assets/regions/generated/region-landmarks-01.webp', aspect:1295/1214, cells:16 },
  'regionlandmark.02': { src:'assets/regions/generated/region-landmarks-02.webp', aspect:1380/1140, cells:16 }
};
const assetManifestPath = path.join(root, 'assets/manifest.json');
const assetManifest = JSON.parse(fs.readFileSync(assetManifestPath, 'utf8'));
for (const [family, info] of Object.entries(families)) {
  assetManifest['regionkit.' + family] = {
    src: info.src, cols: 4, rows: 4, aspect: info.aspect, lazy: true,
    kind: 'region-world-art', family, biome: info.biome
  };
}
for (const [family, info] of Object.entries(groundAtlases)) {
  assetManifest['regionground.' + family] = {
    src: info.src, cols: 4, rows: 4, aspect: info.aspect, lazy: true,
    kind: 'region-ground-overlay', family
  };
}
for (const [family, info] of Object.entries(detailAtlases)) {
  assetManifest['regiondetail.' + family] = {
    src: info.src, cols: 4, rows: 4, aspect: info.aspect, lazy: true,
    kind: 'region-ground-detail', family, cells: info.cells.length
  };
}
for (const [family, info] of Object.entries(terrainAtlases)) {
  assetManifest['regionterrain.' + family] = {
    src: info.src, cols: info.cols, rows: info.rows, aspect: info.aspect, lazy: true,
    kind: 'region-terrain-art', family, cells: info.cells.length
  };
}
for (const [id, info] of Object.entries(signatureAtlases)) {
  assetManifest[id] = { src:info.src, cols:4, rows:4, aspect:info.aspect, lazy:true, kind:'region-signature-landmarks', cells:info.cells };
}
const profileRegions = Object.entries(K.World.PROFILES).map(([id, profile]) => ({
  id, name: profile.name, family: profile.assetKit,
  atlasAssetId: 'regionkit.' + profile.assetKit,
  groundAssetId: 'regiondetail.' + profile.assetKit,
  signatureAssetId: profile.signatureAssetId,
  signatureNodeId: profile.signatureNodeId,
  floorFamily: profile.artFamily, biomeFamily: profile.family,
  worldScale: profile.worldScale, signatureLandmark: profile.signatureLandmark,
  signatureCell: profile.signatureCell,
  subzones: profile.subzones.map(zone => ({
    id: zone.id, material: zone.material, landmark: zone.landmark,
    landmarkCell: zone.landmarkCell,
    terrainArtKey: id + '.terrain.' + zone.material
  }))
}));
const manifest = {
  version: 1,
  description: 'Every playable region resolves its own terrain family kit, low-profile floor-detail decals, grounded 2.5D landforms with collision and cover, and an authored signature landmark.',
  atlas: { cols: 4, rows: 4, cellAspect: 'per-family manifest aspect', cells: { terrainTransitions: [0, 7], obstacles: [8, 11], signatureLandmarks: [12, 15], terrainFeatures: { basin: 0, ridge: 1, ravine: 2, channel: 3, island: 4, terrace: 5, rootbank: 6, ruins: 7, shelf: 8, bank: 9, ramp: 10, stair: 11, bridge: 12, causeway: 13, rubble: 14, fragments: 15 } } },
  families: Object.fromEntries(Object.entries(families).map(([id, info]) => [id, { assetId: 'regionkit.' + id, src: info.src, biome: info.biome, groundAssetId: 'regiondetail.' + id, groundSrc: detailAtlases[id].src }])),
  terrainAtlases: Object.fromEntries(Object.entries(terrainAtlases).map(([id, info]) => [id, { assetId: 'regionterrain.' + id, src: info.src, aspect: info.aspect, cols: info.cols, rows: info.rows, cells: info.cells } ])),
  groundAtlases: Object.fromEntries(Object.entries(groundAtlases).map(([id, info]) => [id, { assetId: 'regionground.' + id, src: info.src, aspect: info.aspect, cols: 4, rows: 4, cells: 16 }])),
  detailAtlases: Object.fromEntries(Object.entries(detailAtlases).map(([id, info]) => [id, { assetId: 'regiondetail.' + id, src: info.src, aspect: info.aspect, cols: 4, rows: 4, cells: info.cells }])),
  signatureAtlases: Object.fromEntries(Object.entries(signatureAtlases).map(([id, info]) => [id, { assetId:id, src:info.src, cells:info.cells }])),
  regions: profileRegions
};
fs.writeFileSync(assetManifestPath, JSON.stringify(assetManifest, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'js/asset-manifest.js'), 'window.KATABASIS_ASSET_MANIFEST = ' + JSON.stringify(assetManifest) + ';\n');
fs.writeFileSync(path.join(root, 'assets/region-art-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
process.stdout.write(JSON.stringify({ families: Object.keys(families).length, groundAtlases: Object.keys(groundAtlases).length, regions: profileRegions.length, files: ['assets/manifest.json', 'js/asset-manifest.js', 'assets/region-art-manifest.json'] }) + '\n');
