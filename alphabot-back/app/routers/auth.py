from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password
from app.db import get_db
from app.schemas.auth_token import Token
from app.crud import crud_user #user모델 직점참조에서 crud함수를 사용으로 변경


router = APIRouter()#태그를 auth로 통일하여서 수정.

#crud_user.py로 옮김.
# def get_user(db: Session, username: str):
#     """데이터베이스에서 username으로 사용자를 조회"""
#     return db.query(User).filter(User.username == username).first()


@router.post("/login", response_model=Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    """사용자 인증 후 jwt 액세스 토큰을 발급"""
    user = crud_user.get_user_by_login_id(db, login_id=form_data.username)#사용자조회

    if not user or not verify_password(form_data.password, user.hashed_pw):#비밀번호검증
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.login_id}) #토큰발급

    return {"access_token": access_token, "token_type": "bearer"}
