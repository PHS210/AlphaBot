from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models
from app.schemas.user import User, UserCreate
from app.core import dependencies
from app.crud import crud_user
from app.db.session import get_db

# prefix="/api"는 main.py에서 설정함. 여기서는 생략.
router = APIRouter()

@router.post("/signup", response_model=User, status_code=status.HTTP_201_CREATED)
def signup(
    *,
    db: Session = Depends(get_db),
    user_in: UserCreate,
):
    """
    ## 회원가입
    - 새로운 사용자를 생성합니다.
    """
    # 아이디 중복 확인
    user = crud_user.get_user_by_login_id(db, login_id=user_in.login_id)
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 사용 중인 아이디입니다.",
        )
    
    # 사용자 생성
    user = crud_user.create_user(db, obj_in=user_in)
    return user


@router.get("/users/me", response_model=User)
def read_users_me(
    current_user: models.User = Depends(dependencies.get_current_user),
):
    """
    ## 내 정보 조회
    - 현재 로그인된 사용자의 정보를 반환합니다. (토큰 필요)
    """
    return current_user