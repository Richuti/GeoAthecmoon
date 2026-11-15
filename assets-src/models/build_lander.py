"""Genera lander.glb para GEOATHECMOON.
Coordenadas glTF: Y arriba, frente/norte hacia -Z, este hacia +X. 1 unidad = 1 m.
Jerarquía:
  Lander (raíz)
   └ Body           (grupo; mallas Body_gold, Body_white, Body_gray)
      ├ SolarPanel  (pivote en la bisagra; reposo vertical, celdas hacia -Z)
      └ Antenna     (pivote en la base del plato; reposo apuntando a -Z)
"""
import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial
from trimesh.transformations import rotation_matrix, translation_matrix

MAT = {
    'white': PBRMaterial(name='White', baseColorFactor=[232, 232, 232, 255], metallicFactor=0.1, roughnessFactor=0.55),
    'gray': PBRMaterial(name='Gray', baseColorFactor=[70, 78, 96, 255], metallicFactor=0.6, roughnessFactor=0.4),
    'gold': PBRMaterial(name='GoldFoil', baseColorFactor=[212, 162, 58, 255], metallicFactor=0.9, roughnessFactor=0.3),
}

Y_UP = rotation_matrix(-np.pi / 2, [1, 0, 0])  # trimesh crea cilindros en Z → pasar a Y


def cyl(r, h, sections=8, r2=None):
    if r2 is None:
        m = trimesh.creation.cylinder(radius=r, height=h, sections=sections)
    else:
        m = trimesh.creation.cone(radius=max(r, r2), height=h, sections=sections)
        # cono truncado: usar revolve
        prof = np.array([[0, -h / 2], [r, -h / 2], [r2, h / 2], [0, h / 2]])
        m = trimesh.creation.revolve(prof, sections=sections)
    m.apply_transform(Y_UP)
    return m


def at(m, x=0, y=0, z=0):
    m.apply_translation([x, y, z])
    return m


def strut(a, b, r, sections=6):
    a, b = np.array(a, float), np.array(b, float)
    d = b - a
    L = np.linalg.norm(d)
    m = trimesh.creation.cylinder(radius=r, height=L, sections=sections)  # eje Z
    z = np.array([0, 0, 1.0])
    axis = np.cross(z, d / L)
    ang = np.arccos(np.clip(np.dot(z, d / L), -1, 1))
    if np.linalg.norm(axis) > 1e-9:
        m.apply_transform(rotation_matrix(ang, axis))
    m.apply_translation((a + b) / 2)
    return m


parts = {'gold': [], 'white': [], 'gray': []}

# ---------- Body ----------
base_y, body_h, body_r = 1.1, 1.3, 1.05
top_y = base_y + body_h + 0.08
oct_rot = rotation_matrix(np.pi / 8, [0, 1, 0])  # caras planas hacia los ejes

b = at(cyl(body_r, body_h, 8), y=base_y + body_h / 2); b.apply_transform(oct_rot); parts['gold'].append(b)
t = at(cyl(body_r * 1.03, 0.08, 8), y=base_y + body_h + 0.04); t.apply_transform(oct_rot); parts['white'].append(t)
f = at(cyl(body_r * 0.96, 0.1, 8), y=base_y - 0.05); f.apply_transform(oct_rot); parts['gray'].append(f)
# tobera (cono truncado abierto hacia abajo)
parts['gray'].append(at(cyl(0.3, 0.45, 16, r2=0.12), y=base_y - 0.32))
# antena de baja ganancia y sensores (detalle pequeño)
parts['white'].append(at(cyl(0.12, 0.1, 10), x=0.55, y=top_y + 0.05, z=0.45))
# tanques
for i in range(4):
    a = np.pi / 4 + i * np.pi / 2
    s = trimesh.creation.uv_sphere(radius=0.32, count=[10, 14])
    parts['white'].append(at(s, np.cos(a) * (body_r + 0.12), base_y + 0.45, np.sin(a) * (body_r + 0.12)))
# patas
foot_r = 2.1
for i in range(4):
    a = i * np.pi / 2 + np.pi / 4
    top = [np.cos(a) * body_r * 0.9, base_y + 0.25, np.sin(a) * body_r * 0.9]
    foot = np.array([np.cos(a) * foot_r, 0.12, np.sin(a) * foot_r])
    parts['gray'].append(strut(top, foot, 0.06, 8))
    top2 = np.array([np.cos(a) * body_r * 0.95, base_y - 0.05, np.sin(a) * body_r * 0.95])
    mid = np.array(top) + (foot - np.array(top)) * 0.6
    parts['gray'].append(strut(top2, mid, 0.035, 6))
    # puntales laterales hacia el pie
    for da in (-0.5, 0.5):
        side = np.array([np.cos(a + da) * body_r * 0.95, base_y + 0.1, np.sin(a + da) * body_r * 0.95])
        parts['gray'].append(strut(side, mid, 0.025, 6))
    parts['gray'].append(at(cyl(0.3, 0.08, 16, r2=0.26), foot[0], 0.04, foot[2]))
