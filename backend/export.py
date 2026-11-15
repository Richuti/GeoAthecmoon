"""Copia los JSON finales (backend/out/) a frontend/public/data/, reemplazando los datos de prueba.

No toca frontend/public/data/horizons/ (la caché de JPL Horizons es de Richard).
Uso:  python backend/export.py --force

OJO (sáb 14 nov, 18:11): desde la Tarea D1 de Richard, frontend/public/data lo genera el pipeline del frontend
(un año de datos, campos dsn/reference/distKm). Este script pisaría esos datos con la versión de 60 días,
así que solo corre con --force. El backend queda como validación cruzada.
"""
import shutil
import sys
from pathlib import Path

if "--force" not in sys.argv:
    sys.exit("No se copió nada: frontend/public/data ahora lo genera la rama frontend (Tarea D1). Usa --force solo si Richard lo pide.")

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(__file__).parent / "out"
DST = ROOT / "frontend" / "public" / "data"

shutil.copy2(SRC / "sites.json", DST / "sites.json")
for f in sorted((SRC / "sites").glob("*.json")):
    shutil.copy2(f, DST / "sites" / f.name)
    print("copiado", f.name)
