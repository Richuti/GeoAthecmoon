"""Genera los JSON finales (formato de docs/CONTRATO_DATOS.md) en backend/out/.

Combina:
  - el relieve LOLA (horizonte, pendiente y terreno), que calcula este backend, y
  - las posiciones del Sol y la Tierra de JPL Horizons, que descarga Richard
    (frontend/public/data/horizons/{id}.json, con `npm run horizons`).

Uso:  python backend/build.py
"""
import json
from pathlib import Path

import numpy as np

import dem as D
import horizon as H

ROOT = Path(__file__).resolve().parent.parent
SITES_FRONT = ROOT / "frontend" / "public" / "data" / "sites.json"
SITES_VERIFIED = Path(__file__).parent / "sites_verified.json"
SITES = SITES_VERIFIED if SITES_VERIFIED.exists() else SITES_FRONT
HORIZONS = ROOT / "frontend" / "public" / "data" / "horizons"
OUT = Path(__file__).parent / "out"

N_SAMPLES = 1440


def r3(a):
    return [round(float(v), 3) for v in a]


def main():
    dem = D.load()
    sites = [s for s in json.loads(SITES.read_text(encoding="utf-8"))["sites"]]
    (OUT / "sites").mkdir(parents=True, exist_ok=True)

    print(f"{'sitio':20s} {'altura':>8s} {'horiz max':>9s} {'horiz min':>9s} {'pend':>5s} {'pend100':>7s} {'luz%':>5s} {'com%':>5s}")
    for s in sites:
        hz = H.horizon_deg(dem, s["lat"], s["lon"])
        at, mx = H.slope_deg(dem, s["lat"], s["lon"])
        ter = H.terrain(dem, s["lat"], s["lon"])

        eph_path = HORIZONS / f"{s['id']}.json"
        eph = json.loads(eph_path.read_text(encoding="utf-8")) if eph_path.exists() else None
        if eph is None:
            print(f"⚠ {s['id']}: falta la caché de Horizons de Richard ({eph_path.name}). Posiciones pendientes.")

        data = {
            "site": s,
            "start": eph["start"] if eph else "2027-01-01T00:00:00Z",
            "stepHours": eph["stepHours"] if eph else 1,
            "horizon": {"azimuthStepDeg": 1, "elevationDeg": r3(hz)},
            "slope": {"atSiteDeg": round(at, 2), "max100mDeg": round(mx, 2)},
            "sun": {"az": eph["sun"]["az"], "el": eph["sun"]["el"]} if eph else {"az": [], "el": []},
            "earth": {"az": eph["earth"]["az"], "el": eph["earth"]["el"]} if eph else {"az": [], "el": []},
            "terrain": {"size": 96, "extentKm": 20, "heightsM": [round(float(v), 1) for v in ter.ravel()]},
            "sources": {"ephemeris": "jpl-horizons" if eph else "model", "terrain": "lola"},
        }
        (OUT / "sites" / f"{s['id']}.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

        lit = com = float("nan")
        if eph:
            def visible(body):
                az = np.asarray(body["az"]) % 360
                hz_at = np.interp(az, np.arange(361), np.append(hz, hz[0]))
                return np.asarray(body["el"]) > hz_at
            lit = visible(eph["sun"]).mean() * 100
            com = visible(eph["earth"]).mean() * 100
        h_site = ter[48, 48]
        print(f"{s['id']:20s} {h_site:8.0f} {hz.max():9.2f} {hz.min():9.2f} {at:5.1f} {mx:7.1f} {lit:5.0f} {com:5.0f}")

    (OUT / "sites.json").write_text(json.dumps({"sites": sites}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nListo: {OUT}")


if __name__ == "__main__":
    main()
