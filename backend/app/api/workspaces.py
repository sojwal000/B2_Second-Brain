"""
Collaborative Workspaces API Routes
Shared workspaces for team collaboration on content.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.database import (
    User, Content, Workspace, WorkspaceMember, WorkspaceContent, WorkspaceRole
)
from app.schemas.schemas import (
    WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse, WorkspaceDetailResponse,
    WorkspaceMemberAdd, WorkspaceMemberResponse,
    WorkspaceContentAdd, WorkspaceContentResponse,
    PaginatedResponse, SuccessResponse
)

router = APIRouter()


# ============================================================================
# Helpers
# ============================================================================

async def _get_workspace_or_404(
    workspace_id: int, user_id: int, db: AsyncSession, require_role: str = None
) -> Workspace:
    """Get workspace and verify user is a member."""
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")

    # Check membership
    member = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
        )
    )
    membership = member.scalar_one_or_none()

    # Owner always has access
    if workspace.owner_id == user_id:
        return workspace

    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this workspace")

    if require_role:
        role_hierarchy = {"viewer": 0, "editor": 1, "admin": 2, "owner": 3}
        if role_hierarchy.get(membership.role.value, 0) < role_hierarchy.get(require_role, 0):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    return workspace


async def _workspace_to_response(workspace: Workspace, db: AsyncSession) -> WorkspaceResponse:
    """Convert workspace model to response."""
    # Count members
    mc = await db.execute(
        select(func.count()).where(WorkspaceMember.workspace_id == workspace.id)
    )
    member_count = mc.scalar() or 0

    # Count contents
    cc = await db.execute(
        select(func.count()).where(WorkspaceContent.workspace_id == workspace.id)
    )
    content_count = cc.scalar() or 0

    # Get owner username
    owner = await db.execute(select(User).where(User.id == workspace.owner_id))
    owner_user = owner.scalar_one_or_none()

    return WorkspaceResponse(
        id=workspace.id,
        name=workspace.name,
        description=workspace.description,
        owner_id=workspace.owner_id,
        owner_username=owner_user.username if owner_user else None,
        member_count=member_count + 1,  # +1 for owner
        content_count=content_count,
        created_at=workspace.created_at,
        updated_at=workspace.updated_at,
    )


# ============================================================================
# Workspace CRUD
# ============================================================================

@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    data: WorkspaceCreate,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Create a new workspace."""
    workspace = Workspace(
        name=data.name,
        description=data.description,
        owner_id=user_id,
    )
    db.add(workspace)
    await db.commit()
    await db.refresh(workspace)

    return await _workspace_to_response(workspace, db)


