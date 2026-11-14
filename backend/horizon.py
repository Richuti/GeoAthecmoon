"""Horizonte local, pendiente y recorte de terreno de un sitio, a partir del DEM LOLA."""
import numpy as np

import dem as D

OBSERVER_KM = 0.002      # panel o antena a ~2 m del suelo
MAX_DIST_KM = 150.0      # relieve lejano que todavía puede tapar el Sol rasante


def horizon_deg(dem, lat, lon, step_deg=1):
    """Elevación del horizonte (grados) para cada azimut, desde el norte en sentido horario.

    Incluye la curvatura lunar: un punto a distancia d está d²/2R más abajo.
    """
    x0, y0 = D.project(lat, lon)
    n, e = D.local_axes(lat, lon)
    h0 = D.height_km(dem, np.array([x0]), np.array([y0]))[0] + OBSERVER_KM

    az = np.radians(np.arange(0, 360, step_deg))
    d = np.concatenate([np.arange(D.SCALE_KM, 20, D.SCALE_KM),      # cerca: paso de 80 m
                        np.arange(20, MAX_DIST_KM, 2 * D.SCALE_KM)])  # lejos: paso de 160 m
    dirx = np.cos(az)[:, None] * n[0] + np.sin(az)[:, None] * e[0]
    diry = np.cos(az)[:, None] * n[1] + np.sin(az)[:, None] * e[1]
    h = D.height_km(dem, x0 + dirx * d, y0 + diry * d)
    ang = np.degrees(np.arctan2(h - h0 - d**2 / (2 * D.R_KM), d))
    return np.nanmax(ang, axis=1)


def slope_deg(dem, lat, lon):
    """Pendiente en el sitio y máxima en un radio de 100 m (resolución del DEM: 80 m)."""
    x0, y0 = D.project(lat, lon)
    line, samp = D.xy_to_px(x0, y0)
    l, s = int(round(float(line))), int(round(float(samp)))
    win = np.asarray(dem[l - 3:l + 4, s - 3:s + 4], dtype=float) * 1000  # m
    gy, gx = np.gradient(win, D.SCALE_KM * 1000)
    slope = np.degrees(np.arctan(np.hypot(gx, gy)))
    yy, xx = np.mgrid[-3:4, -3:4]
    near = (np.hypot(yy, xx) * D.SCALE_KM * 1000) <= 100
    return float(slope[3, 3]), float(slope[near].max())


def terrain(dem, lat, lon, size=96, extent_km=20.0):
    """Recorte size×size centrado en el sitio. Fila 0 = norte, columna 0 = oeste. Alturas en m."""
    x0, y0 = D.project(lat, lon)
    n, e = D.local_axes(lat, lon)
    half = extent_km / 2
    north = np.linspace(half, -half, size)[:, None]   # filas: de norte a sur
    east = np.linspace(-half, half, size)[None, :]    # columnas: de oeste a este
    x = x0 + north * n[0] + east * e[0]
    y = y0 + north * n[1] + east * e[1]
    return D.height_km(dem, x, y) * 1000
