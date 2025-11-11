from pydantic import BaseModel, Field


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: str | None  = None


class LoginRequest(BaseModel):
    """JSON 기반 로그인 요청 스키마 (옵션)
    - 현재 엔드포인트는 OAuth2PasswordRequestForm을 사용하지만, 클라이언트에서 JSON 본문을 선호할 경우를 대비
    """
    login_id: str = Field(..., min_length=4, max_length=50, description="로그인 아이디")
    password: str = Field(..., min_length=8, description="비밀번호")
