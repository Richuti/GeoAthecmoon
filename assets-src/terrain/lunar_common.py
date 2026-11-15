"""Funciones comunes para trabajar con los productos LOLA polares (estereográfica polar sur)."""
import numpy as np
from PIL import Image

R = 1737400.0  # radio de referencia (m)

SITES = {  # coordenadas aproximadas (verificar con Quickmap, tarea 3.3)
    'shackleton-rim': ('Borde del cráter Shackleton', -89.67, 197.0),
    'connecting-ridge': ('Connecting Ridge', -89.45, 222.0),
    'de-gerlache-rim': ('Borde de de Gerlache', -88.67, 292.0),
    'mons-mouton': ('Mons Mouton', -84.8, 29.2),
    'malapert-massif': ('Macizo Malapert', -86.0, 2.9),
    'nobile-rim': ('Borde de Nobile', -85.4, 37.0),
}


class PolarGrid:
    """Raster LOLA en estereográfica polar sur (pixel registration)."""

    def __init__(self, path, n, scale_m, offset_px, factor, add=0.0, dtype='<i2'):
        self.a = np.fromfile(path, dtype=dtype).reshape(n, n).astype(np.float32) * factor + add
        self.n, self.scale, self.off = n, scale_m, offset_px

    def sample(self, x, y):
        """Bilineal en coordenadas de proyección (m)."""
        s = x / self.scale + self.off
        l = self.off - y / self.scale
        n = self.n
        s0 = np.clip(np.floor(s).astype(int), 0, n - 2); l0 = np.clip(np.floor(l).astype(int), 0, n - 2)
        fs = np.clip(s - s0, 0, 1); fl = np.clip(l - l0, 0, 1)
        a = self.a
        return (a[l0, s0] * (1 - fs) + a[l0, s0 + 1] * fs) * (1 - fl) + (a[l0 + 1, s0] * (1 - fs) + a[l0 + 1, s0 + 1] * fs) * fl


def proj(lat, lon):
    r = 2 * R * np.tan(np.pi / 4 + np.radians(lat) / 2)
    lo = np.radians(lon)
    return r * np.sin(lo), r * np.cos(lo)


def site_frame(lat, lon):
    x, y = proj(lat, lon)
    lo = np.radians(lon)
    return np.array([x, y]), np.array([np.sin(lo), np.cos(lo)]), np.array([np.cos(lo), -np.sin(lo)])


def fbm(size, seed, octaves=6, base=4, gain=0.55):
    rng = np.random.default_rng(seed)
    acc = np.zeros((size, size), np.float32); amp = 1.0; tot = 0.0
    for o in range(octaves):
        k = base * 2 ** o
        g = rng.random((k + 1, k + 1)).astype(np.float32)
        img = np.asarray(Image.fromarray((g * 255).astype(np.uint8)).resize((size, size), Image.BICUBIC), np.float32) / 255
        acc += img * amp; tot += amp; amp *= gain
    return acc / tot


def regolith_albedo(height_m, px_m, seed):
    """Albedo de regolito (sin luz horneada): gris de tierras altas, laderas empinadas algo más claras
    (material más fresco), variación suave a gran escala. Devuelve RGB uint8."""
    gy, gx = np.gradient(height_m, px_m)
    slope = np.degrees(np.arctan(np.hypot(gx, gy)))
    n = height_m.shape[0]
    noise = fbm(n, seed)
    v = 0.40 + (noise - 0.5) * 0.10 + np.clip((slope - 12) / 30, 0, 1) * 0.07
    rgb = np.stack([v * 1.0, v * 0.988, v * 0.968], -1)
    return (np.clip(rgb, 0, 1) * 255).astype(np.uint8)


def normal_map(detail_h, px_m):
    """Mapa de normales tangente (convención OpenGL/glTF: +Y = arriba en la imagen).
    detail_h: altura de detalle (m), filas hacia abajo = hacia +Z / y_proj decreciente."""
    d_row, d_col = np.gradient(detail_h, px_m)
    dx = d_col          # derivada hacia la derecha (+u)
    dup = -d_row        # derivada hacia arriba en la imagen (-v)
    n = np.stack([-dx, -dup, np.ones_like(dx)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return ((n * 0.5 + 0.5) * 255).astype(np.uint8)


def block_resize(a, size):
    return np.asarray(Image.fromarray(a.astype(np.float32), mode='F').resize((size, size), Image.BILINEAR), np.float32)
