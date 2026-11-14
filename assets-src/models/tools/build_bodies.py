"""Genera earth.glb, moon.glb y sun.glb (esferas de radio 1, Y arriba) con texturas reales.
Mapeo equirectangular: longitud 0 hacia -Z, longitud 90° E hacia +X, norte hacia +Y.
- Tierra: NASA Blue Marble Next Generation (dominio público).
- Luna: Solar System Scope (CC BY 4.0, basada en datos de NASA LRO). Incluye un empty `site-{id}` por sitio.
- Sol: Solar System Scope (CC BY 4.0), como textura emisiva.
Uso: python build_bodies.py <earth.jpg> <moon.jpg> <sun.jpg> <carpeta_salida>
"""
import sys
import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
earth_p, moon_p, sun_p, OUT = sys.argv[1:5]

SITES = {  # coordenadas aproximadas (verificar con Quickmap, tarea 3.3)
    'shackleton-rim': (-89.67, 197.0), 'connecting-ridge': (-89.45, 222.0), 'de-gerlache-rim': (-88.67, 292.0),
    'mons-mouton': (-84.8, 29.2), 'malapert-massif': (-86.0, 2.9), 'nobile-rim': (-85.4, 37.0),
}


def dirv(lat, lon):
    la, lo = np.radians(lat), np.radians(lon)
    return np.array([np.cos(la) * np.sin(lo), np.sin(la), -np.cos(la) * np.cos(lo)])


def uv_sphere(rings=64, segments=128):
    verts, uvs, faces = [], [], []
    for i in range(rings + 1):
        v = i / rings
        lat = 90 - v * 180
        for j in range(segments + 1):
            u = j / segments
            lon = (u - 0.5) * 360
            verts.append(dirv(lat, lon))
            uvs.append([u, 1 - v])
    w = segments + 1
    for i in range(rings):
        for j in range(segments):
            a, b, c, d = i * w + j, i * w + j + 1, (i + 1) * w + j, (i + 1) * w + j + 1
            if i > 0:
                faces.append([a, c, b])
            if i < rings - 1:
                faces.append([b, c, d])
    return np.array(verts), np.array(uvs), np.array(faces)


def tex(path, w):
    im = Image.open(path).convert('RGB')
    return im.resize((w, w // 2), Image.LANCZOS)


def body(name, mat, empties=None):
    v, uv, f = uv_sphere()
    m = trimesh.Trimesh(v, f, process=False)
    m.vertex_normals = v  # normales suaves exactas
    m.visual = trimesh.visual.TextureVisuals(uv=uv, material=mat)
    s = trimesh.Scene()
    s.graph.update(frame_to=name, frame_from=s.graph.base_frame, matrix=np.eye(4))
    s.add_geometry(m, node_name=f'{name}_mesh', geom_name=name, parent_node_name=name)
    for en, (lat, lon) in (empties or {}).items():
        T = np.eye(4); T[:3, 3] = dirv(lat, lon)
        s.graph.update(frame_to=f'site-{en}', frame_from=name, matrix=T)
    s.export(f'{OUT}/{name.lower()}.glb', file_type='glb', include_normals=True)
    return s


body('Earth', PBRMaterial(name='EarthBlueMarble', baseColorTexture=tex(earth_p, 4096), metallicFactor=0.0, roughnessFactor=0.75))
body('Moon', PBRMaterial(name='MoonLRO', baseColorTexture=tex(moon_p, 2048), metallicFactor=0.0, roughnessFactor=0.95), SITES)
sun_img = tex(sun_p, 1024)
body('Sun', PBRMaterial(name='SunEmissive', baseColorTexture=sun_img, emissiveTexture=sun_img,
                        emissiveFactor=[1.0, 1.0, 1.0], metallicFactor=0.0, roughnessFactor=1.0))
print('ok')
