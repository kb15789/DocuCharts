from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.routers import auth, chat, documents, monitoring
from app.utils.rate_limiter import InMemoryRateLimiter


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
)
rate_limiter = InMemoryRateLimiter()

allowed_origins = [origin.strip() for origin in settings.allowed_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(monitoring.router, prefix="/api")


def _client_key_from_request(request) -> str:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        first = xff.split(",")[0].strip()
        if first:
            return first
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _limit_for_path(path: str) -> int:
    if path.startswith("/api/auth/"):
        return settings.rate_limit_auth_per_window
    if path in {"/api/chat/query", "/api/documents/ai-insights"}:
        return settings.rate_limit_ai_per_window
    return settings.rate_limit_per_window


@app.middleware("http")
async def apply_rate_limit(request, call_next):
    path = request.url.path
    if path == "/health":
        return await call_next(request)

    client_key = _client_key_from_request(request)
    limit = _limit_for_path(path)
    key = f"{client_key}:{path}"
    allowed, remaining, retry_after = await rate_limiter.check(
        key,
        limit=limit,
        window_seconds=settings.rate_limit_window_seconds,
    )
    if not allowed:
        return JSONResponse(
            status_code=429,
            content={"detail": "Rate limit exceeded. Please try again later."},
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": "0",
            },
        )

    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(limit)
    response.headers["X-RateLimit-Remaining"] = str(remaining)
    return response


@app.get("/health")
async def health_check():
    return {"status": "ok"}
