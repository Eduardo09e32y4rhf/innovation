from fastapi import APIRouter

router = APIRouter(prefix="/plans", tags=["plans"])

@router.get("")
def list_plans():
    return [
        {"id": 1, "name": "Pessoal", "price": 99.0},
        {"id": 2, "name": "Equipe", "price": 299.0},
        {"id": 3, "name": "Empresa", "price": 499.0},
    ]
