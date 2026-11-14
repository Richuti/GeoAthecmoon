"""Terrenos 3D reales de los 6 sitios a partir del DEM LOLA (LDEM_80S_80M.IMG, NASA/LRO).

Para cada sitio genera:
  - models/terrain/{id}.glb : malla 20 x 20 km, 1 unidad = 1 km (también en altura), sitio en (0, 0, 0),
                              norte hacia -Z, este hacia +X, objeto `Ground`. Incluye la curvatura lunar.
  - terrain/{id}.json       : horizonte real (360 valores, rayos de 150 km con curvatura, desde 2 m),
                              pendiente en el sitio y máxima en 100 m, metadatos.
Uso: python build_terrains.py LDEM_80S_80M.IMG <carpeta_salida>
"""
import json
import sys
from pathlib import Path

import numpy as np
import trimesh
from PIL import Image
from trimesh.visual.material import PBRMaterial

IMG, OUT = sys.argv[1], Path(sys.argv[2])
R = 1737400.0          # radio de referencia (m)
SCALE = 80.0           # m/píxel
N = 7600
OFF = 3799.5           # LINE/SAMPLE_PROJECTION_OFFSET
EXTENT_KM = 20.0
GRID = 257             # puntos por lado (~78 m)
HORIZON_KM = 150.0
MAST_M = 2.0

SITES = {  # deben coincidir con frontend/scripts/sites.mjs; 4 verificadas (backend/sites_verified.json)
    'shackleton-rim': ('Borde del cráter Shackleton', -89.67, 197.0),
    'connecting-ridge': ('Connecting Ridge', -89.44, 222.6),
    'de-gerlache-rim': ('Borde de de Gerlache', -88.67, 291.6),
    'mons-mouton': ('Mons Mouton', -84.81, 29.2),
    'malapert-massif': ('Macizo Malapert', -85.99, 2.1),
    'nobile-rim': ('Borde de Nobile', -85.4, 37.0),
}

dem = np.fromfile(IMG, dtype='<i2').reshape(N, N).astype(np.float32) * 0.5  # metros


def proj(lat, lon):
    """Estereográfica polar sur (esférica), centro lon 0. Devuelve x, y en metros."""
    r = 2 * R * np.tan(np.pi / 4 + np.radians(lat) / 2)
    lo = np.radians(lon)
    return r * np.sin(lo), r * np.cos(lo)


def height_at(x, y):
    """Altura bilineal (m) en coordenadas de proyección (arrays)."""
    s = x / SCALE + OFF          # columna (0-based)
    l = OFF - y / SCALE          # fila (0-based)
    s0 = np.clip(np.floor(s).astype(int), 0, N - 2); l0 = np.clip(np.floor(l).astype(int), 0, N - 2)
    fs = np.clip(s - s0, 0, 1); fl = np.clip(l - l0, 0, 1)
    a = dem[l0, s0]; b = dem[l0, s0 + 1]; c = dem[l0 + 1, s0]; d = dem[l0 + 1, s0 + 1]
    return (a * (1 - fs) + b * fs) * (1 - fl) + (c * (1 - fs) + d * fs) * fl


def frame(lat, lon):
    """Vectores unitarios norte (lejos del polo) y este en el plano de proyección."""
    x, y = proj(lat, lon)
    lo = np.radians(lon)
    north = np.array([np.sin(lo), np.cos(lo)])
    east = np.array([np.cos(lo), -np.sin(lo)])
    return np.array([x, y]), north, east


def regolith_texture(seed, size=1024):
    """Albedo de regolito sin luz horneada: ruido fractal gris (permitido por las reglas)."""
    rng = np.random.default_rng(seed)
    acc = np.zeros((size, size), np.float32)
    amp, tot = 1.0, 0.0
    for octave in range(6):
        n = 4 * 2 ** octave
        g = rng.random((n + 1, n + 1)).astype(np.float32)
        img = np.asarray(Image.fromarray((g * 255).astype(np.uint8)).resize((size, size), Image.BICUBIC), np.float32) / 255
        acc += img * amp; tot += amp; amp *= 0.55
    acc /= tot
    v = 0.42 + (acc - 0.5) * 0.22
    rgb = np.stack([v * 1.0, v * 0.985, v * 0.96], -1)
    return Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8))


