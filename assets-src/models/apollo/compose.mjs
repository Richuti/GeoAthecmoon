// Une el Módulo Lunar del Apolo (NASA 3D Resources) con nuestras piezas móviles.
// Resultado: Lander → Body → { ApolloLM, Mast, SolarPanel, Antenna }
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mergeDocuments, prune, dedup, unpartition } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';

const S = 1.37;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
});
const [lmPath, addonsPath, outPath] = process.argv.slice(2);
const doc = await io.read(lmPath);
const addons = await io.read(addonsPath);
for (const e of doc.getRoot().listExtensionsUsed()) if (e.extensionName === 'KHR_draco_mesh_compression') e.dispose();

const mainScene = doc.getRoot().listScenes()[0];
const lmRoots = mainScene.listChildren();

const lander = doc.createNode('Lander');
const body = doc.createNode('Body');
const apollo = doc.createNode('ApolloLM')
  .setScale([S, S, S])
  .setRotation([0, 1, 0, 0]) // 180° en Y: la escotilla mira a -Z (norte)
  .setTranslation([0, -0.10 * S, 0]);
lander.addChild(body);
body.addChild(apollo);
for (const n of lmRoots) { mainScene.removeChild(n); apollo.addChild(n); }
mainScene.addChild(lander);

const map = mergeDocuments(doc, addons);
for (const s of addons.getRoot().listScenes()) {
  const merged = map.get(s);
  for (const n of merged.listChildren()) { merged.removeChild(n); body.addChild(n); }
  merged.dispose();
}
doc.getRoot().setDefaultScene(mainScene);
await doc.transform(dedup(), prune(), unpartition());
await io.write(outPath, doc);
console.log('ok', outPath);
