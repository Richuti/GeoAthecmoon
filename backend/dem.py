"""Lector del DEM LOLA del polo sur (LDEM_80S_80M, PDS Geosciences).

Archivo: backend/data/ldem_80s_80m_float.img (7600 x 7600 float32, little-endian).
Cada valor es la altura en km sobre una esfera de 1737.4 km.
Proyección estereográfica polar centrada en el polo sur, 80 m/píxel.
"""
from pathlib import Path

import numpy as np

R_KM = 1737.4
SIZE = 7600
SCALE_KM = 0.080          # 80 m/píxel
OFFSET_PX = 3799.5        # LINE/SAMPLE_PROJECTION_OFFSET del .lbl (centro = polo)
DEM_PATH = Path(__file__).parent / "data" / "ldem_80s_80m_float.img"


def load(path: Path = DEM_PATH) -> np.ndarray:
    """Mapa de alturas en km (memmap: no carga los 231 MB en RAM)."""
    expected = SIZE * SIZE * 4
    if not path.exists() or path.stat().st_size != expected:
        size = path.stat().st_size if path.exists() else 0
        raise SystemExit(f"DEM incompleto: {path} tiene {size:,} bytes y debería tener {expected:,}. "
                         "Vuelve a descargarlo con curl -C - (continúa donde quedó).")
    return np.memmap(path, dtype="<f4", mode="r", shape=(SIZE, SIZE))


def project(lat, lon):
    """Lat/lon (grados, longitud este) → (x, y) en km en el plano estereográfico polar sur."""
    lat = np.radians(lat)
    lon = np.radians(lon)
    rho = 2 * R_KM * np.tan(np.pi / 4 + lat / 2)
    return rho * np.sin(lon), rho * np.cos(lon)


def xy_to_px(x, y):
    """(x, y) en km → (línea, columna) fraccionarias. Lon 0 queda arriba de la imagen."""
    return OFFSET_PX - np.asarray(y) / SCALE_KM, OFFSET_PX + np.asarray(x) / SCALE_KM


def height_km(dem, x, y):
    """Altura bilineal (km) en puntos (x, y) del plano. NaN fuera del mapa."""
    line, samp = xy_to_px(x, y)
    line = np.asarray(line, dtype=float)
    samp = np.asarray(samp, dtype=float)
    ok = (line >= 0) & (line < SIZE - 1) & (samp >= 0) & (samp < SIZE - 1)
    out = np.full(line.shape, np.nan)
    l, s = line[ok], samp[ok]
    l0, s0 = np.floor(l).astype(int), np.floor(s).astype(int)
    tl, ts = l - l0, s - s0
    a = dem[l0, s0]
    b = dem[l0, s0 + 1]
    c = dem[l0 + 1, s0]
    d = dem[l0 + 1, s0 + 1]
    out[ok] = (a * (1 - ts) + b * ts) * (1 - tl) + (c * (1 - ts) + d * ts) * tl
    return out


def local_axes(lat, lon, eps=1e-4):
    """Vectores unitarios norte y este LOCALES en el plano (en el polo sur, 'norte' = alejarse del polo)."""
    x0, y0 = project(lat, lon)
    xn, yn = project(lat + eps, lon)
    xe, ye = project(lat, lon + eps)
    n = np.array([xn - x0, yn - y0])
    e = np.array([xe - x0, ye - y0])
    return n / np.linalg.norm(n), e / np.linalg.norm(e)


if __name__ == "__main__":
    # Prueba de cordura (hito B1): las alturas tienen que tener sentido.
    dem = load()
    checks = {
        "Polo sur (borde de Shackleton)": (-90.0, 0.0),
        "Centro de Shackleton (fondo)": (-89.67, 129.78),
        "Borde de Shackleton (sitio)": (-89.67, 197.0),
        "Macizo Malapert (sitio)": (-86.0, 2.9),
        "Mons Mouton (sitio)": (-84.8, 29.2),
        "Fondo de Shackleton (reflejo si x estuviera invertido)": (-89.67, -129.78),
    }
    for name, (lat, lon) in checks.items():
        x, y = project(lat, lon)
        print(f"{name:55s} {height_km(dem, np.array([x]), np.array([y]))[0]:+.3f} km")
