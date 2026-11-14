"""Copia los JSON finales (backend/out/) a frontend/public/data/, reemplazando los datos de prueba.

No toca frontend/public/data/horizons/ (la caché de JPL Horizons es de Richard).
Uso:  python backend/export.py
"""
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(__file__).parent / "out"
DST = ROOT / "frontend" / "public" / "data"

shutil.copy2(SRC / "sites.json", DST / "sites.json")
for f in sorted((SRC / "sites").glob("*.json")):
    shutil.copy2(f, DST / "sites" / f.name)
    print("copiado", f.name)
