"""Genera sun.glb y earth.glb para GEOATHECMOON (esferas de radio 1).
Uso:  python build_sky.py [ruta/blue_marble.jpg]
Sin textura, la Tierra sale en azul liso (marcador provisional).
"""
import sys
import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial
from PIL import Image

OUT = sys.argv[2] if len(sys.argv) > 2 else '.'


def uv_sphere(radius=1.0, rings=32, segments=64):
    """Esfera con UV equirectangular (costura duplicada), Y arriba.
    u=0.5 apunta a -Z (longitud 0 de frente al norte de la escena)."""
    verts, uvs, faces = [], [], []
    for i in range(rings + 1):
        v = i / rings
        theta = v * np.pi  # 0 = polo norte (+Y)
        for j in range(segments + 1):
            u = j / segments
            phi = (u - 0.5) * 2 * np.pi  # longitud
            x = np.sin(theta) * np.sin(phi)
            y = np.cos(theta)
            z = -np.sin(theta) * np.cos(phi)
            verts.append([x * radius, y * radius, z * radius])
            uvs.append([u, 1 - v])
    w = segments + 1
    for i in range(rings):
        for j in range(segments):
            a, b, c, d = i * w + j, i * w + j + 1, (i + 1) * w + j, (i + 1) * w + j + 1
            faces += [[a, c, b], [b, c, d]]
    return np.array(verts), np.array(uvs), np.array(faces)


v, uv, f = uv_sphere()

# --- Sol: emisivo ámbar ---
sun_mat = PBRMaterial(name='SunEmissive', baseColorFactor=[255, 181, 71, 255],
                      emissiveFactor=[1.0, 0.71, 0.28], metallicFactor=0.0, roughnessFactor=1.0)
sun = trimesh.Trimesh(v, f, process=False)
sun.visual = trimesh.visual.TextureVisuals(uv=uv, material=sun_mat)
s = trimesh.Scene(); s.add_geometry(sun, node_name='Sun', geom_name='Sun')
s.export(f'{OUT}/sun.glb', file_type='glb', include_normals=True)

# --- Tierra: Blue Marble (NASA Visible Earth) ---
tex_path = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] != '-' else None
if tex_path:
    img = Image.open(tex_path).convert('RGB').resize((2048, 1024), Image.LANCZOS)
    earth_mat = PBRMaterial(name='EarthBlueMarble', baseColorTexture=img, metallicFactor=0.0, roughnessFactor=0.8)
else:
    earth_mat = PBRMaterial(name='EarthPlaceholder', baseColorFactor=[46, 110, 220, 255], metallicFactor=0.0, roughnessFactor=0.8)
earth = trimesh.Trimesh(v, f, process=False)
earth.visual = trimesh.visual.TextureVisuals(uv=uv, material=earth_mat)
e = trimesh.Scene(); e.add_geometry(earth, node_name='Earth', geom_name='Earth')
e.export(f'{OUT}/earth.glb', file_type='glb', include_normals=True)
print('ok', 'con textura' if tex_path else 'sin textura (provisional)', 'triángulos:', len(f))
