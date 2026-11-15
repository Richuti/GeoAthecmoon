"""Capas de iluminación OFICIALES del equipo LOLA (NASA/GSFC, Mazarico et al. 2011), recortadas para cada
terreno de 20 km y para el mapa del polo sur:
  - AVGVISIB_75S_120M_201608.IMG       : fracción promedio del tiempo con Sol (cualquier parte del disco)
  - AVGVISIB_75S_120M_201608_EARTH.IMG : fracción promedio del tiempo con la Tierra visible
Salida (texturas para poner sobre el terreno, mismas UV que el albedo):
  textures/illumination/{id}_sun.jpg, {id}_earth.jpg, south_pole_sun.jpg, south_pole_earth.jpg
  illumination_summary.json : valores en cada sitio (para validar nuestros cálculos y para el pitch)
Escala de color: Sol = negro (sombra permanente, en azul oscuro) → ámbar → blanco; Tierra = negro → azul → cian.
Uso: python build_illumination.py <AVGVISIB_sun.IMG> <AVGVISIB_earth.IMG> <salida>
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

from lunar_common import SITES, PolarGrid, site_frame

SUN, EARTH, OUT = sys.argv[1], sys.argv[2], Path(sys.argv[3])
sun = PolarGrid(SUN, 7624, 120.0, 3811.5, 0.00004)
earth = PolarGrid(EARTH, 7624, 120.0, 3811.5, 0.00004)
(OUT / 'textures' / 'illumination').mkdir(parents=True, exist_ok=True)

SUN_STOPS = [(0.0, (12, 18, 60)), (0.002, (0, 0, 0)), (0.25, (90, 30, 10)), (0.5, (200, 90, 20)),
             (0.75, (255, 181, 71)), (1.0, (255, 245, 220))]
EARTH_STOPS = [(0.0, (0, 0, 0)), (0.25, (10, 30, 90)), (0.5, (30, 80, 200)), (0.75, (60, 160, 240)), (1.0, (200, 245, 255))]


def colorize(v, stops):
    v = np.clip(v, 0, 1)
    xs = np.array([s[0] for s in stops]); cs = np.array([s[1] for s in stops], np.float32)
    out = np.stack([np.interp(v, xs, cs[:, k]) for k in range(3)], -1)
    return out.astype(np.uint8)


def site_grid(lat, lon, ext_km=20.0, n=2048):
    p0, north, east = site_frame(lat, lon)
    t = np.linspace(-0.5, 0.5, n) * ext_km * 1000
    e, nn = np.meshgrid(t, -t)                 # fila 0 = norte, columna 0 = oeste (igual que el terreno)
    P = p0 + e[..., None] * east + nn[..., None] * north
    return P[..., 0], P[..., 1], p0


summary = {'source': 'LOLA EXTRAS/ILLUMINATION AVGVISIB_75S_120M_201608 (NASA/GSFC, Mazarico et al. 2011)',
           'period': '2009-07-13 a 2013-07-18', 'sites': {}}
for sid, (name, lat, lon) in SITES.items():
    X, Y, p0 = site_grid(lat, lon)
    s = sun.sample(X, Y); e = earth.sample(X, Y)
    Image.fromarray(colorize(s, SUN_STOPS)).save(OUT / 'textures' / 'illumination' / f'{sid}_sun.jpg', quality=90)
    Image.fromarray(colorize(e, EARTH_STOPS)).save(OUT / 'textures' / 'illumination' / f'{sid}_earth.jpg', quality=90)
    sv = float(sun.sample(np.array([p0[0]]), np.array([p0[1]]))[0]); ev = float(earth.sample(np.array([p0[0]]), np.array([p0[1]]))[0])
    # mejor punto iluminado dentro de 1 km del sitio (sugerencia para la tarea 3.3)
    c = 1024; w = int(1000 / (20000 / 2047))
    sub = s[c - w:c + w, c - w:c + w]; k = np.unravel_index(np.argmax(sub), sub.shape)
    summary['sites'][sid] = {'name': name, 'sunPct': round(sv * 100, 1), 'earthPct': round(ev * 100, 1),
                             'permanentShadowPctOfTile': round(float((s < 0.002).mean() * 100), 1),
                             'bestSunPctWithin1km': round(float(sub[k] * 100), 1)}
    print(f"{sid:18s} Sol {sv*100:5.1f}%  Tierra {ev*100:5.1f}%  mejor punto a <1 km: {sub[k]*100:5.1f}%")

# mapa del polo sur (360 x 360 km, mismas UV que south_pole_map.glb)
t = np.linspace(-180, 180, 2048) * 1000
X, Y = np.meshgrid(t, -t)
Image.fromarray(colorize(sun.sample(X, Y), SUN_STOPS)).save(OUT / 'textures' / 'illumination' / 'south_pole_sun.jpg', quality=90)
Image.fromarray(colorize(earth.sample(X, Y), EARTH_STOPS)).save(OUT / 'textures' / 'illumination' / 'south_pole_earth.jpg', quality=90)
(OUT / 'illumination_summary.json').write_text(json.dumps(summary, indent=1, ensure_ascii=False))
print('ok')
