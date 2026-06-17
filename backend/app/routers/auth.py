from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.auth.security import create_access_token, hash_password, verify_password
from app.database.db import get_db
from app.models.models import User
from app.schemas.schemas import SignupRequest, TokenResponse, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


# @router.post("/signup", response_model=TokenResponse)
# def signup(payload: SignupRequest, db: Session = Depends(get_db)):
#     if db.query(User).filter(User.email == payload.email).first():
#         raise HTTPException(status_code=400, detail="Email already registered")
#     user = User(
#         email=payload.email,
#         full_name=payload.full_name,
#         hashed_password=hash_password(payload.password),
#     )
#     db.add(user)
#     db.commit()
#     db.refresh(user)
#     return TokenResponse(access_token=create_access_token(user.email))
@router.post("/signup", response_model=TokenResponse)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):

    print("=" * 50)
    print("EMAIL:", payload.email)
    print("PASSWORD:", payload.password)
    print("TYPE:", type(payload.password))
    print("LENGTH:", len(str(payload.password)))
    print("=" * 50)

    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return TokenResponse(access_token=create_access_token(user.email))


@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2PasswordRequestForm uses 'username' field; we treat it as email.
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    return TokenResponse(access_token=create_access_token(user.email))


@router.get("/me", response_model=UserOut)
def me(current: User = Depends(get_current_user)):
    return current