@router.get("", response_model=PaginatedResponse)
async def list_workspaces(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """List workspaces the user owns or is a member of."""
    # Get workspace IDs where user is owner or member
    member_ws = select(WorkspaceMember.workspace_id).where(WorkspaceMember.user_id == user_id)
    query = select(Workspace).where(
        (Workspace.owner_id == user_id) | (Workspace.id.in_(member_ws))
    )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    offset = (page - 1) * page_size
    query = query.order_by(Workspace.updated_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    workspaces = result.scalars().all()

    items = []
    for ws in workspaces:
        resp = await _workspace_to_response(ws, db)
        items.append(resp.model_dump())

    total_pages = (total + page_size - 1) // page_size
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1,
    )


@router.get("/{workspace_id}", response_model=WorkspaceDetailResponse)
async def get_workspace(
    workspace_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get workspace detail with members and contents."""
    workspace = await _get_workspace_or_404(workspace_id, user_id, db)

    # Get members
    members_result = await db.execute(
        select(WorkspaceMember, User)
        .join(User, WorkspaceMember.user_id == User.id)
        .where(WorkspaceMember.workspace_id == workspace_id)
    )
    members = [
        WorkspaceMemberResponse(
            id=wm.id,
            user_id=wm.user_id,
            username=u.username,
            full_name=u.full_name,
            role=wm.role.value,
            joined_at=wm.joined_at,
        )
        for wm, u in members_result.all()
    ]

    # Add owner as pseudo-member
    owner = await db.execute(select(User).where(User.id == workspace.owner_id))
    owner_user = owner.scalar_one_or_none()
    if owner_user:
        members.insert(0, WorkspaceMemberResponse(
            id=0,
            user_id=owner_user.id,
            username=owner_user.username,
            full_name=owner_user.full_name,
            role="owner",
            joined_at=workspace.created_at,
        ))

    # Get contents
    contents_result = await db.execute(
        select(WorkspaceContent, Content, User)
        .join(Content, WorkspaceContent.content_id == Content.id)
        .join(User, WorkspaceContent.added_by == User.id)
        .where(WorkspaceContent.workspace_id == workspace_id)
    )
    contents = [
        WorkspaceContentResponse(
            id=wc.id,
            content_id=wc.content_id,
            content_title=c.title,
            content_type=c.content_type.value if c.content_type else None,
            added_by_username=u.username,
            added_at=wc.added_at,
        )
        for wc, c, u in contents_result.all()
    ]

    base = await _workspace_to_response(workspace, db)
    return WorkspaceDetailResponse(
        **base.model_dump(),
        members=members,
        contents=contents,
    )


@router.patch("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: int,
    data: WorkspaceUpdate,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Update workspace (owner/admin only)."""
    workspace = await _get_workspace_or_404(workspace_id, user_id, db, require_role="admin")

    if data.name is not None:
        workspace.name = data.name
    if data.description is not None:
        workspace.description = data.description

    await db.commit()
    await db.refresh(workspace)
    return await _workspace_to_response(workspace, db)


@router.delete("/{workspace_id}", response_model=SuccessResponse)
async def delete_workspace(
    workspace_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Delete workspace (owner only)."""
    result = await db.execute(
        select(Workspace).where(Workspace.id == workspace_id, Workspace.owner_id == user_id)
    )
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found or not owner")

    await db.delete(workspace)
    await db.commit()
    return SuccessResponse(message="Workspace deleted")


# ============================================================================
# Member Management
# ============================================================================

@router.post("/{workspace_id}/members", response_model=WorkspaceMemberResponse)
async def add_member(
    workspace_id: int,
    data: WorkspaceMemberAdd,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Add a member to workspace (admin/owner)."""
    workspace = await _get_workspace_or_404(workspace_id, user_id, db, require_role="admin")

    # Find user
    target = await db.execute(select(User).where(User.username == data.username))
    target_user = target.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if target_user.id == workspace.owner_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Owner is already in workspace")

    # Check existing
    existing = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == target_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already a member")

    role_map = {
        "admin": WorkspaceRole.ADMIN,
        "editor": WorkspaceRole.EDITOR,
        "viewer": WorkspaceRole.VIEWER,
    }
    role = role_map.get(data.role, WorkspaceRole.VIEWER)

    member = WorkspaceMember(
        workspace_id=workspace_id,
        user_id=target_user.id,
        role=role,
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)

    return WorkspaceMemberResponse(
        id=member.id,
        user_id=target_user.id,
        username=target_user.username,
        full_name=target_user.full_name,
        role=member.role.value,
        joined_at=member.joined_at,
    )


@router.delete("/{workspace_id}/members/{member_user_id}", response_model=SuccessResponse)
async def remove_member(
    workspace_id: int,
    member_user_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Remove a member from workspace."""
    workspace = await _get_workspace_or_404(workspace_id, user_id, db, require_role="admin")

    if member_user_id == workspace.owner_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove owner")

    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == member_user_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    await db.delete(member)
    await db.commit()
    return SuccessResponse(message="Member removed")


# ============================================================================
# Workspace Content
# ============================================================================

@router.post("/{workspace_id}/content", response_model=WorkspaceContentResponse)
async def add_content_to_workspace(
    workspace_id: int,
    data: WorkspaceContentAdd,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Add content to workspace (editor+)."""
    workspace = await _get_workspace_or_404(workspace_id, user_id, db, require_role="editor")

    # Verify content ownership
    content_result = await db.execute(
        select(Content).where(Content.id == data.content_id, Content.user_id == user_id)
    )
    content = content_result.scalar_one_or_none()
    if not content:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")

    # Check duplicate
    existing = await db.execute(
        select(WorkspaceContent).where(
            WorkspaceContent.workspace_id == workspace_id,
            WorkspaceContent.content_id == data.content_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Content already in workspace")

    wc = WorkspaceContent(
        workspace_id=workspace_id,
        content_id=data.content_id,
        added_by=user_id,
    )
    db.add(wc)
    await db.commit()
    await db.refresh(wc)

    user = await db.execute(select(User).where(User.id == user_id))
    u = user.scalar_one()

    return WorkspaceContentResponse(
        id=wc.id,
        content_id=wc.content_id,
        content_title=content.title,
        content_type=content.content_type.value if content.content_type else None,
        added_by_username=u.username,
        added_at=wc.added_at,
    )


@router.delete("/{workspace_id}/content/{content_id}", response_model=SuccessResponse)
async def remove_content_from_workspace(
    workspace_id: int,
    content_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Remove content from workspace (editor+)."""
    await _get_workspace_or_404(workspace_id, user_id, db, require_role="editor")

    result = await db.execute(
        select(WorkspaceContent).where(
            WorkspaceContent.workspace_id == workspace_id,
            WorkspaceContent.content_id == content_id,
        )
    )
    wc = result.scalar_one_or_none()
    if not wc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not in workspace")

    await db.delete(wc)
    await db.commit()
    return SuccessResponse(message="Content removed from workspace")
