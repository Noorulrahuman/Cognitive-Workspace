from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as api_router

app = FastAPI(
    title="Cognitive Workspace API",
    version="0.1.0",
    description="Backend services powering Cognitive Workspace"
)

# Enable CORS for frontend clients
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

# Health Check Route meeting task specification
@app.get(
    "/health",
    tags=["System"],
    status_code=status.HTTP_200_OK,
    summary="Health Check"
)
async def health_check():
    return {"status": "ok"}

# Mount modular API routes for other features
app.include_router(api_router, prefix="/api/v1")