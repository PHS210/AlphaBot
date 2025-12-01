from fastapi import FastAPI, HTTPException
import logging
import os
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.db import engine, get_db, Base
from app.routers import auth, chat, user, category, bookmark, comment

app = FastAPI()

logger = logging.getLogger(__name__)

# 기본 로깅 레벨 WARNING으로 설정
logging.getLogger().setLevel(logging.WARNING)
logging.getLogger("uvicorn").setLevel(logging.WARNING)
logging.getLogger("uvicorn.error").setLevel(logging.WARNING)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

def _parse_env_list(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]

DEFAULT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://0.0.0.0:5173",
    "http://localhost:8080",
    "http://0.0.0.0:8080",
]
ADDITIONAL_CORS_ORIGINS = _parse_env_list(os.getenv("ADDITIONAL_CORS_ORIGINS"))
ALLOWED_CORS_ORIGINS = [*DEFAULT_CORS_ORIGINS, *ADDITIONAL_CORS_ORIGINS]

if ADDITIONAL_CORS_ORIGINS:
    logger.warning("Allowing additional CORS origins: %s", ADDITIONAL_CORS_ORIGINS)

# CORS 설정: 프론트엔드 접근 허용 (개발 + 배포)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_CORS_ORIGINS or ["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup() -> None:
    # 테이블 생성 (없으면)
    Base.metadata.create_all(bind=engine)

# 프론트엔드 정적 파일 경로 설정
BASE_DIR = Path(__file__).resolve().parent  # .../alphabot-back/app
PROJECT_ROOT = BASE_DIR.parent.parent  # .../softwareEng
FRONTEND_BUILD_DIR = Path(
    os.getenv("FRONTEND_BUILD_DIR", PROJECT_ROOT / "alphabot-front" / "dist")
)
FRONTEND_INDEX_FILE = FRONTEND_BUILD_DIR / "index.html"
FRONTEND_ASSETS_DIR = FRONTEND_BUILD_DIR / "assets"

if FRONTEND_ASSETS_DIR.exists():
    app.mount(
        "/assets",
        StaticFiles(directory=FRONTEND_ASSETS_DIR),
        name="frontend-assets",
    )
else:
    logger.warning(
        "Frontend assets directory not found at %s. Static files will not be served.",
        FRONTEND_ASSETS_DIR,
    )

# chat, auth 라우터 등록
app.include_router(user.router, prefix="/api", tags=["User"])
app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(category.router, prefix="/api/categories", tags=["Categories"])
app.include_router(bookmark.router, prefix="/api/bookmarks", tags=["Bookmarks"])
app.include_router(comment.router, prefix="/api/comments", tags=["Comments"])

def _serve_frontend_index() -> FileResponse:
    if FRONTEND_INDEX_FILE.exists():
        return FileResponse(FRONTEND_INDEX_FILE)
    raise HTTPException(
        status_code=503,
        detail=(
            "Frontend build not found. "
            "Run `npm run build` inside `alphabot-front` or set FRONTEND_BUILD_DIR."
        ),
    )

def _resolve_frontend_file(request_path: str) -> Path | None:
    if not request_path:
        return FRONTEND_INDEX_FILE if FRONTEND_INDEX_FILE.exists() else None
    if not FRONTEND_BUILD_DIR.exists():
        return None
    candidate_path = (FRONTEND_BUILD_DIR / request_path.lstrip("/")).resolve()
    try:
        candidate_path.relative_to(FRONTEND_BUILD_DIR.resolve())
    except ValueError:
        return None
    if candidate_path.is_file():
        return candidate_path
    return None

# 루트 경로 처리
@app.get("/", include_in_schema=False)
def serve_react_app_root():
    return _serve_frontend_index()

@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend_spa(full_path: str):
    normalized = full_path.strip()
    if normalized.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not Found")

    asset = _resolve_frontend_file(normalized)
    if asset:
        return FileResponse(asset)

    return _serve_frontend_index()
