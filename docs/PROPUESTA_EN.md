# Project proposal · English version (source text for the Google Doc)

Source for the team's Google Doc «PROJECT PROPOSAL: GEOATHECMOON (English version)». Figures come from `README.md`, `docs/VALIDACION_NASA.md` and `docs/CASO_DEMO.md`. Mission, vision and values are the team's own and are kept as written.

## 1. Project identification
**Project name:** GEOATHECMOON
**Team name:** GeoAthectum
**Selected official challenge:** Lunar Landing Site Navigator
**Team members:** Rafael Antonio Arauz Nabarro · Joshua Santiago Centeno Peña · Richard Ivan Diaz Yañez · Odelmi Arialys Martinez Ramos · Dilan Yasser Wittingham Hendy

**Clear identification of the solution:** GEOATHECMOON is a web mission planner and simulator for the lunar south pole. You pick a landing site, a date and a lander; it tells you, hour by hour, whether the lander gets enough sunlight and can talk to Earth, gives a 0–100 viability score, and shows what happens if the landing is delayed.

## 2. Summary of the proposal
**What did the team develop?** A public web app (English and Spanish, works on phones) that compares 6 real south pole landing sites over all of 2027, hour by hour. It combines Sun and Earth positions from JPL Horizons with a horizon we computed from LRO LOLA topography, then simulates the lander's battery, solar panel and data downlink.

**What problem does it address?** At the lunar south pole the Sun never rises more than a couple of degrees, so a ridge kilometers away can leave a site dark or cut contact with Earth. NASA has the data in expert tools (Horizons, QuickMap, Moon Trek), but none of them answers the planner's question directly: if my landing slips, does the mission still work?

**How does it respond to the challenge?** It covers the challenge goals: sites and dates, the Sun and Earth against the real horizon, energy (hours of light and solar elevation), direct-to-Earth communication, time to sunset and Earthset, and fast re-evaluation when the schedule changes.

**Main result:** In seconds the app shows that a plan at Malapert Massif on 15 Jan 2027 scores 95% and tolerates up to 4 days and 6 hours of delay, and that a one-week delay leaves the lander without power because the Sun drops behind the terrain. It then offers simulated ways out: wait in orbit, change site or run fewer instruments.

## 3. Problem and objectives
**Context and need:** Artemis and the commercial CLPS landers target the lunar south pole for its water ice and its ridges with near-constant sunlight. Launch and hardware delays are common, and at the pole a few days can change everything: light and Earth visibility depend on the date and on terrain up to 150 km away.

**General objective:** Let engineers, students and the general public evaluate a landing site and date in seconds with real NASA data, and compare the original plan with alternatives when the schedule changes.

**Specific objectives:**
- Compute light and Earth visibility from real ephemerides and real lunar topography.
- Turn them into a clear viability score, with the reason when a plan is weak.
- Simulate the lander's energy hour by hour and measure how much delay a plan tolerates.
- Propose and verify alternative sites or dates.
- Validate the results against official NASA data and published studies.

**Team mission:** To assist in the optimization of topographic and geographic data for use in space missions.
**Team vision:** For the map and simulator to be utilized for the benefit of space missions, incorporating collected data to provide a clear visualization of craters.
**Team values:** Innovation, Curiosity, Scientific Rigor, Quality and Trust.

## 4. Developed solution
**Functionality and approach:**
- **Planner:** choose site, date and days on the surface. The app returns a 0–100 viability score, hours of light and Earth contact, terrain slope, the 3D terrain lit for that date, and what limits the plan.
- **What if the mission is delayed?** Move the landing from +1 day to +2 weeks and compare dates; the app states how many days of delay the plan tolerates.
- **Simulator:** configure the lander (battery, panel, instruments), simulate the mission hour by hour (light = Sun above the terrain horizon; contact = Earth above it), and replay it over the 3D terrain.
- **Setback and AI rescue copilot:** a trajectory correction delays arrival. An AI model proposes combinations (wait, change site, fewer instruments) and the simulator checks each one; only plans that survive are kept.
- **Survival map:** 6 sites × 365 days with the same lander, to see at a glance where and when the mission survives.