# mástil del panel y de la antena (forman parte de Body)
hinge = np.array([0, top_y + 0.9, 0.2])
parts['gray'].append(at(cyl(0.06, 0.9, 10), 0, top_y + 0.45, 0.2))
ant_pivot = np.array([-0.6, top_y + 0.5, -0.45])
parts['gray'].append(at(cyl(0.04, 0.5, 8), -0.6, top_y + 0.25, -0.45))

# ---------- SolarPanel (geometría relativa a la bisagra) ----------
panel = {'white': [], 'gray': []}
h = trimesh.creation.cylinder(radius=0.09, height=0.28, sections=12)
h.apply_transform(rotation_matrix(np.pi / 2, [0, 1, 0]))  # eje X
panel['gray'].append(h)
pw, ph = 2.2, 1.3
frame = trimesh.creation.box(extents=[pw, ph, 0.05]); frame.apply_translation([0, 0.75, 0]); panel['white'].append(frame)
cells = trimesh.creation.box(extents=[pw - 0.12, ph - 0.12, 0.02]); cells.apply_translation([0, 0.75, -0.032]); panel['gray'].append(cells)
for k in range(-3, 4):
    l = trimesh.creation.box(extents=[0.018, ph - 0.12, 0.006]); l.apply_translation([k * 0.29, 0.75, -0.044]); panel['white'].append(l)
l = trimesh.creation.box(extents=[pw - 0.12, 0.018, 0.006]); l.apply_translation([0, 0.75, -0.044]); panel['white'].append(l)
# brazo de unión bisagra-panel
arm = trimesh.creation.box(extents=[0.08, 0.12, 0.08]); arm.apply_translation([0, 0.06, 0]); panel['gray'].append(arm)

# ---------- Antenna (geometría relativa a la base del plato) ----------
ant = {'white': [], 'gray': [], 'gold': []}
# plato parabólico: perfil revolucionado sobre Z, abre hacia -Z
R, depth = 0.45, 0.14
rs = np.linspace(0, R, 10)
outer = np.column_stack([rs, -(depth * (rs / R) ** 2)])
inner = np.column_stack([rs[::-1], -(depth * (rs[::-1] / R) ** 2) + 0.025])
prof = np.vstack([outer, inner])
dish = trimesh.creation.revolve(prof, sections=24)  # eje Z, se curva hacia -Z
dish.apply_translation([0, 0, 0.0])
ant['white'].append(dish)
rod = trimesh.creation.cylinder(radius=0.015, height=0.36, sections=6); rod.apply_translation([0, 0, -0.18]); ant['gray'].append(rod)
feed = trimesh.creation.uv_sphere(radius=0.045, count=[8, 10]); feed.apply_translation([0, 0, -0.37]); ant['gold'].append(feed)
gimbal = trimesh.creation.uv_sphere(radius=0.07, count=[8, 10]); ant['gray'].append(gimbal)

# ---------- Escena ----------
scene = trimesh.Scene()
scene.graph.update(frame_to='Lander', frame_from=scene.graph.base_frame, matrix=np.eye(4))
scene.graph.update(frame_to='Body', frame_from='Lander', matrix=np.eye(4))


def add_group(group, parent, prefix):
    for key, lst in group.items():
        if not lst:
            continue
        m = trimesh.util.concatenate(lst)
        m = trimesh.graph.smooth_shade(m, angle=np.radians(35))  # bordes duros, curvas suaves
        m.visual = trimesh.visual.TextureVisuals(material=MAT[key])
        scene.add_geometry(m, node_name=f'{prefix}_{key}', geom_name=f'{prefix}_{key}', parent_node_name=parent)


add_group(parts, 'Body', 'Body')
scene.graph.update(frame_to='SolarPanel', frame_from='Body', matrix=translation_matrix(hinge))
add_group(panel, 'SolarPanel', 'SolarPanel')
scene.graph.update(frame_to='Antenna', frame_from='Body', matrix=translation_matrix(ant_pivot))
add_group(ant, 'Antenna', 'Antenna')

out = '/mnt/user-data/outputs/lander.glb'
scene.export(out, file_type='glb', include_normals=True)
tris = sum(len(g.faces) for g in scene.geometry.values())
print('triángulos:', tris)
print('bounds:', scene.bounds.round(2).tolist())
