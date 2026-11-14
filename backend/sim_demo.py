"""B5 · Réplica en Python del simulador S1/S2/S3 (docs/TAREAS.md) para elegir el caso de la demo.

No es código de la app: sirve para encontrar, con los datos reales de backend/out/, un sitio + preset + fecha
donde "la misión se retrasa" se vea claro, y para que Richard compare sus números con estos.

Uso:  python backend/sim_demo.py            (resumen de todos los sitios y presets)
      python backend/sim_demo.py detalle SITIO PRESET FECHA_ISO
"""
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

OUT = Path(__file__).parent / "out"

# --- S1 · constantes y presets (ilustrativos) ---
SOLAR_CONSTANT_W_M2 = 1361
CHARGE_EFF = DISCHARGE_EFF = 0.90
MIN_SOC = 0.20            # profundidad de descarga máx. 0.80
NOMINAL_BACK = 0.60       # histéresis para salir de supervivencia
SUN_RADIUS_DEG = 0.27

PRESETS = {
    "explorador": dict(panelAreaM2=0.75, panelEfficiency=0.30, batteryKWh=3, baseLoadW=60, instrumentLoadW=90,
                       dataPerDayMb=1500, downlinkMbPerHour=400, survivalThreshold=0.40, missionDays=14),
    "estacion": dict(panelAreaM2=2.0, panelEfficiency=0.30, batteryKWh=10, baseLoadW=150, instrumentLoadW=250,
                     dataPerDayMb=6000, downlinkMbPerHour=1200, survivalThreshold=0.40, missionDays=14),
    "rover": dict(panelAreaM2=0.5, panelEfficiency=0.30, batteryKWh=1.5, baseLoadW=40, instrumentLoadW=120,
                  dataPerDayMb=800, downlinkMbPerHour=300, survivalThreshold=0.40, missionDays=14),
}


# --- tarea 5 · horizonte y visibilidad ---
def horizon_at(mask, az):
    az %= 360.0
    i = int(az) % 360
    f = az - int(az)
    return mask[i] * (1 - f) + mask[(i + 1) % 360] * f


def margin(data, body, i):
    b = data[body]
    return b["el"][i] - horizon_at(data["horizon"]["elevationDeg"], b["az"][i])


def is_lit(data, i):
    return margin(data, "sun", i) > 0


def has_contact(data, i):
    return margin(data, "earth", i) > 0


def sun_fraction(data, i):
    m = margin(data, "sun", i)
    return min(1.0, max(0.0, (m + SUN_RADIUS_DEG) / (2 * SUN_RADIUS_DEG)))


def slope_score(deg):
    return 100.0 if deg <= 5 else max(0.0, 100.0 * (10 - deg) / 5)


def viability(data, start, n):
    rng = range(start, start + n)
    lit = 100 * sum(is_lit(data, i) for i in rng) / n
    com = 100 * sum(has_contact(data, i) for i in rng) / n
    v = 0.45 * lit + 0.35 * com + 0.20 * slope_score(data["slope"]["atSiteDeg"])
    return v, lit, com


# --- S2 · motor ---
def simulate(data, cfg, start):
    h = data["stepHours"]
    n = int(cfg["missionDays"] * 24 / h)
    cap = cfg["batteryKWh"] * 1000
    peak = SOLAR_CONSTANT_W_M2 * cfg["panelAreaM2"] * cfg["panelEfficiency"]
    soc, mode = cap, "nominal"
    queued = sent = produced = 0.0
    min_soc, hours_surv, failed_at, events = 1.0, 0.0, None, []
    prev_lit, prev_com = is_lit(data, start), has_contact(data, start)
    for k in range(n):
        i = start + k
        lit, com = is_lit(data, i), has_contact(data, i)
        if lit != prev_lit:
            events.append((k, "Sale el Sol" if lit else "El Sol se oculta tras el relieve"))
        if com != prev_com:
            events.append((k, "Se abre la ventana con la Tierra" if com else "La Tierra se oculta (Earthset)"))
        prev_lit, prev_com = lit, com

        gen = peak * sun_fraction(data, i)
        load = cfg["baseLoadW"] + (cfg["instrumentLoadW"] if mode == "nominal" else 0)
        if gen >= load:
            soc = min(cap, soc + (gen - load) * h * CHARGE_EFF)
        else:
            soc -= (load - gen) * h / DISCHARGE_EFF

        if mode == "nominal":
            d = cfg["dataPerDayMb"] / 24 * h
            queued += d
            produced += d
        else:
            hours_surv += h
        if com:
            s = min(queued, cfg["downlinkMbPerHour"] * h)
            queued -= s
            sent += s

        frac = soc / cap
        min_soc = min(min_soc, frac)
        if frac <= MIN_SOC:
            failed_at = k
            events.append((k, "Falla: la batería llegó a su mínimo (20 %)"))
            break
        if mode == "nominal" and frac < cfg["survivalThreshold"]:
            mode = "supervivencia"
            events.append((k, f"Batería al {frac*100:.0f} %: modo supervivencia"))
        elif mode == "supervivencia" and frac > NOMINAL_BACK:
            mode = "nominal"
            events.append((k, "Batería recuperada: modo nominal"))
    return dict(survived=failed_at is None, failedAt=failed_at, minSocPct=100 * min_soc,
                hoursInSurvival=hours_surv, dataSentPct=100 * sent / produced if produced else 0,
                energyMarginKWh=(min_soc - MIN_SOC) * cap / 1000, events=events, n=n)


