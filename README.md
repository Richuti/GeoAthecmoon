# GEOATHECMOON · Lunar Landing Site Navigator

**English** · [Español](README.es.md)

Project by team **GeoAthectum** for the **NASA Space Apps Challenge 2026**, challenge *Lunar Landing Site Navigator*.

> **In 10 seconds you know whether a site and a date work at the lunar south pole, and what happens if your mission is delayed.**

**Live app:** https://geoathectum.vercel.app (English by default; switch to Spanish with the EN/ES button, bottom left).

At the Moon's south pole the Sun never climbs more than a couple of degrees: a ridge several kilometers away is enough to leave a site in darkness or cut contact with Earth. GEOATHECMOON compares **6 south pole sites** over **all of 2027, hour by hour**, using real Sun and Earth positions (JPL Horizons) and real topography (LOLA). Then it **simulates your lander**: battery, solar panels and data downlink.

## How to use it

**Planner** (the main entry point), in two steps: prepare and result. Site, date and duration are chosen on the same screen. The guide can be reopened from "Help".

1. **Prepare the plan:** choose the date (UTC), days on the surface and one of 6 real south pole sites, with LROC regional imagery. Or let the AI propose a checked plan.
2. **See the result:** a 0–100 score, what limits it, and the 3D terrain lit for that date. "Edit my plan" returns to all the fields together, preserving your choices. From there:
   - **What if the mission is delayed?** Pick a delay (+1 day to +2 weeks), compare arrival dates and check whether the battery lasts. A daily agenda shows hours of light and communication opportunities, with plain-language explanations.
   - **Compare your plan** with another site on the same dates, or with a saved plan, side by side.
   - **Simulate this plan** opens the same plan in the simulator.
   - **Plan it for me (AI):** choose a lander and a month; the AI proposes sites and dates and the simulator checks each one.

**Simulator:**

1. **Prepare the mission:** site, landing date, duration and lander (illustrative presets, or your own battery, panel and instruments).
2. **Travel:** an Earth–Moon trip computed as an educational two-body transfer.
3. **Evaluate:** viability, hours of light and contact, slope, whether the battery lasts, and how many days of delay the mission tolerates. **Play the mission** replays it over the terrain hour by hour.
4. **Simulate a setback:** a trajectory correction delays the arrival. The app shows what happens and offers fixes that are all simulated: wait in orbit, change site or run fewer instruments.
5. **Rescue copilot (AI):** if the mission fails, an AI combines those levers and **checks every idea with the simulator**, keeping the plan that survives and sends the most data.
6. **Survival map:** 6 sites × 365 days with the same lander, to see at a glance where and when the mission survives.

## What is computed

| Calculation | How |
|---|---|
| Light | The Sun is above the terrain: `sun.el > horizon(sun.az)` |
| Contact | Earth is above the terrain: `earth.el > horizon(earth.az)` |
| Horizon | 150 km rays over the 80 m LOLA DEM, with lunar curvature `d²/(2R)`, from 2 m above the ground |
| Power | `1361 W/m² × area × efficiency × visible fraction of the solar disk`, with the Sun's real size and minus what Earth blocks during an eclipse |
| Battery | Charge and discharge efficiency 0.90; the mission fails when it reaches 20% |
| Viability | 0–100 index combining light, contact and slope; capped at 40 if the lander does not survive |
| Delays | How many days the landing can slip and the mission still survives |
| Extras | Which ridge blocks the Sun and how far it is, solar eclipses by Earth, and Moon visibility from Goldstone, Madrid and Canberra (DSN) |

**Project rule:** the simulator does not invent numbers. Everything comes from NASA data and the parameters the user chooses.

## Use of AI

- **In the app:** the rescue copilot and "Plan it for me" use an OpenAI model through a server function (`frontend/api/copilot.ts`; the API key never reaches the browser). The AI only **decides what to try and explains its choice**: every figure shown comes from the app's simulator with JPL Horizons and LOLA data. If the AI is unavailable, the rest of the app works the same.
- **In development:** the team used AI coding assistants to write and review code and documentation. The data, the methods and the validation are the team's responsibility and are documented below.

## Validation

