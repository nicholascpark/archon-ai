"""
Authentication routes for user registration and login.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta

from app.models.user import UserCreate, UserLogin, UserResponse, Token, UserDB
from app.services.persistence.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token
)
from app.core.config import settings
from app.core.logging_config import logger
from app.services.astrology.kerykeion_service import kerykeion_service
import json

router = APIRouter()


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user with birth data.

    This is the ONLY time we ask for birth information!
    The natal chart is computed immediately and cached.
    """
    # Check if user already exists
    existing_user = db.query(UserDB).filter(
        (UserDB.email == user_data.email) | (UserDB.username == user_data.username)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email or username already exists"
        )

    try:
        # Create user
        db_user = UserDB(
            email=user_data.email,
            username=user_data.username,
            hashed_password=get_password_hash(user_data.password),
            birth_date=user_data.birth_date,
            birth_time=user_data.birth_time,
            birth_location=user_data.birth_location,
            birth_latitude=user_data.birth_latitude,
            birth_longitude=user_data.birth_longitude,
            birth_timezone=user_data.birth_timezone
        )

        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        logger.info(f"User registered: {user_data.email}")

        # Compute natal chart if we have coordinates
        if user_data.birth_latitude and user_data.birth_longitude:
            try:
                natal_chart = kerykeion_service.compute_natal_chart(
                    birth_date=user_data.birth_date,
                    birth_time=user_data.birth_time,
                    latitude=user_data.birth_latitude,
                    longitude=user_data.birth_longitude,
                    timezone=user_data.birth_timezone or "UTC"
                )

                # Cache natal chart in database
                db_user.natal_chart_data = json.dumps(natal_chart)
                from datetime import datetime
                db_user.natal_chart_computed_at = datetime.utcnow()
                db.commit()

                logger.info(f"Natal chart computed for user {db_user.id}")

            except Exception as e:
                logger.error(f"Error computing natal chart: {e}")
                # Continue anyway - chart can be computed later

        # Create access token
        access_token = create_access_token(
            data={"sub": db_user.id},
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )

        # Return token with user data
        user_response = UserResponse.model_validate(db_user)

        return Token(
            access_token=access_token,
            token_type="bearer",
            user=user_response
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating user"
        )


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Login with email and password.

    Returns JWT token and user profile (including birth data).
    """
    # Find user by email
    user = db.query(UserDB).filter(UserDB.email == credentials.email).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )

    # Create access token
    access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    logger.info(f"User logged in: {user.email}")

    # Return token with user data
    user_response = UserResponse.model_validate(user)

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )
