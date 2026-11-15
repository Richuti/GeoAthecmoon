// Normaliza un .glb de NASA 3D Resources para la web y Godot:
// sin Draco, texturas PNG (máx. 1024 px) y geometría simplificada si pasa de MAX_TRIS.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, simplify, textureCompress, unpartition, getBounds } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';

const [inp, out, maxTrisArg, texArg, realHeightArg, modeArg, nameArg] = process.argv.slice(2);
const TEX = Number(texArg || 1024);
const MAX_TRIS = Number(maxTrisArg || 150000);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
});
const doc = await io.read(inp);
const tris = () => doc.getRoot().listMeshes().flatMap(m => m.listPrimitives()).reduce((a, p) => a + (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3, 0);
const before = tris();
for (const e of doc.getRoot().listExtensionsUsed()) if (['KHR_draco_mesh_compression', 'EXT_meshopt_compression'].includes(e.extensionName)) e.dispose();
await doc.transform(dedup(), prune({ keepLeaves: true }));
if (before > MAX_TRIS) {
  await MeshoptSimplifier.ready;
  await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: MAX_TRIS / before, error: 0.002 }));
}
await doc.transform(textureCompress({ encoder: sharp, targetFormat: (process.env.FMT || 'png'), resize: [TEX, TEX] }));
for (const e of doc.getRoot().listExtensionsUsed()) if (e.extensionName === 'EXT_texture_webp') e.dispose();
// Escala a metros reales y apoya en el suelo (ground) o centra (center)
if (realHeightArg) {
  const scene0 = doc.getRoot().listScenes()[0];
  const b0 = getBounds(scene0);
  const h = b0.max[1] - b0.min[1];
  const s = Number(realHeightArg) / h;
  const cx = (b0.max[0] + b0.min[0]) / 2, cz = (b0.max[2] + b0.min[2]) / 2;
  const cy = modeArg === 'ground' ? b0.min[1] : (b0.max[1] + b0.min[1]) / 2;
  const wrap = doc.createNode(nameArg || 'Model').setScale([s, s, s]).setTranslation([-cx * s, -cy * s, -cz * s]);
  for (const n of scene0.listChildren()) { scene0.removeChild(n); wrap.addChild(n); }
  scene0.addChild(wrap);
}
await doc.transform(prune({ keepLeaves: true }), unpartition());
await io.write(out, doc);
const b = getBounds(doc.getRoot().listScenes()[0]);
const size = b.max.map((v, i) => +(v - b.min[i]).toFixed(2));
console.log(JSON.stringify({ out, trisBefore: Math.round(before), trisAfter: Math.round(tris()), sizeXYZ: size, minY: +b.min[1].toFixed(2) }));
