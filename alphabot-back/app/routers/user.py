from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.models.models import User as ORMUser
from app.schemas.user import User, UserCreate, UserUpdate, PasswordChange
from app.core import dependencies
from app.crud import crud_user
from app.db.session import get_db
from app.core.security import verify_password

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
    current_user: ORMUser = Depends(dependencies.get_current_user),
):
    """
    ## 내 정보 조회
    - 현재 로그인된 사용자의 정보를 반환합니다. (토큰 필요)
    """
    return current_user



@router.patch("/users/me", response_model=User)
def update_user_me(
    *,
    db: Session = Depends(get_db),
    user_in: UserUpdate,
    current_user: ORMUser = Depends(dependencies.get_current_user),
):
    """
    ## 내 프로필 수정
    - 사용자 이름(닉네임)을 변경합니다.
    """
    user = crud_user.update_user(db, db_user=current_user, obj_in=user_in)
    return user

@router.put("/users/me/password", status_code=status.HTTP_200_OK)
def change_password(
    *,
    db: Session = Depends(get_db),
    password_in: PasswordChange,
    current_user: ORMUser = Depends(dependencies.get_current_user),
):
    """
    ## 비밀번호 변경
    - 현재 비밀번호를 확인하고 새 비밀번호로 변경합니다.
    """
    # 1. 현재 비밀번호가 맞는지 확인
    if not verify_password(password_in.current_password, current_user.hashed_pw):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="현재 비밀번호가 일치하지 않습니다.",
        )
    
    # 2. 새 비밀번호와 확인 비밀번호가 일치하는지는 Pydantic Schema(PasswordChange)에서 이미 검증됨
    
    # 3. 비밀번호 변경 실행
    crud_user.update_password(db, db_user=current_user, new_password=password_in.new_password)
    
    return {"message": "비밀번호가 성공적으로 변경되었습니다."}