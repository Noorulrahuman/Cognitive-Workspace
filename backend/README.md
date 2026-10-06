# 1. install uv in cmd(terminal) -> a package manager faster than pip
pip install uv


# 2. uv sync automatically creates an isolated .venv and installs the exact versions recorded in uv.lock.
cd backend
uv sync

# 3. Copy the template to create your local .env:
copy .env.example .env

# 4. Run the Development Server - Start the Uvicorn server with auto-reload:
uv run uvicorn app.main:app --reload



# Available Endpoints
Base URL: http://127.0.0.1:8000/
Health Check: http://127.0.0.1:8000/api/v1/health
Workspace Status: http://127.0.0.1:8000/api/v1/workspace/status
Interactive Swagger UI: http://127.0.0.1:8000/docs
ReDoc UI: http://127.0.0.1:8000/redoc