**Differentiating contribution:**
- It answers a planner's question ("does it survive if it slips?"), not just shows data layers.
- Our own horizon from LOLA: 360 directions, rays up to 150 km, with lunar curvature.
- The AI never invents numbers: it only chooses what to try, and every figure comes from the simulator with NASA data.
- Delay tolerance as a single number, and the survival map.
- Built for a general audience: two steps, plain language, English and Spanish, works on phones.

## 5. Methodology and scientific resources
**Work process:** Short iterations during the hackathon: a data contract between backend and frontend, an offline data pipeline (precomputed JSON, so the demo does not depend on external APIs), automated tests for every calculation, and validation against NASA references before the demo.

**Data and resources from NASA and partner agencies:**
- **JPL Horizons (NASA/JPL):** Sun and Earth position and distance from each site, every hour of 2027 (8,760 samples per site), and Moon visibility from the DSN antennas (Goldstone, Madrid, Canberra).
- **LRO LOLA (NASA, PDS):** south pole DEM `LDEM_80S_80M` for the horizon and slope; LOLA illumination maps `AVGVISIB_75S_120M` for validation.
- **LRO QuickMap (ASU):** verification of the 6 site coordinates with a visible marker.
- **Moon Trek (NASA):** 3D reference for the south pole terrain.
- **CSA Moon Exploration:** mission context and Canada's role in Artemis.

## 6. Development, results and evidence
**Architecture and diagrams:** Python pipeline (LOLA DEM → horizon and slope) + JPL Horizons download → static JSON per site → React web app that computes light, contact, viability, simulation and recommendations in the browser → optional data API (FastAPI on Render) with automatic fallback to the static files → AI copilot through a server function (OpenAI); its key never reaches the browser.

**Map and simulator screenshots:** [insert screenshots: planner result, delay comparison, AI rescue copilot, survival map]

**Test results:**
- Against NASA's official LOLA illumination map: our % of light is within 5 points at all 6 sites (median 2.6).
- Connecting Ridge over 2027: 89.5% sunlight; Mazarico et al. (2011) report 89% for the same point.
- Two independent implementations (Python and TypeScript) agree within 0.5 points over 8,760 hours at 5 of 6 sites.
- The calculation detects the penumbral lunar eclipse of 17 Aug 2027 as a partial solar eclipse seen from Malapert.
- 359 automated tests for the calculations, the simulator, the data and the translation.

**Link to the interactive prototype / repository:** App: https://geoathectum.vercel.app · Repository: https://github.com/Richuti/GeoAthectum

**Link to the demonstration video (up to 30 seconds, in English):** [insert public link]

## 7. Impact and reach
**Beneficiaries and utility:** Mission planners (CLPS, Artemis), engineering students and educators, and the general public who want to understand why the lunar south pole is so hard.

**Scope and applications:** Preliminary site and date selection, fast re-planning when a launch slips, and teaching lunar illumination and communication.

**Opportunities for improvement and future development:** Free coordinates and more sites (it means re-running the same pipeline), relay satellites, thermal model, dust on the panels and battery degradation, and a higher-resolution DEM near each site.

## 8. References and tools used
**Scientific sources and datasets:**
- JPL Horizons API: https://ssd.jpl.nasa.gov/api/horizons.api
- LOLA DEM `LDEM_80S_80M` and illumination maps `AVGVISIB_75S_120M_201608`, NASA PDS Geosciences Node.
- Mazarico, E. et al. (2011). Illumination conditions of the lunar polar regions using LOLA topography. *Icarus* 211, 1066–1081.
- Gläser, P. et al. (2014, 2018); Speyerer, E. & Robinson, M. (2013): lunar polar illumination studies.
- LRO QuickMap (ASU), NASA Moon Trek, CSA Moon Exploration.
- 3D models from NASA 3D Resources; Moon and Sun textures from Solar System Scope (CC BY 4.0).

**Software and design tools:** React 19, TypeScript, Vite, Tailwind CSS, Three.js with React Three Fiber; Python (NumPy) for the LOLA pipeline; FastAPI; Vercel and Render; Blender; Canva.

**Use of Artificial Intelligence:**
- **In the app:** the rescue copilot and "Plan it for me" use an OpenAI model through a server function. The AI only decides what to try and explains its choice; every figure comes from the simulator with JPL Horizons and LOLA data. If the AI is unavailable, the rest of the app works the same.
- **In development:** the team used AI coding assistants to write and review code and documentation. The data, methods and validation are the team's responsibility.
