from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os

from .schemas import ChatRequest, ChatResponse, LandingPlanRequest
from .ai_logic import ask_gemini, ask_gemini_stream

app = FastAPI(title="Innovation IA - AI Service")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/ai/chat", response_model=ChatResponse)
async def chat(data: ChatRequest):
    model = data.model or "gemini-2.0-flash"
    try:
        answer = await ask_gemini(data.question, data.history, model)
        return ChatResponse(answer=answer, model_used=model)
    except Exception as e:
        return ChatResponse(answer=str(e), model_used=model, error=True)

@app.post("/api/ai/chat/stream")
async def chat_stream(data: ChatRequest):
    return StreamingResponse(
        ask_gemini_stream(data.question, data.history, data.model or "gemini-2.0-flash"),
        media_type="text/event-stream"
    )

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-service"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)