- **Against the official LOLA illumination maps** (`AVGVISIB_75S_120M_201608`, NASA/GSFC, Mazarico et al. 2011): with the observer at ground level, as in the map, our % of light is within 5 points at all 6 sites (median 2.6). Examples: Connecting Ridge 72.3% vs 72.6%, Malapert 62.6% vs 61.3%.
- **Against published values:** over all of 2027, Connecting Ridge gets **89.5%** sunlight at 2 m; Mazarico et al. (2011) report **89%** at the same point.
- **Against the team's independent Python backend:** over the full year (8,760 hours), light and contact agree within 0.5 points at 5 of 6 sites; de Gerlache differs by 1.0 point because of a single sub-pixel obstacle 120 m from the site ([`docs/validacion/valores.md`](docs/validacion/valores.md)).
- **A real eclipse:** the calculation detects the penumbral lunar eclipse of August 17, 2027 as a partial solar eclipse seen from Malapert (up to 43% of the disk).
- **Coordinates:** all 6 sites were checked on LRO QuickMap with a visible marker.
- **Automated tests:** `npm test` checks the calculations, the simulator, the data and the translation.

Full site-by-site table in [`docs/VALIDACION_NASA.md`](docs/VALIDACION_NASA.md) (Spanish).

## Limitations

- Not modeled: real temperature (survival power draw is fixed), dust on the panels, battery degradation and relay satellites.
- The simulator assumes a DSN antenna is always available when Earth is visible (the visibility from the three antennas is already computed).
- Slope is regional (80 m DEM): it does not see rocks or craters smaller than a pixel.
- The Earth–Moon trip is an educational two-body model: no physical ascent, lunar capture or powered descent.
- Lander presets and the setback are illustrative scenarios; Sun and Earth positions and the terrain are real.
- Home page images are illustrations: no data comes from them.

## Data and credits

- **JPL Horizons (NASA/JPL):** position and distance of the Sun and Earth from each site, and of the Moon from the DSN antennas.
- **LOLA / LRO (NASA, PDS):** south pole topography (DEM `LDEM_80S_80M`) and illumination maps for validation.
- **LRO QuickMap (ASU):** verification of the site coordinates (6 of 6 with a visible marker).
- **Moon Trek (NASA):** 3D reference for the south pole terrain.
- **CSA Moon Exploration:** mission context and Canada's role in Artemis.
- 3D models from NASA 3D Resources and textures from Solar System Scope (CC BY 4.0). Full list in [`docs/CREDITOS.md`](docs/CREDITOS.md) and in the app's "Sources" panel.

Project created by our team for the NASA Space Apps Challenge 2026. NASA material is used according to the NASA Images and Media Usage Guidelines, without NASA insignia.

## Running the project

Requirements: Node 22 or later.

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm test         # tests
npm run build    # production build in frontend/dist
```

The data is already in `frontend/public/data/`. To regenerate it:

```bash
npm run horizons   # downloads Sun, Earth and DSN positions from JPL Horizons
npm run horizon    # horizon and slope from the LOLA DEM (needs LDEM_80S_80M.IMG)
npm run mock       # builds public/data/sites/{id}.json
```

**Language:** English by default; `?lang=es` or the EN/ES button switches to Spanish. The translation lives in `frontend/src/i18n/` (dictionary in `en.ts`).

**Deploy (Vercel):** Root Directory `frontend`, framework Vite, build `npm run build`, output `dist`.

**Data API:** without `VITE_API_URL`, the app reads the static files in `public/data`. With `VITE_API_URL` it uses the backend (`GET /sites` and `GET /sites/{id}`) and falls back to the static files if it does not answer within 6 s. In production, `VITE_API_URL=https://geoathecmoon-api.onrender.com` (FastAPI, `backend/api/main.py`), which returns exactly the same JSON.

## Structure

```
GeoAthectum/
├── frontend/          React 19 + Vite + TypeScript + Tailwind, React Three Fiber for 3D
│   ├── src/lib/       light, contact, viability, recommendations, sky (eclipses, DSN, ridges)
│   ├── src/sim/       lander, hour-by-hour simulation, searches, setback, Earth–Moon trip, AI copilot
│   ├── src/i18n/      English version (Spanish → English dictionary)
│   ├── api/           server function for the AI copilot (OpenAI)
│   ├── scripts/       data download and assembly
│   └── public/data/   data for the 6 sites (JSON)
├── backend/           Python: LOLA DEM horizon pipeline, cross-validation and data API (FastAPI)
├── assets-src/        processed LOLA terrain and horizons
└── docs/              data contract, tasks, design, validation, credits (Spanish)
```

More detail (Spanish): [`docs/CONTRATO_DATOS.md`](docs/CONTRATO_DATOS.md) (data format), [`docs/TAREAS.md`](docs/TAREAS.md) (plan and status) and [`docs/DISENO.md`](docs/DISENO.md) (design system).