# --- S3 · búsqueda ---
def fits(data, cfg, start):
    return start + int(cfg["missionDays"] * 24 / data["stepHours"]) <= len(data["sun"]["el"])


def delay_tolerance(data, cfg, start):
    step = int(6 / data["stepHours"])
    i = start
    while fits(data, cfg, i):
        if not simulate(data, cfg, i)["survived"]:
            return (i - start) * data["stepHours"] / 24, False, i
        i += step
    return (i - step - start) * data["stepHours"] / 24, True, None


def load_all():
    ids = [s["id"] for s in json.loads((OUT / "sites.json").read_text(encoding="utf-8"))["sites"]]
    return {sid: json.loads((OUT / "sites" / f"{sid}.json").read_text(encoding="utf-8")) for sid in ids}


def t0(data):
    return datetime.fromisoformat(data["start"].replace("Z", "+00:00"))


def fmt(data, i):
    return (t0(data) + timedelta(hours=i * data["stepHours"])).strftime("%d %b %H:%M")


def resumen(all_data):
    for preset, cfg in PRESETS.items():
        print(f"\n=== {preset} (pico {SOLAR_CONSTANT_W_M2*cfg['panelAreaM2']*cfg['panelEfficiency']:.0f} W) ===")
        print(f"{'sitio':18} {'luz%':>5} {'tie%':>5} {'pend':>5} {'inicios OK':>11}  tramos que sobreviven")
        for sid, d in all_data.items():
            n = int(cfg["missionDays"] * 24 / d["stepHours"])
            starts = list(range(0, len(d["sun"]["el"]) - n + 1, 6))
            ok = [simulate(d, cfg, s)["survived"] for s in starts]
            _, lit, com = viability(d, 0, len(d["sun"]["el"]))
            # tramos continuos de inicios que sobreviven
            tramos, cur = [], None
            for s, o in zip(starts, ok):
                if o and cur is None:
                    cur = s
                if not o and cur is not None:
                    tramos.append((cur, s - 6)); cur = None
            if cur is not None:
                tramos.append((cur, starts[-1]))
            txt = ", ".join(f"{fmt(d,a)}→{fmt(d,b)}" for a, b in tramos) or "ninguno"
            print(f"{sid:18} {lit:5.0f} {com:5.0f} {d['slope']['atSiteDeg']:5.1f} {sum(ok):4}/{len(ok):<6}  {txt}")


def detalle(all_data, sid, preset, iso):
    d, cfg = all_data[sid], PRESETS[preset]
    when = datetime.fromisoformat(iso).replace(tzinfo=timezone.utc)
    start = int((when - t0(d)).total_seconds() / 3600 / d["stepHours"])
    r = simulate(d, cfg, start)
    v, lit, com = viability(d, start, r["n"])
    if not r["survived"]:
        v = min(v, 40)
    print(f"{sid} · {preset} · inicio {fmt(d,start)} UTC")
    print(f"  viabilidad {v:.0f} % (luz {lit:.0f} %, Tierra {com:.0f} %, pendiente {d['slope']['atSiteDeg']} °)")
    print(f"  sobrevive={r['survived']}  falla en h={r['failedAt']}  SOC mín {r['minSocPct']:.0f} %  "
          f"supervivencia {r['hoursInSurvival']:.0f} h  datos enviados {r['dataSentPct']:.0f} %  margen {r['energyMarginKWh']:.2f} kWh")
    days, limited, fail_i = delay_tolerance(d, cfg, start)
    print(f"  tolerancia a retraso: {'al menos ' if limited else ''}{days:.2f} días"
          + (f" (primer inicio que falla: {fmt(d, fail_i)})" if fail_i is not None else ""))
    alts = sorted(((s, simulate(x, cfg, start)) for s, x in all_data.items() if s != sid),
                  key=lambda t: (t[1]["survived"], t[1]["minSocPct"]), reverse=True)
    print("  mismo inicio en otros sitios: " + ", ".join(
        f"{s} {'OK' if r2['survived'] else 'falla'} ({r2['minSocPct']:.0f} %)" for s, r2 in alts))
    for k, msg in r["events"][:25]:
        print(f"    día {k//24+1} {fmt(d, start+k)}  {msg}")


if __name__ == "__main__":
    data = load_all()
    if len(sys.argv) > 1 and sys.argv[1] == "detalle":
        detalle(data, *sys.argv[2:5])
    else:
        resumen(data)
