from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from dotenv import load_dotenv
import os
import sys
import warnings

# Suppress protobuf warnings for Python 3.14
if sys.version_info >= (3, 14):
    warnings.filterwarnings("ignore")

from .routers import auth

load_dotenv()

app = FastAPI(title="IoTinerary API", version="1.0.0")

# Parse CORS origins from environment variable
def get_allowed_origins():
    # Check if we should allow all origins (development only - not for production!)
    allow_all = os.getenv("CORS_ALLOW_ALL", "false").lower() == "true"
    
    if allow_all:
        # Allow all origins - useful for development with dev tunnels
        # WARNING: Only use this in development, never in production!
        return ["*"]
    
    # Default origins for local development
    default_origins = "http://localhost:5173,http://127.0.0.1:5173"
    
    # Get from environment variable, or use defaults
    # You can add dev tunnel URLs like: CORS_ORIGINS=http://localhost:5173,https://9wtqplqn-5173.asse.devtunnels.ms
    origins_env = os.getenv("CORS_ORIGINS")
    
    if origins_env:
        origins = origins_env
    else:
        # Auto-detect dev tunnel pattern in development
        # If no explicit CORS_ORIGINS is set, allow common dev tunnel patterns
        origins = default_origins
        # Note: For dev tunnels, set CORS_ALLOW_ALL=true or add specific URL to CORS_ORIGINS
    
    # Parse and clean origins
    origin_list = [origin.strip() for origin in origins.split(",") if origin.strip()]
    
    return origin_list

# CORS middleware - must be added FIRST (last in list = executes first)
# This ensures OPTIONS preflight requests are handled before other middleware
allowed_origins = get_allowed_origins()

# Debug: Print CORS configuration on startup
print(f"[CORS] Configuration loaded:")
print(f"[CORS]   CORS_ALLOW_ALL: {os.getenv('CORS_ALLOW_ALL', 'false')}")
print(f"[CORS]   Allowed origins: {allowed_origins}")

# Configure CORS based on whether we're allowing all origins
if allowed_origins == ["*"]:
    # When allowing all origins, we cannot use allow_credentials=True (CORS spec)
    print("[CORS]   Mode: Allow all origins (development mode)")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,  # Must be False when allow_origins=["*"]
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["*"],
        expose_headers=["*"],
        max_age=3600,
    )
else:
    # Specific origins - can use credentials
    # Note: Cannot use "*" for allow_headers when allow_credentials=True (CORS spec)
    print(f"[CORS]   Mode: Specific origins (count: {len(allowed_origins)})")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=[
            "Accept",
            "Accept-Language",
            "Content-Language",
            "Content-Type",
            "Authorization",
            "X-Requested-With",
        ],
        expose_headers=["*"],
        max_age=3600,
    )

# Response compression middleware - compress responses over 1KB (reduces bandwidth)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Include routers
app.include_router(auth.router)

# Try to import PDF router (with graceful fallback)
try:
    from .routers import pdf
    app.include_router(pdf.router)
except Exception as e:
    print(f"[WARNING] PDF router failed to load: {str(e)[:100]}")

# Try to import AI router (with graceful fallback)
try:
    from .routers import ai
    app.include_router(ai.router)
except Exception as e:
    print(f"[WARNING] AI router failed to load: {str(e)[:100]}")

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        workers=1,
        limit_concurrency=50,
        limit_max_requests=1000,
        timeout_keep_alive=5
    )
