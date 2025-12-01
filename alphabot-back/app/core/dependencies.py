from fastapi import Depends, HTTPException, status
import jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import oauth2_scheme
from app.db import get_db
from app.models.models import User
# from app.routers.auth import get_user
from app.schemas.auth_token import TokenData

from app.crud import crud_user

#jwt토큰 디코딩한다음 사용자 정보 조회. 인증이 필요한 모든api들에서 가져다 사용함.
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """토큰을 디코딩하고 현재 사용자 정보를 반환"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        #페이로드 sub 값을 login_id로 사용.
        login_id: str | None = payload.get("sub")
        if login_id is None:
            raise credentials_exception
        #없어도 되는데 호환성위해서 놔둠
        token_data = TokenData(username=login_id)
    except jwt.PyJWTError:
        raise credentials_exception

    # crud_user의 함수를 써서 login_id로 사용자를 찾기
    user = crud_user.get_user_by_login_id(db, login_id=token_data.username)
    if user is None:
        raise credentials_exception
    return user
