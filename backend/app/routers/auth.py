from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import UserResponse, LoginRequest, SwitchUserRequest

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Predefined AWS IAM profiles for interactive role-switching
DEFAULT_USERS = [
    {
        "id": "usr_root",
        "username": "root-account",
        "email": "aws-root@cloud-enterprise.io",
        "role": "AdministratorAccess",
        "account_id": "4920-3184-9102",
        "account_alias": "aws-prod-admin",
        "avatar_color": "#EC7211",
    },
    {
        "id": "usr_devops",
        "username": "alex.devops",
        "email": "alex.devops@cloud-enterprise.io",
        "role": "NetworkAdmin",
        "account_id": "4920-3184-9102",
        "account_alias": "aws-prod-admin",
        "avatar_color": "#2563EB",
    },
    {
        "id": "usr_readonly",
        "username": "sarah.auditor",
        "email": "sarah.auditor@cloud-enterprise.io",
        "role": "Route53ReadOnlyAccess",
        "account_id": "4920-3184-9102",
        "account_alias": "aws-prod-admin",
        "avatar_color": "#10B981",
    },
]

# In-memory active session for mock authentication
_CURRENT_USER_ID = "usr_root"


@router.get("/users")
def list_mock_users(db: Session = Depends(get_db)):
    """List available mock IAM users for rapid switching in AWS Console header"""
    users = db.query(User).all()
    if not users:
        # Return default list if database not seeded yet
        return DEFAULT_USERS
    return users


@router.get("/me", response_model=UserResponse)
def get_current_user(db: Session = Depends(get_db)):
    global _CURRENT_USER_ID
    user = db.query(User).filter(User.id == _CURRENT_USER_ID).first()
    if not user:
        # Fallback to first user or default root
        user = db.query(User).first()
        if not user:
            return DEFAULT_USERS[0]
    return user


@router.post("/login", response_model=UserResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    global _CURRENT_USER_ID
    user = db.query(User).filter(User.username == request.username).first()
    if not user:
        # Create user or match
        user = User(
            username=request.username,
            email=f"{request.username}@cloud-enterprise.io",
            role="AdministratorAccess",
            account_id="4920-3184-9102",
            account_alias="aws-prod-admin",
            avatar_color="#EC7211",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    _CURRENT_USER_ID = user.id
    return user


@router.post("/switch-user/{user_id}", response_model=UserResponse)
def switch_user(user_id: str, db: Session = Depends(get_db)):
    global _CURRENT_USER_ID
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    _CURRENT_USER_ID = user.id
    return user


@router.post("/logout")
def logout():
    global _CURRENT_USER_ID
    _CURRENT_USER_ID = "usr_root"
    return {"message": "Logged out successfully"}
