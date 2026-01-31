from __future__ import annotations

from fastapi import APIRouter, HTTPException


router = APIRouter(prefix="/ai", tags=["AI"])


@router.post("/job-description")
def generate_job_description(payload: dict):
    title = (payload.get("title") or "").strip()
    seniority = (payload.get("seniority") or "").strip()
    location = (payload.get("location") or "").strip()
    stack = payload.get("stack")

    if not title or not seniority or not location or not stack:
        raise HTTPException(
            status_code=400,
            detail="title, seniority, location e stack são obrigatórios",
        )

    if isinstance(stack, str):
        stack_items = [item.strip() for item in stack.split(",") if item.strip()]
    elif isinstance(stack, list):
        stack_items = [str(item).strip() for item in stack if str(item).strip()]
    else:
        stack_items = []

    if not stack_items:
        raise HTTPException(status_code=400, detail="stack inválido")

    stack_list = ", ".join(stack_items)

    description = (
        f"Estamos buscando um(a) {title} {seniority} para atuar em {location}. "
        "Você terá a oportunidade de colaborar com um time multidisciplinar, "
        "participando desde o entendimento do problema até a entrega final. "
        f"A stack principal inclui {stack_list}. "
        "Valorizamos comunicação clara, foco em qualidade e melhoria contínua."
    )

    return {"description": description}
