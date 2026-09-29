from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as api_router

app = FastAPI(
    title="Cognitive Workspace API",
    version="0.1.0",
    description="Backend services powering Cognitive Workspace"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Welcome to Cognitive Workspace Backend API",
        "docs_url": "/docs"
    }

app.include_router(api_router, prefix="/api/v1")

