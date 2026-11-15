"""Exporta el DEM USGS a un GLB estatico. Requiere Pillow; no genera mallas en la app.

Richard autorizo esta conversion offline el 15 nov 2026.
Ejecutar desde cualquier directorio: python frontend/scripts/build-kennedy-terrain.py
"""
import array
import json
import math
from pathlib import Path
import struct
import sys
from urllib.request import urlopen

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets-src/terrain/kennedy'
OUT = ROOT / 'frontend/public/models/kennedy_terrain.glb'
SIZE = 151
RADIUS = 6378137.0


def build():
    meta = json.loads((SOURCE / 'source.json').read_text())
    dem = SOURCE / 'elevation-usgs.tif'
    # Los TIFF de entrada estan excluidos por .gitignore. Una copia nueva del repo
    # puede reconstruir el modelo descargando la exportacion registrada.
    if not dem.exists():
        with urlopen(meta['source'], timeout=60) as response:
            data = response.read()
        if data[:4] not in (b'II*\x00', b'MM\x00*'):
            raise ValueError('La descarga USGS no devolvio un TIFF valido')
        dem.write_bytes(data)
    image = Image.open(dem)
    width, height = image.size
    values = list(image.get_flattened_data() if hasattr(image, 'get_flattened_data') else image.getdata())
    west, south, east, north = meta['bbox3857']
    latitude = math.radians(meta['center']['lat'])
    longitude = math.radians(meta['center']['lon'])
    mercator_x = RADIUS * longitude
    mercator_y = RADIUS * math.log(math.tan(math.pi / 4 + latitude / 2))
    cos_lat = math.cos(latitude)
    # La ortofoto cercana usa el recuadro geografico boundsAround(..., .6).
    delta_lat = .6 / (math.pi * 6371 / 180)
    delta_lon = delta_lat / cos_lat
    positions, normals, uv, indices = [], [], [], []

    def elevation(px, py):
        x, y = int(px), int(py)
        x1, y1 = min(x + 1, width - 1), min(y + 1, height - 1)
        fx, fy = px - x, py - y
        a = values[y * width + x] * (1 - fx) + values[y * width + x1] * fx
        b = values[y1 * width + x] * (1 - fx) + values[y1 * width + x1] * fx
        value = a * (1 - fy) + b * fy
        if not math.isfinite(value) or abs(value) > 10000:
            raise ValueError('DEM con elevaciones invalidas o sin datos')
        return value

    for row in range(SIZE):
        py = row * (height - 1) / (SIZE - 1)
        my = north - (py + .5) * (north - south) / height
        lat = math.degrees(2 * math.atan(math.exp(my / RADIUS)) - math.pi / 2)
        for col in range(SIZE):
            px = col * (width - 1) / (SIZE - 1)
            mx = west + (px + .5) * (east - west) / width
            lon = math.degrees(mx / RADIUS)
            positions.extend([(mx - mercator_x) * cos_lat, elevation(px, py), -(my - mercator_y) * cos_lat])
            # Norte = v1 para la textura Three compartida (flipY=true).
            uv.extend([.5 + (lon - meta['center']['lon']) / (2 * delta_lon), .5 + (lat - meta['center']['lat']) / (2 * delta_lat)])

    for row in range(SIZE):
        for col in range(SIZE):
            l, r = (row * SIZE + max(0, col - 1)) * 3, (row * SIZE + min(SIZE - 1, col + 1)) * 3
            n, s = (max(0, row - 1) * SIZE + col) * 3, (min(SIZE - 1, row + 1) * SIZE + col) * 3
            dx = (positions[r + 1] - positions[l + 1]) / (positions[r] - positions[l])
            dz = (positions[s + 1] - positions[n + 1]) / (positions[s + 2] - positions[n + 2])
            norm = math.sqrt(dx * dx + 1 + dz * dz)
            normals.extend([-dx / norm, 1 / norm, -dz / norm])
    for row in range(SIZE - 1):
        for col in range(SIZE - 1):
            a = row * SIZE + col
            indices.extend([a, a + SIZE, a + 1, a + 1, a + SIZE, a + SIZE + 1])

    mins = [min(positions[axis::3]) for axis in range(3)]
    maxs = [max(positions[axis::3]) for axis in range(3)]
    assert len(indices) // 3 == 45000 and max(indices) < SIZE * SIZE
    assert all(normals[i] > 0 for i in range(1, len(normals), 3))
    assert -2 < mins[1] < 0 and 14 < maxs[1] < 15, 'No se conserva el relieve real del recorte'
    assert all(0 <= v <= 1 for v in uv)

    buffer = bytearray()
    views, accessors = [], []
    for data, code, component, kind, count in [
        (positions, 'f', 5126, 'VEC3', SIZE * SIZE),
        (normals, 'f', 5126, 'VEC3', SIZE * SIZE),
        (uv, 'f', 5126, 'VEC2', SIZE * SIZE),
        (indices, 'H', 5123, 'SCALAR', len(indices)),
    ]:
        while len(buffer) % 4:
            buffer.append(0)
        values_array = array.array(code, data)
        if sys.byteorder != 'little':
            values_array.byteswap()
        block = values_array.tobytes()
        views.append({'buffer': 0, 'byteOffset': len(buffer), 'byteLength': len(block), 'target': 34963 if kind == 'SCALAR' else 34962})
        accessors.append({'bufferView': len(views) - 1, 'componentType': component, 'count': count, 'type': kind})
        buffer.extend(block)
    accessors[0].update(min=mins, max=maxs)
    model = {
        'asset': {'version': '2.0', 'generator': 'GEOATHECMOON USGS DEM offline exporter'},
        'scene': 0, 'scenes': [{'nodes': [0]}],
        'nodes': [{'mesh': 0, 'name': 'KennedyTerrain'}],
        'meshes': [{'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1, 'TEXCOORD_0': 2}, 'indices': 3, 'material': 0}]}],
        'materials': [{'name': 'KennedyNAIP', 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 0, 'roughnessFactor': 1}}],
        'buffers': [{'byteLength': len(buffer)}], 'bufferViews': views, 'accessors': accessors,
        'extras': {'source': meta['source'], 'units': 'meters', 'verticalExaggeration': 1, 'center': meta['center'], 'textureAssignedByViewer': '/textures/flight/kennedy-pad-naip.jpg'},
    }
    encoded = json.dumps(model, separators=(',', ':')).encode()
    encoded += b' ' * (-len(encoded) % 4)
    buffer += b'\x00' * (-len(buffer) % 4)
    length = 12 + 8 + len(encoded) + 8 + len(buffer)
    OUT.write_bytes(struct.pack('<III', 0x46546c67, 2, length) + struct.pack('<I4s', len(encoded), b'JSON') + encoded + struct.pack('<I4s', len(buffer), b'BIN\x00') + buffer)
    print(f'{OUT.name}: {SIZE * SIZE} vertices, {len(indices) // 3} triangles, {length:,} bytes; elevation {mins[1]:.2f} to {maxs[1]:.2f} m')


if __name__ == '__main__':
    build()
