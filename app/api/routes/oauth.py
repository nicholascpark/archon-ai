"""
OAuth routes for Google and Meta (Facebook) authentication.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from authlib.integrations.starlette_client import OAuth
from starlette.requests import Request
from datetime import timedelta
import secrets

from app.models.user import UserDB, UserResponse, Token
from app.services.persistence.database import get_db
from app.core.security import get_password_hash, create_access_token
from app.core.config import settings
from app.core.logging_config import logger

router = APIRouter(redirect_slashes=False)

# Initialize OAuth
oauth = OAuth()

# Register Google OAuth
oauth.register(
    name='google',
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)

# Register Meta/Facebook OAuth
oauth.register(
    name='meta',
    client_id=settings.META_CLIENT_ID,
    client_secret=settings.META_CLIENT_SECRET,
    authorize_url='https://www.facebook.com/v18.0/dialog/oauth',
    access_token_url='https://graph.facebook.com/v18.0/oauth/access_token',
    api_base_url='https://graph.facebook.com/v18.0/',
    client_kwargs={
        'scope': 'email public_profile'
    }
)


def get_frontend_url() -> str:
    """Get the frontend URL for redirects."""
    return settings.FRONTEND_URL or "http://localhost:3000"


@router.get("/google/authorize")
async def google_authorize(request: Request):
    """Redirect to Google OAuth."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth not configured"
        )

    redirect_uri = f"{settings.API_URL}/auth/google/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    """Handle Google OAuth callback."""
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')

        if not user_info:
            raise HTTPException(status_code=400, detail="Failed to get user info")

        email = user_info.get('email')
        name = user_info.get('name', '')

        if not email:
            raise HTTPException(status_code=400, detail="Email not provided by Google")

        # Find or create user
        user = db.query(UserDB).filter(UserDB.email == email).first()

        if not user:
            # Create new user
            username = email.split('@')[0] + '_' + secrets.token_hex(4)
            user = UserDB(
                email=email,
                username=username,
                name=name,
                hashed_password=get_password_hash(secrets.token_urlsafe(32))  # Random password
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info(f"Created user via Google OAuth: {email}")
        else:
            # Update name if not set
            if not user.name and name:
                user.name = name
                db.commit()
            logger.info(f"User logged in via Google OAuth: {email}")

        # Create access token
        access_token = create_access_token(
            data={"sub": user.id},
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )

        # Redirect to frontend with token
        frontend_url = get_frontend_url()
        return RedirectResponse(f"{frontend_url}/auth/callback?token={access_token}")

    except Exception as e:
        logger.error(f"Google OAuth error: {e}")
        frontend_url = get_frontend_url()
        return RedirectResponse(f"{frontend_url}/login?error=oauth_failed")


@router.get("/meta/authorize")
async def meta_authorize(request: Request):
    """Redirect to Meta/Facebook OAuth."""
    if not settings.META_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Meta OAuth not configured"
        )

    redirect_uri = f"{settings.API_URL}/auth/meta/callback"
    return await oauth.meta.authorize_redirect(request, redirect_uri)


@router.get("/meta/callback")
async def meta_callback(request: Request, db: Session = Depends(get_db)):
    """Handle Meta/Facebook OAuth callback."""
    try:
        token = await oauth.meta.authorize_access_token(request)

        # Fetch user info from Facebook Graph API
        resp = await oauth.meta.get('me?fields=id,name,email', token=token)
        user_info = resp.json()

        email = user_info.get('email')
        name = user_info.get('name', '')

        if not email:
            raise HTTPException(status_code=400, detail="Email not provided by Meta")

        # Find or create user
        user = db.query(UserDB).filter(UserDB.email == email).first()

        if not user:
            # Create new user
            username = email.split('@')[0] + '_' + secrets.token_hex(4)
            user = UserDB(
                email=email,
                username=username,
                name=name,
                hashed_password=get_password_hash(secrets.token_urlsafe(32))
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info(f"Created user via Meta OAuth: {email}")
        else:
            if not user.name and name:
                user.name = name
                db.commit()
            logger.info(f"User logged in via Meta OAuth: {email}")

        # Create access token
        access_token = create_access_token(
            data={"sub": user.id},
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )

        # Redirect to frontend with token
        frontend_url = get_frontend_url()
        return RedirectResponse(f"{frontend_url}/auth/callback?token={access_token}")

    except Exception as e:
        logger.error(f"Meta OAuth error: {e}")
        frontend_url = get_frontend_url()
        return RedirectResponse(f"{frontend_url}/login?error=oauth_failed")
