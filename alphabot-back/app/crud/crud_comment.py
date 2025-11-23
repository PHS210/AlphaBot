from sqlalchemy.orm import Session
from typing import List, Optional
from app.crud.crud_base import CRUDBase
from app.models.models import Comment
from app.schemas.comment import CommentCreate
from pydantic import BaseModel

class CRUDComment(CRUDBase[Comment, CommentCreate, BaseModel]):
    
    def create_with_user(
        self, db: Session, *, obj_in: CommentCreate, user_id: int
    ) -> Comment:
        """
        사용자 ID를 포함하여 댓글 생성
        """
        db_obj = Comment(
            stock_code=obj_in.stock_code,
            content=obj_in.content,
            user_id=user_id
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    # stock_code가 있으면 필터링, 없으면 전체 조회
    def get_multi_comments(
        self, 
        db: Session, 
        *, 
        stock_code: Optional[str] = None, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[Comment]:
        """
        댓글 목록 조회 (전체 또는 특정 종목) - 최신순 정렬
        """
        query = db.query(self.model)
        
        # stock_code가 들어오면 해당 종목만 필터링
        if stock_code:
            query = query.filter(self.model.stock_code == stock_code)
            
        return (
            query.order_by(self.model.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_count_comments(self, db: Session, *, stock_code: Optional[str] = None) -> int:
        """
        댓글 총 개수 (전체 또는 특정 종목)
        """
        query = db.query(self.model)
        if stock_code:
            query = query.filter(self.model.stock_code == stock_code)
        return query.count()

    def update_with_user(
        self, db: Session, *, comment_id: int, content: str, user_id: int
    ) -> Optional[Comment]:
        """
        댓글 내용 수정 (본인 확인 포함)
        """
        # 수정하려는 댓글이 존재하는지, 그리고 요청한 사용자의 것인지 확인
        db_obj = db.query(self.model).filter(
            self.model.comment_id == comment_id,
            self.model.user_id == user_id
        ).first()
        if db_obj:
            db_obj.content = content
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
        return db_obj

    def remove_with_user(
        self, db: Session, *, comment_id: int, user_id: int
    ) -> Optional[Comment]:
        """
        댓글 삭제 (본인 확인 포함)
        """
        # 삭제하려는 댓글이 존재하는지, 그리고 요청한 사용자의 것인지 확인
        db_obj = db.query(self.model).filter(
            self.model.comment_id == comment_id,
            self.model.user_id == user_id
        ).first()
        if db_obj:
            db.delete(db_obj)
            db.commit()
        return db_obj

comment_crud = CRUDComment(Comment)