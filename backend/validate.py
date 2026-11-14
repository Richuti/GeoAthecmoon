"""B4 · Material de validación: nuestros valores por sitio y el panorama del horizonte con el Sol y la Tierra.

Salida: docs/validacion/valores.md (tabla para comparar con Quickmap) y docs/validacion/{id}_horizonte.png.
Uso: python backend/validate.py
"""
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

import dem as D
from sim_demo import is_lit, has_contact, load_all

DOCS = Path(__file__).parent.parent / "docs" / "validacion"
BG, SUN, EARTH, GROUND = "#05070d", "#f5a524", "#4ea8ff", "#3a3f4b"


def panorama(sid, d, name):
    hz = np.array(d["horizon"]["elevationDeg"])
    az = np.arange(len(hz)) * d["horizon"]["azimuthStepDeg"]
    fig, ax = plt.subplots(figsize=(12, 3.6), dpi=130, facecolor=BG)
    ax.set_facecolor(BG)
    ax.fill_between(np.append(az, 360), np.append(hz, hz[0]), -3, color=GROUND, lw=0, label="Relieve LOLA (horizonte)")
    for body, color, label in (("sun", SUN, "Sol"), ("earth", EARTH, "Tierra")):
        a, e = np.array(d[body]["az"]), np.array(d[body]["el"])
        ax.scatter(a, e, s=2, color=color, label=f"{label} (JPL Horizons, cada hora)")
    ax.set_xlim(0, 360)
    ax.set_ylim(min(-3, hz.min() - 0.5), max(10, hz.max() + 1))
    ax.set_xticks(range(0, 361, 45), ["N", "NE", "E", "SE", "S", "SO", "O", "NO", "N"])
    ax.set_ylabel("Elevación (°)", color="white")
    ax.tick_params(colors="white")
    for s in ax.spines.values():
        s.set_color("#333")
    ax.set_title(f"{name}: horizonte real (LOLA) y trayectorias del 1 ene al 1 mar de 2027", color="white", loc="left")
    ax.legend(loc="upper right", fontsize=8, facecolor=BG, labelcolor="white", edgecolor="#333", markerscale=4)
    fig.tight_layout()
    fig.savefig(DOCS / f"{sid}_horizonte.png", facecolor=BG)
    plt.close(fig)


def main():
    DOCS.mkdir(parents=True, exist_ok=True)
    dem = D.load()
    names = {s["id"]: s["name"] for s in json.loads((Path(__file__).parent / "out" / "sites.json")
                                                    .read_text(encoding="utf-8"))["sites"]}
    rows = []
    for sid, d in load_all().items():
        s = d["site"]
        x, y = D.project(s["lat"], s["lon"])
        h_m = float(D.height_km(dem, np.array([x]), np.array([y]))[0]) * 1000
        n = len(d["sun"]["el"])
        lit = 100 * sum(is_lit(d, i) for i in range(n)) / n
        com = 100 * sum(has_contact(d, i) for i in range(n)) / n
        hz = d["horizon"]["elevationDeg"]
        rows.append(f"| {names[sid]} | {s['lat']}, {s['lon']} | {h_m:,.0f} | | {d['slope']['atSiteDeg']} | | "
                    f"{lit:.0f} % | | {com:.0f} % | {max(hz):.1f}° (az {int(np.argmax(hz))}°) |")
        panorama(sid, d, names[sid])
        print(sid, f"{h_m:.0f} m", f"luz {lit:.0f}%", f"Tierra {com:.0f}%")
    (DOCS / "valores.md").write_text(
        "| Sitio | Lat, lon E | Altura nuestra (m) | Altura Quickmap (m) | Pendiente nuestra (°) | Pendiente Quickmap (°) "
        "| Luz nuestra | Iluminación Quickmap | Tierra visible | Horizonte máx. |\n"
        "|---|---|---|---|---|---|---|---|---|---|\n" + "\n".join(rows) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
