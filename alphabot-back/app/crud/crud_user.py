from sqlalchemy.orm import Session
from app.core.security import get_password_hash
from app.models.models import User
from app.schemas.user import UserCreate, UserUpdate

def get_user_by_login_id(db: Session, *, login_id: str) -> User | None:
    """login_id로 사용자를 조회합니다."""
    return db.query(User).filter(User.login_id == login_id).first()

def create_user(db: Session, *, obj_in: UserCreate) -> User:
    """새로운 사용자를 생성합니다."""
    # UserCreate 스키마데이터를 딕셔너리로 변환
    create_data = obj_in.dict()
#password 빼고 hashed_pw로 저장
    create_data.pop("password")
    db_obj = User(
        **create_data,
        hashed_pw=get_password_hash(obj_in.password)
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_user(db: Session, *, db_user: User, obj_in: UserUpdate) -> User:
    """사용자 프로필(이름 등)을 수정합니다."""
    # 변경 요청된 데이터만 딕셔너리로 변환 (null 값 제외)
    update_data = obj_in.dict(exclude_unset=True)
    
    # DB 객체 속성 업데이트
    for field, value in update_data.items():
        setattr(db_user, field, value)

    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_password(db: Session, *, db_user: User, new_password: str) -> User:
    """사용자의 비밀번호를 변경합니다."""
    # 새 비밀번호를 해시화(암호화)하여 저장
    hashed_password = get_password_hash(new_password)
    db_user.hashed_pw = hashed_password
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# 전역 변수로 crud 객체를 만들어두면 다른 곳에서 임포트하여 사용하기 편리합니다.
# from app.crud import user_crud 와 같이 사용할 수 있습니다.
# (이 프로젝트에서는 함수 기반으로 작성했으니, 필요에 따라 클래스 기반으로 변경해도 좋습니다)