"""
User profile routes for managing user data and natal charts.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.models.user import UserResponse, UserUpdate, UserDB
from app.services.persistence.database import get_db
from app.core.security import get_user_id_from_token
from app.core.logging_config import logger
from app.services.astrology.kerykeion_service import kerykeion_service
import json
from datetime import datetime

router = APIRouter()


async def get_current_user(
    token: str = Depends(lambda: None),  # Will be extracted from headers
    db: Session = Depends(get_db)
) -> UserDB:
    """
    Dependency to get current authenticated user.

    In production, this would extract token from Authorization header.
    """
    # For now, simplified - in production use proper OAuth2 scheme
    from fastapi import Header

    async def _get_token(authorization: Optional[str] = Header(None)) -> str:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated"
            )
        return authorization.replace("Bearer ", "")

    token_str = await _get_token()
    user_id = get_user_id_from_token(token_str)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return user


@router.get("/me", response_model=UserResponse)
async def get_user_profile(
    current_user: UserDB = Depends(get_current_user)
):
    """
    Get current user's profile (including permanent birth data).

    This endpoint returns all user data including birth information,
    which is always available after registration.
    """
    return UserResponse.model_validate(current_user)


@router.put("/me", response_model=UserResponse)
async def update_user_profile(
    updates: UserUpdate,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user profile.

    Note: Birth date and location cannot be changed after registration.
    This endpoint allows updating current location, preferences, etc.
    """
    try:
        # Update allowed fields
        if updates.username is not None:
            current_user.username = updates.username
        if updates.birth_time is not None:
            current_user.birth_time = updates.birth_time
        if updates.current_location is not None:
            current_user.current_location = updates.current_location
        if updates.current_latitude is not None:
            current_user.current_latitude = updates.current_latitude
        if updates.current_longitude is not None:
            current_user.current_longitude = updates.current_longitude
            current_user.location_updated_at = datetime.utcnow()
        if updates.astrology_system is not None:
            current_user.astrology_system = updates.astrology_system
        if updates.house_system is not None:
            current_user.house_system = updates.house_system

        db.commit()
        db.refresh(current_user)

        logger.info(f"User profile updated: {current_user.id}")
        return UserResponse.model_validate(current_user)

    except Exception as e:
        db.rollback()
        logger.error(f"Error updating profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating profile"
        )


@router.get("/chart")
async def get_natal_chart(
    current_user: UserDB = Depends(get_current_user)
):
    """
    Get user's natal chart data.

    Returns the cached natal chart or computes it if not yet cached.
    """
    # Return cached chart if available
    if current_user.natal_chart_data:
        try:
            chart_data = json.loads(current_user.natal_chart_data)
            return {
                "chart": chart_data,
                "computed_at": current_user.natal_chart_computed_at
            }
        except:
            pass  # Fall through to recompute

    # Compute chart if coordinates available
    if current_user.birth_latitude and current_user.birth_longitude:
        try:
            natal_chart = kerykeion_service.compute_natal_chart(
                birth_date=current_user.birth_date,
                birth_time=current_user.birth_time,
                latitude=current_user.birth_latitude,
                longitude=current_user.birth_longitude,
                timezone=current_user.birth_timezone or "UTC"
            )

            # Cache it
            from app.services.persistence.database import get_db_context
            with get_db_context() as db:
                current_user.natal_chart_data = json.dumps(natal_chart)
                current_user.natal_chart_computed_at = datetime.utcnow()
                db.commit()

            logger.info(f"Natal chart computed for user {current_user.id}")

            return {
                "chart": natal_chart,
                "computed_at": current_user.natal_chart_computed_at
            }

        except Exception as e:
            logger.error(f"Error computing chart: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error computing natal chart"
            )

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Birth coordinates not available. Please update your profile."
    )


@router.post("/chart/recompute")
async def recompute_natal_chart(
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Force recomputation of natal chart.

    Useful if user updated birth time or house system preferences.
    """
    if not current_user.birth_latitude or not current_user.birth_longitude:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Birth coordinates not available"
        )

    try:
        natal_chart = kerykeion_service.compute_natal_chart(
            birth_date=current_user.birth_date,
            birth_time=current_user.birth_time,
            latitude=current_user.birth_latitude,
            longitude=current_user.birth_longitude,
            timezone=current_user.birth_timezone or "UTC"
        )

        # Update cache
        current_user.natal_chart_data = json.dumps(natal_chart)
        current_user.natal_chart_computed_at = datetime.utcnow()
        db.commit()

        logger.info(f"Natal chart recomputed for user {current_user.id}")

        return {
            "chart": natal_chart,
            "computed_at": current_user.natal_chart_computed_at,
            "message": "Natal chart recomputed successfully"
        }

    except Exception as e:
        logger.error(f"Error recomputing chart: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error recomputing natal chart"
        )
