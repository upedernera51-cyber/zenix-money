from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

# Modelo de datos para carga manual
class Operacion(BaseModel):
    categoria: str
    monto: float
    es_ingreso: bool

@app.get("/api/balance")
def obtener_balance():
    # Datos de ejemplo que luego vendrán de una base de datos
    return {
        "neto": 366961.0,
        "moneda": "ARS",
        "ccl_ref": 1500.0,
        "categorias_top": [
            {"name": "Gimnasio", "value": 487993},
            {"name": "Trading Fees", "value": 15200},
            {"name": "Suscripciones", "value": 31413}
        ]
    }