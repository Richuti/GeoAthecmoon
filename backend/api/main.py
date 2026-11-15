"""API en vivo (Render): sirve EXACTAMENTE los mismos JSON que frontend/public/data (docs/CONTRATO_DATOS.md).

No calcula nada: lee los archivos al arrancar y los devuelve byte a byte. La app tiene respaldo:
si esta API tarda más de 6 s o falla, usa los archivos estáticos de Vercel.

Local:  pip install -r backend/api/requirements.txt
        uvicorn backend.api.main:app --reload --port 8000
Render: build  pip install -r backend/api/requirements.txt
        start  uvicorn backend.api.main:app --host 0.0.0.0 --port $PORT
"""
import json
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

DATA = Path(__file__).resolve().parents[2] / "frontend" / "public" / "data"
ORIGINS = os.environ.get("ALLOWED_ORIGINS", "https://geoathectum.vercel.app,http://localhost:5173").split(",")
CACHE = "public, max-age=3600"

SITES_RAW = (DATA / "sites.json").read_bytes()
SITE_RAW = {s["id"]: (DATA / "sites" / f"{s['id']}.json").read_bytes() for s in json.loads(SITES_RAW)["sites"]}

app = FastAPI(title="GEOATHECMOON API", docs_url=None, redoc_url=None, openapi_url=None)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(CORSMiddleware, allow_origins=ORIGINS, allow_methods=["GET"], allow_headers=["*"], max_age=3600)


def _json(body: bytes) -> Response:
    return Response(body, media_type="application/json", headers={"Cache-Control": CACHE})


@app.get("/health")
def health():
    return {"ok": True, "sites": len(SITE_RAW)}


@app.get("/sites")
def sites():
    return _json(SITES_RAW)


@app.get("/sites/{site_id}")
def site(site_id: str):
    if site_id not in SITE_RAW:
        raise HTTPException(404, f"sitio desconocido: {site_id}")
    return _json(SITE_RAW[site_id])