def build(site_id, name, lat, lon, k):
    p0, north, east = frame(lat, lon)
    h0 = float(height_at(np.array([p0[0]]), np.array([p0[1]]))[0])

    # ---- malla del terreno ----
    t = np.linspace(-0.5, 0.5, GRID)
    e_km = np.tile(t * EXTENT_KM, (GRID, 1))                 # columna 0 = oeste
    n_km = np.tile((-t * EXTENT_KM)[:, None], (1, GRID))     # fila 0 = norte
    P = p0[None, None, :] + (e_km[..., None] * east + n_km[..., None] * north) * 1000.0
    h = height_at(P[..., 0], P[..., 1])
    curv = ((e_km * 1000) ** 2 + (n_km * 1000) ** 2) / (2 * R)
    z_m = h - h0 - curv
    verts = np.stack([e_km, z_m / 1000.0, -n_km], -1).reshape(-1, 3)  # X=este, Y=arriba, Z=-norte
    uv = np.stack([np.tile(np.linspace(0, 1, GRID), (GRID, 1)), np.tile(np.linspace(1, 0, GRID)[:, None], (1, GRID))], -1).reshape(-1, 2)
    idx = np.arange(GRID * GRID).reshape(GRID, GRID)
    a, b, c, d = idx[:-1, :-1], idx[:-1, 1:], idx[1:, :-1], idx[1:, 1:]
    faces = np.concatenate([np.stack([a, c, b], -1).reshape(-1, 3), np.stack([b, c, d], -1).reshape(-1, 3)])
    mesh = trimesh.Trimesh(verts, faces, process=False)
    tex = regolith_texture(100 + k)
    mesh.visual = trimesh.visual.TextureVisuals(uv=uv, material=PBRMaterial(
        name='Regolith', baseColorTexture=tex, metallicFactor=0.0, roughnessFactor=0.95))
    scene = trimesh.Scene()
    scene.add_geometry(mesh, node_name='Ground', geom_name='Ground')
    (OUT / 'models' / 'terrain').mkdir(parents=True, exist_ok=True)
    scene.export(OUT / 'models' / 'terrain' / f'{site_id}.glb', file_type='glb', include_normals=True)

    # ---- horizonte real (rayos de 150 km con curvatura) ----
    s_m = np.arange(SCALE, HORIZON_KM * 1000 + 1, SCALE / 2)
    horizon = []
    for az in range(360):
        dvec = np.sin(np.radians(az)) * east + np.cos(np.radians(az)) * north
        pts = p0[None, :] + s_m[:, None] * dvec[None, :]
        hh = height_at(pts[:, 0], pts[:, 1]) - s_m ** 2 / (2 * R)
        horizon.append(round(float(np.degrees(np.max(np.arctan2(hh - (h0 + MAST_M), s_m)))), 3))

    # ---- pendiente (DEM a 80 m) ----
    def slope_at(dx_m, dy_m):
        q = p0 + dx_m * east + dy_m * north
        d = SCALE
        hx = (height_at(np.array([q[0] + d * east[0]]), np.array([q[1] + d * east[1]])) -
              height_at(np.array([q[0] - d * east[0]]), np.array([q[1] - d * east[1]]))) / (2 * d)
        hy = (height_at(np.array([q[0] + d * north[0]]), np.array([q[1] + d * north[1]])) -
              height_at(np.array([q[0] - d * north[0]]), np.array([q[1] - d * north[1]]))) / (2 * d)
        return float(np.degrees(np.arctan(np.hypot(hx, hy)))[0])
    at_site = slope_at(0, 0)
    ring = [slope_at(r * np.sin(np.radians(a)), r * np.cos(np.radians(a))) for r in (50, 100) for a in range(0, 360, 30)]
    meta = {
        'id': site_id, 'name': name, 'lat': lat, 'lon': lon,
        'source': 'LOLA LDEM_80S_80M (NASA/LRO, PDS)', 'demResolutionM': SCALE,
        'siteHeightM': round(h0, 1),
        'terrain': {'file': f'models/terrain/{site_id}.glb', 'extentKm': EXTENT_KM, 'grid': GRID,
                    'minHeightM': round(float(z_m.min()), 1), 'maxHeightM': round(float(z_m.max()), 1),
                    'curvatureIncluded': True},
        'horizon': {'azimuthStepDeg': 1, 'elevationDeg': horizon, 'rayKm': HORIZON_KM,
                    'observerHeightM': MAST_M, 'curvatureIncluded': True},
        'slope': {'atSiteDeg': round(at_site, 2), 'max100mDeg': round(max([at_site] + ring), 2), 'note': 'pendiente regional (DEM a 80 m)'},
    }
    (OUT / 'terrain').mkdir(parents=True, exist_ok=True)
    (OUT / 'terrain' / f'{site_id}.json').write_text(json.dumps(meta))
    print(f"{site_id:18s} h0={h0:8.1f} m  relieve {z_m.min():7.0f}..{z_m.max():6.0f} m  "
          f"horizonte máx {max(horizon):5.2f}° mín {min(horizon):5.2f}°  pendiente {at_site:4.1f}° (máx 100 m {meta['slope']['max100mDeg']:4.1f}°)")


for k, (sid, (name, lat, lon)) in enumerate(SITES.items()):
    build(sid, name, lat, lon, k)
print('ok')
