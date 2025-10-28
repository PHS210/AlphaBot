from fastapi import FastAPI
import logging
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

<<<<<<< HEAD
from app.db import engine, get_db
from app.models import Base, role_enum, trash_enum
from app.routers import auth, chat,user
=======
app = FastAPI()
>>>>>>> ce30e25296fce14e58b835b5c4ed0cfe0d4be2a0

# 기본 로깅 레벨 WARNING으로 설정
logging.getLogger().setLevel(logging.WARNING)
logging.getLogger("uvicorn").setLevel(logging.WARNING)
logging.getLogger("uvicorn.error").setLevel(logging.WARNING)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

<<<<<<< HEAD
# chat, auth 라우터 등록
app.include_router(user.router, prefix="/api", tags=["User"])
app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])
=======
# ✅ CORS 설정 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080",
                   "http://0.0.0.0:8080"],  # 운영 시 ["https://yourfrontend.com"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#router폴더 생성해서 기능별 API 관리
app.include_router(auth.router, prefix="/auth",tags=["Auth 관련"])
app.include_router(stock_info.router, prefix="/stocks",tags=["종목 관련"])
app.include_router(chat.router, prefix="/chats", tags=["채팅 관련"])
app.include_router(rag.router, prefix="/reports", tags=["보고서 관련"])
app.include_router(news.router, prefix="/news", tags=["뉴스 관련"])
#--------------------------배포용--------------------------------
# React 정적 파일 제공
#app.mount("/static", StaticFiles(directory="frontend/static"), name="static")

# 모든 경로 index.html 반환
@app.get("/{full_path:path}")
def serve_react_app_catch_all(full_path: str):
    return FileResponse("frontend/index.html")
#----------------------------------------------------------

>>>>>>> ce30e25296fce14e58b835b5c4ed0cfe0d4be2a0

#서버 실행 시 DB에 테이블이 없다면 models.py에 있는 정보 토대로 자동생성
models.Base.metadata.create_all(bind=engine)
