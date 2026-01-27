from pydantic import BaseModel

class SubscribeRequest(BaseModel):
    plan_id: int
