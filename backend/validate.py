"""B4 · Material de validación para todo 2027 (8760 horas).

1. Nuestros valores por sitio (horizonte LOLA de backend/out/ + JPL Horizons) y el panorama del horizonte.
2. Validación cruzada: % de luz y de contacto con NUESTRO horizonte frente al horizonte que trae la app
   (frontend/public/data/sites/*.json). Las efemérides son las mismas, así que la diferencia mide solo el relieve.
   Meta: menos de 0.5 puntos.

Salida: docs/validacion/valores.md y docs/validacion/{id}_horizonte.png.
Uso: python backend/build.py && python backend/validate.py   (no toca frontend/)
"""
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

import dem as D

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(__file__).parent / "out"
APP = ROOT / "frontend" / "public" / "data"
DOCS = ROOT / "docs" / "validacion"
BG, SUN, EARTH, GROUND = "#05070d", "#f5a524", "#4ea8ff", "#3a3f4b"
GOAL = 0.5


def load(base):
    ids = [s["id"] for s in json.loads((base / "sites.json").read_text(encoding="utf-8"))["sites"]]
    return {sid: json.loads((base / "sites" / f"{sid}.json").read_text(encoding="utf-8")) for sid in ids}


def visible_pct(d, body):
    """Regla del contrato: visible si el > horizonte(az), con interpolación lineal entre grados (como horizonAt)."""
    hz = np.asarray(d["horizon"]["elevationDeg"], dtype=float)
    step = d["horizon"]["azimuthStepDeg"]
    az = np.asarray(d[body]["az"], dtype=float) % 360
    grid = np.arange(len(hz) + 1) * step
    hz_at = np.interp(az, grid, np.append(hz, hz[0]))
    return 100 * float((np.asarray(d[body]["el"]) > hz_at).mean())


def panorama(sid, d, name):
    hz = np.array(d["horizon"]["elevationDeg"])
    az = np.arange(len(hz)) * d["horizon"]["azimuthStepDeg"]
    fig, ax = plt.subplots(figsize=(12, 3.6), dpi=130, facecolor=BG)
    ax.set_facecolor(BG)
    ax.fill_between(np.append(az, 360), np.append(hz, hz[0]), -3, color=GROUND, lw=0, label="Relieve LOLA (horizonte)")
    for body, color, label in (("sun", SUN, "Sol"), ("earth", EARTH, "Tierra")):
        ax.scatter(d[body]["az"], d[body]["el"], s=1, color=color, label=f"{label} (JPL Horizons, cada hora)")
    ax.set_xlim(0, 360)
    ax.set_ylim(min(-3, hz.min() - 0.5), max(10, hz.max() + 1))
    ax.set_xticks(range(0, 361, 45), ["N", "NE", "E", "SE", "S", "SO", "O", "NO", "N"])
    ax.set_ylabel("Elevación (°)", color="white")
    ax.tick_params(colors="white")
    for s in ax.spines.values():
        s.set_color("#333")
    ax.set_title(f"{name}: horizonte real (LOLA) y trayectorias de todo 2027", color="white", loc="left")
    ax.legend(loc="upper right", fontsize=8, facecolor=BG, labelcolor="white", edgecolor="#333", markerscale=4)
    fig.tight_layout()
    fig.savefig(DOCS / f"{sid}_horizonte.png", facecolor=BG)
    plt.close(fig)


def main():
    DOCS.mkdir(parents=True, exist_ok=True)
    dem = D.load()
    ours, app = load(OUT), load(APP)
    rows, cross, worst = [], [], 0.0
    for sid, d in ours.items():
        s, a = d["site"], app[sid]
        n = len(d["sun"]["el"])
        assert n == len(a["sun"]["el"]), f"{sid}: {n} muestras nuestras frente a {len(a['sun']['el'])} de la app"
        x, y = D.project(s["lat"], s["lon"])
        h_m = float(D.height_km(dem, np.array([x]), np.array([y]))[0]) * 1000
        lit, com = visible_pct(d, "sun"), visible_pct(d, "earth")
        lit_a, com_a = visible_pct(a, "sun"), visible_pct(a, "earth")
        dl, dc = lit - lit_a, com - com_a
        worst = max(worst, abs(dl), abs(dc))
        hz = d["horizon"]["elevationDeg"]
        rows.append(f"| {s['name']} | {s['lat']}, {s['lon']} | {h_m:,.0f} | {d['slope']['atSiteDeg']} | "
                    f"{lit:.1f} % | {com:.1f} % | {max(hz):.1f}° (az {int(np.argmax(hz))}°) |")
        ok = "✅" if max(abs(dl), abs(dc)) < GOAL else "⚠"
        cross.append(f"| {s['name']} | {lit:.1f} % | {lit_a:.1f} % | {dl:+.1f} | {com:.1f} % | {com_a:.1f} % | {dc:+.1f} | {ok} |")
        panorama(sid, d, s["name"])
        print(f"{sid:18s} n={n} luz {lit:5.1f} vs app {lit_a:5.1f} ({dl:+.2f})  Tierra {com:5.1f} vs app {com_a:5.1f} ({dc:+.2f})")
    start = next(iter(ours.values()))["start"][:10]
    (DOCS / "valores.md").write_text(
        f"# Valores por sitio · todo 2027\n\n"
        f"Periodo: desde el {start}, cada hora, {n} muestras (un año completo: cubre las estaciones de la luz polar). "
        f"Efemérides de JPL Horizons; horizonte con el DEM LOLA de 80 m/px (rayos de 150 km con curvatura). "
        f"Generado con `python backend/build.py && python backend/validate.py`.\n\n"
        "## Nuestros valores\n\n"
        "| Sitio | Lat, lon E | Altura (m) | Pendiente (°) | Luz | Tierra visible | Horizonte máx. |\n"
        "|---|---|---|---|---|---|---|\n" + "\n".join(rows) + "\n\n"
        "## Validación cruzada con la app\n\n"
        "Mismo Sol y misma Tierra (JPL Horizons). Solo cambia quién calculó el horizonte: el pipeline de Python "
        "(`backend/horizon.py`) o el de la app (`npm run horizon`). Meta: diferencia menor de 0.5 puntos.\n\n"
        "| Sitio | Luz (Python) | Luz (app) | Dif. | Tierra (Python) | Tierra (app) | Dif. | |\n"
        "|---|---|---|---|---|---|---|---|\n" + "\n".join(cross) + "\n\n"
        f"**Diferencia máxima: {worst:.2f} puntos.**\n", encoding="utf-8")
    print(f"\ndiferencia máxima {worst:.2f} puntos (meta < {GOAL})")


if __name__ == "__main__":
    main()
