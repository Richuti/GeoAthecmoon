"""Piezas móviles para montar sobre el Módulo Lunar del Apolo (NASA 3D Resources).
Coordenadas finales (glTF): Y arriba, frente/escotilla hacia -Z. 1 unidad = 1 m.
El LM se escala a tamaño real (s = 1.37, ~7 m) y se gira 180° para que la escotilla mire a -Z.
Genera addons.glb con: Mast (mástil fijo), SolarPanel (pivote en bisagra) y Antenna (pivote en base del plato).
"""
import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial
from trimesh.transformations import rotation_matrix, translation_matrix

S = 1.37
DY = -0.10 * S
MAT = {
    'white': PBRMaterial(name='AddonWhite', baseColorFactor=[232, 232, 232, 255], metallicFactor=0.1, roughnessFactor=0.5),
    'gray': PBRMaterial(name='AddonGray', baseColorFactor=[62, 68, 82, 255], metallicFactor=0.7, roughnessFactor=0.35),
    'cells': PBRMaterial(name='SolarCells', baseColorFactor=[22, 34, 78, 255], metallicFactor=0.6, roughnessFactor=0.18),
    'gold': PBRMaterial(name='AddonGold', baseColorFactor=[212, 162, 58, 255], metallicFactor=0.9, roughnessFactor=0.3),
}


def strut(a, b, r, sections=8):
    a, b = np.array(a, float), np.array(b, float)
    d = b - a
    L = np.linalg.norm(d)
    m = trimesh.creation.cylinder(radius=r, height=L, sections=sections)
    z = np.array([0, 0, 1.0])
    ax = np.cross(z, d / L)
    ang = np.arccos(np.clip(np.dot(z, d / L), -1, 1))
    if np.linalg.norm(ax) > 1e-9:
        m.apply_transform(rotation_matrix(ang, ax))
    m.apply_translation((a + b) / 2)
    return m


# ---------- Mástil del panel (fijo, en la parte trasera del módulo de descenso) ----------
base = np.array([0.0, 2.23 * S + DY, 1.6 * S])
hinge = np.array([0.0, 7.55, 1.6 * S])
mast = {'gray': [], 'gold': []}
# mástil tipo celosía: 3 largueros + anillos
for k in range(3):
    a = k * 2 * np.pi / 3
    off = np.array([np.cos(a) * 0.12, 0, np.sin(a) * 0.12])
    mast['gray'].append(strut(base + off, hinge - [0, 0.12, 0] + off, 0.025, 6))
for t in np.linspace(0, 1, 9):
    y = base[1] + (hinge[1] - 0.12 - base[1]) * t
    ring = trimesh.creation.annulus(r_min=0.1, r_max=0.15, height=0.03, sections=12)
    ring.apply_transform(rotation_matrix(-np.pi / 2, [1, 0, 0]))
    ring.apply_translation([base[0], y, base[2]])
    mast['gray'].append(ring)
foot = trimesh.creation.box(extents=[0.5, 0.1, 0.5]); foot.apply_translation(base); mast['gold'].append(foot)
# mástil corto de la antena (sobre la etapa de ascenso)
ant_pivot = np.array([-1.0 * S, 4.8 * S + DY + 0.45, 0.0])
mast['gray'].append(strut(ant_pivot - [0, 0.5, 0], ant_pivot - [0, 0.05, 0], 0.035, 8))

# ---------- SolarPanel (relativo a la bisagra) ----------
PS = 1.5
pw, ph = 2.2 * PS, 1.3 * PS
panel = {'white': [], 'gray': [], 'cells': []}
h = trimesh.creation.cylinder(radius=0.1, height=0.32, sections=14)
h.apply_transform(rotation_matrix(np.pi / 2, [0, 1, 0])); panel['gray'].append(h)
yoke = trimesh.creation.box(extents=[0.1, 0.25, 0.1]); yoke.apply_translation([0, 0.12, 0]); panel['gray'].append(yoke)
cy = 0.25 + ph / 2
frame = trimesh.creation.box(extents=[pw, ph, 0.05]); frame.apply_translation([0, cy, 0]); panel['white'].append(frame)
# 2 alas con celdas (cara hacia -Z)
nx, ny = 10, 6
cw, ch = (pw - 0.16) / nx, (ph - 0.12) / ny
for i in range(nx):
    for j in range(ny):
        c = trimesh.creation.box(extents=[cw * 0.92, ch * 0.9, 0.012])
        c.apply_translation([-pw / 2 + 0.08 + cw * (i + 0.5), cy - ph / 2 + 0.06 + ch * (j + 0.5), -0.031])
        panel['cells'].append(c)
# bisagra central (separa las dos alas)
sp = trimesh.creation.box(extents=[0.05, ph, 0.07]); sp.apply_translation([0, cy, -0.01]); panel['gray'].append(sp)
# refuerzos traseros
for x in (-pw / 3, pw / 3):
    r = trimesh.creation.box(extents=[0.04, ph, 0.06]); r.apply_translation([x, cy, 0.05]); panel['gray'].append(r)

# ---------- Antenna (relativo a la base del plato; apunta a -Z) ----------
R, depth = 0.6, 0.18
rs = np.linspace(0, R, 14)
outer = np.column_stack([rs, -(depth * (rs / R) ** 2)])
inner = np.column_stack([rs[::-1], -(depth * (rs[::-1] / R) ** 2) + 0.02])
dish = trimesh.creation.revolve(np.vstack([outer, inner]), sections=32)
ant = {'white': [dish], 'gray': [], 'gold': []}
# nervaduras detrás del plato
for k in range(8):
    a = k * np.pi / 4
    p = np.array([np.cos(a) * R * 0.95, np.sin(a) * R * 0.95, -depth * 0.9 + 0.03])
    ant['gray'].append(strut([0, 0, 0.04], p, 0.012, 5))
# trípode del alimentador
feed_p = np.array([0, 0, -0.5])
for k in range(3):
    a = k * 2 * np.pi / 3
    ant['gray'].append(strut([np.cos(a) * R * 0.85, np.sin(a) * R * 0.85, -depth * 0.85], feed_p, 0.01, 5))
fd = trimesh.creation.cylinder(radius=0.05, height=0.12, sections=12); fd.apply_translation(feed_p); ant['gold'].append(fd)
gimbal = trimesh.creation.uv_sphere(radius=0.08, count=[10, 12]); ant['gray'].append(gimbal)

# ---------- Escena ----------
scene = trimesh.Scene()


def add(group, parent, prefix, T=None):
    for key, lst in group.items():
        if not lst:
            continue
        m = trimesh.util.concatenate(lst)
        m = trimesh.graph.smooth_shade(m, angle=np.radians(35))
        m.visual = trimesh.visual.TextureVisuals(material=MAT[key])
        scene.add_geometry(m, node_name=f'{prefix}_{key}', geom_name=f'{prefix}_{key}', parent_node_name=parent)


scene.graph.update(frame_to='Mast', frame_from=scene.graph.base_frame, matrix=np.eye(4))
add(mast, 'Mast', 'Mast')
scene.graph.update(frame_to='SolarPanel', frame_from=scene.graph.base_frame, matrix=translation_matrix(hinge))
add(panel, 'SolarPanel', 'SolarPanel')
scene.graph.update(frame_to='Antenna', frame_from=scene.graph.base_frame, matrix=translation_matrix(ant_pivot))
add(ant, 'Antenna', 'Antenna')
scene.export('addons.glb', file_type='glb', include_normals=True)
print('addons ok, tris', sum(len(g.faces) for g in scene.geometry.values()), 'hinge', hinge.round(2), 'antenna', ant_pivot.round(2))
