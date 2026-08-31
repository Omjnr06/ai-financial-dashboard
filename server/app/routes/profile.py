from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel

from app.core.database import get_session
from app.core.dependencies import get_current_user
from app.models import Profiles

router = APIRouter(prefix="/api/profile", tags=["profile"])


class ProfileResponse(BaseModel):
    timezone: str
    layoutId: str
    themeId: str


class ProfileUpdate(BaseModel):
    layoutId: str | None = None
    themeId: str | None = None
    timezone: str | None = None

# returns layout and theme
@router.get(
    "",
    response_model=ProfileResponse,
    summary="Get the authenticated user's profile preferences",
    response_description="The user's timezone, layout, and theme settings",
)
def get_profile(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> ProfileResponse:
    """
    Return the authenticated user's profile preferences.

    These values are created with defaults when the account is first made and
    are used to restore the user's chosen theme and navigation layout across
    devices and re-logins, independent of browser local storage.
    """
    profile = db.exec(select(Profiles).where(Profiles.userId == user_id)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return ProfileResponse(
        timezone=profile.timezone,
        layoutId=profile.layoutId,
        themeId=profile.themeId,
    )

# updates users theme and layout
@router.patch(
    "",
    response_model=ProfileResponse,
    summary="Update the authenticated user's profile preferences",
    response_description="The updated profile settings",
)
def update_profile(
    body: ProfileUpdate,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> ProfileResponse:
    """
    Update one or more of the authenticated user's profile preferences.

    Only the fields provided in the request body are changed; omitted fields
    keep their current values. Used to persist theme and navigation-layout
    choices so they survive re-login and follow the user across devices.
    """
    profile = db.exec(select(Profiles).where(Profiles.userId == user_id)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if body.layoutId is not None:
        profile.layoutId = body.layoutId
    if body.themeId is not None:
        profile.themeId = body.themeId
    if body.timezone is not None:
        profile.timezone = body.timezone

    db.add(profile)
    db.commit()
    db.refresh(profile)

    return ProfileResponse(
        timezone=profile.timezone,
        layoutId=profile.layoutId,
        themeId=profile.themeId,
    )