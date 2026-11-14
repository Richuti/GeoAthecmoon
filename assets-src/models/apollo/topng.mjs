import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import sharp from 'sharp';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const d = await io.read(process.argv[2]);
for (const t of d.getRoot().listTextures()) {
  if (t.getMimeType() === 'image/webp') {
    const png = await sharp(Buffer.from(t.getImage())).png().toBuffer();
    t.setImage(new Uint8Array(png)).setMimeType('image/png');
    t.setURI((t.getURI() || t.getName() || 'tex').replace(/\.webp$/, '') + '.png');
  }
}
for (const e of d.getRoot().listExtensionsUsed()) if (e.extensionName === 'EXT_texture_webp') e.dispose();
await io.write(process.argv[3], d);
console.log('ok');
