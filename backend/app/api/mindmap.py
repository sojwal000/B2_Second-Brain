"""
Mind Map / Knowledge Graph API Routes
Handles visualization of content relationships and links
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.database import Content, ContentLink, LinkType
from app.schemas.schemas import (
    ContentLinkCreate, ContentLinkResponse,
    MindMapNode, MindMapEdge, MindMapResponse,
    SuccessResponse
)

router = APIRouter()


# ============================================================================
# Mind Map Generation
# ============================================================================

@router.get("", response_model=MindMapResponse)
async def get_mind_map(
    subject: Optional[str] = None,
    tags: Optional[str] = None,  # comma-separated
    depth: int = Query(2, ge=1, le=5),
    max_nodes: int = Query(100, ge=10, le=500),
    include_links: bool = True,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a mind map / knowledge graph of user's content.
    Returns nodes (content items) and edges (relationships).
    """
    # Build base query for content
    query = select(Content).where(
        Content.user_id == user_id,
        Content.is_archived == False
    )
    
    if subject:
        query = query.where(Content.subject == subject)
    
    if tags:
        tag_list = [t.strip() for t in tags.split(",")]
        for tag in tag_list:
            query = query.where(Content.tags.contains([tag]))
    
    query = query.limit(max_nodes)
    
    result = await db.execute(query)
    contents = result.scalars().all()
    
    if not contents:
        return MindMapResponse(
            nodes=[],
            edges=[],
            subjects=[],
            total_nodes=0,
            total_edges=0
        )
    
    content_ids = [c.id for c in contents]
    
    # Build nodes
    nodes = []
    subject_set = set()
    
    for content in contents:
        if content.subject:
            subject_set.add(content.subject)
        
        nodes.append(MindMapNode(
            id=str(content.id),
            label=content.title[:50],
            type=content.content_type.value,
            subject=content.subject,
            tags=content.tags or [],
            size=_calculate_node_size(content),
            color=_get_type_color(content.content_type.value),
            metadata={
                "created_at": content.created_at.isoformat(),
                "view_count": content.view_count,
                "has_summary": bool(content.summary)
            }
        ))
    
    # Build edges from explicit links
    edges = []
    
    if include_links:
        links_result = await db.execute(
            select(ContentLink).where(
                or_(
                    ContentLink.source_id.in_(content_ids),
                    ContentLink.target_id.in_(content_ids)
                )
            )
        )
        links = links_result.scalars().all()
        
        for link in links:
            edges.append(MindMapEdge(
                id=str(link.id),
                source=str(link.source_id),
                target=str(link.target_id),
                type=link.link_type.value,
                weight=link.weight,
                label=link.description
            ))
    
    # Add implicit edges based on shared tags
    tag_edges = await _generate_tag_edges(contents, content_ids, edges)
    edges.extend(tag_edges)
    
    # Add subject-based edges (content in same subject are related)
    subject_edges = await _generate_subject_edges(contents, content_ids, edges)
    edges.extend(subject_edges)
    
    return MindMapResponse(
        nodes=nodes,
        edges=edges,
        subjects=list(subject_set),
        total_nodes=len(nodes),
        total_edges=len(edges)
    )


# ============================================================================
# Content Links Management
# ============================================================================

@router.post("/links", response_model=ContentLinkResponse, status_code=status.HTTP_201_CREATED)
async def create_link(
    link_data: ContentLinkCreate,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Create a link between two content items."""
    # Verify both contents belong to user
    source_result = await db.execute(
        select(Content).where(
            Content.id == link_data.source_id,
            Content.user_id == user_id
        )
    )
    if not source_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source content not found"
        )
    
    target_result = await db.execute(
        select(Content).where(
            Content.id == link_data.target_id,
            Content.user_id == user_id
        )
    )
    if not target_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target content not found"
        )
    
    # Check if link already exists
    existing_result = await db.execute(
        select(ContentLink).where(
            ContentLink.source_id == link_data.source_id,
            ContentLink.target_id == link_data.target_id
        )
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Link already exists"
        )
    
    link = ContentLink(
        source_id=link_data.source_id,
        target_id=link_data.target_id,
        link_type=link_data.link_type,
        description=link_data.description,
        weight=link_data.weight,
        is_bidirectional=link_data.is_bidirectional
    )
    
    db.add(link)
    await db.commit()
    await db.refresh(link)
    
    return link


@router.get("/links/{content_id}", response_model=List[ContentLinkResponse])
async def get_content_links(
    content_id: int,
    direction: str = Query("both", regex="^(incoming|outgoing|both)$"),
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get all links for a content item."""
    # Verify content ownership
    result = await db.execute(
        select(Content).where(
            Content.id == content_id,
            Content.user_id == user_id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found"
        )
    
    # Build query based on direction
    if direction == "outgoing":
        query = select(ContentLink).where(ContentLink.source_id == content_id)
    elif direction == "incoming":
        query = select(ContentLink).where(ContentLink.target_id == content_id)
    else:
        query = select(ContentLink).where(
            or_(
                ContentLink.source_id == content_id,
                ContentLink.target_id == content_id
            )
        )
    
    result = await db.execute(query)
    links = result.scalars().all()
    
    return links


@router.delete("/links/{link_id}", response_model=SuccessResponse)
async def delete_link(
    link_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Delete a content link."""
    # Get link
    result = await db.execute(
        select(ContentLink).where(ContentLink.id == link_id)
    )
    link = result.scalar_one_or_none()
    
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Link not found"
        )
    
    # Verify ownership through source content
    source_result = await db.execute(
        select(Content).where(
            Content.id == link.source_id,
            Content.user_id == user_id
        )
    )
    if not source_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this link"
        )
    
    await db.delete(link)
    await db.commit()
    
    return SuccessResponse(message="Link deleted successfully")


# ============================================================================
# Auto-link Suggestions
# ============================================================================

@router.get("/suggestions/{content_id}")
async def get_link_suggestions(
    content_id: int,
    limit: int = Query(10, ge=1, le=50),
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    Get suggestions for content that could be linked.
    Uses semantic similarity and shared tags/subjects.
    """
    # Verify content ownership
    result = await db.execute(
        select(Content).where(
            Content.id == content_id,
            Content.user_id == user_id
        )
    )
    content = result.scalar_one_or_none()
    
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found"
        )
    
    # Get already linked content
    existing_links = await db.execute(
        select(ContentLink.target_id).where(ContentLink.source_id == content_id)
    )
    linked_ids = {row[0] for row in existing_links.all()}
    linked_ids.add(content_id)  # Exclude self
    
    suggestions = []
    
    # Find content with same subject
    if content.subject:
        subject_result = await db.execute(
            select(Content)
            .where(
                Content.user_id == user_id,
                Content.subject == content.subject,
                ~Content.id.in_(linked_ids)
            )
            .limit(limit)
        )
        for c in subject_result.scalars().all():
            suggestions.append({
                "content_id": c.id,
                "title": c.title,
                "reason": f"Same subject: {content.subject}",
                "relevance": 0.8
            })
    
    # Find content with shared tags
    if content.tags:
        for tag in content.tags[:5]:  # Limit to first 5 tags
            tag_result = await db.execute(
                select(Content)
                .where(
                    Content.user_id == user_id,
                    Content.tags.contains([tag]),
                    ~Content.id.in_(linked_ids)
                )
                .limit(5)
            )
            for c in tag_result.scalars().all():
                if not any(s["content_id"] == c.id for s in suggestions):
                    suggestions.append({
                        "content_id": c.id,
                        "title": c.title,
                        "reason": f"Shared tag: {tag}",
                        "relevance": 0.6
                    })
    
    # Sort by relevance and limit
    suggestions.sort(key=lambda x: x["relevance"], reverse=True)
    
    return {"suggestions": suggestions[:limit]}


# ============================================================================
# AI-powered Link Discovery
# ============================================================================

@router.post("/discover")
async def discover_links(
    min_similarity: float = Query(0.7, ge=0.5, le=1.0),
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    Discover potential links using semantic similarity.
    Uses embedding vectors to find related content.
    """
    from app.services.search_service import SearchService
    search_service = SearchService(db, user_id)
    
    try:
        # Get all user's content
        result = await db.execute(
            select(Content).where(
                Content.user_id == user_id,
                Content.processing_status == "completed"
            )
        )
        contents = result.scalars().all()
        
        if len(contents) < 2:
            return {"discovered_links": [], "message": "Need at least 2 processed content items"}
        
        # Find similar pairs
        discovered = []
        for content in contents[:50]:  # Limit for performance
            similar = await search_service.find_similar(
                content_id=content.id,
                limit=5,
                min_score=min_similarity
            )
            
            for match in similar:
                if match["id"] != content.id:
                    # Check if link exists
                    existing = await db.execute(
                        select(ContentLink).where(
                            or_(
                                and_(
                                    ContentLink.source_id == content.id,
                                    ContentLink.target_id == match["id"]
                                ),
                                and_(
                                    ContentLink.source_id == match["id"],
                                    ContentLink.target_id == content.id
                                )
                            )
                        )
                    )
                    
                    if not existing.scalar_one_or_none():
                        discovered.append({
                            "source_id": content.id,
                            "source_title": content.title,
                            "target_id": match["id"],
                            "target_title": match["title"],
                            "similarity": match["score"],
                            "suggested_type": "related"
                        })
        
        # Remove duplicates and sort
        seen = set()
        unique_discovered = []
        for d in discovered:
            key = tuple(sorted([d["source_id"], d["target_id"]]))
            if key not in seen:
                seen.add(key)
                unique_discovered.append(d)
        
        unique_discovered.sort(key=lambda x: x["similarity"], reverse=True)
        
        return {
            "discovered_links": unique_discovered[:20],
            "total_discovered": len(unique_discovered)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Link discovery failed: {str(e)}"
        )


# ============================================================================
# Bulk Link Creation
# ============================================================================

@router.post("/links/bulk", response_model=SuccessResponse)
async def create_links_bulk(
    links: List[ContentLinkCreate],
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Create multiple links at once (from discovery results)."""
    if len(links) > 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 50 links per request"
        )
    
    created_count = 0
    
    for link_data in links:
        # Verify ownership
        source_result = await db.execute(
            select(Content).where(
                Content.id == link_data.source_id,
                Content.user_id == user_id
            )
        )
        target_result = await db.execute(
            select(Content).where(
                Content.id == link_data.target_id,
                Content.user_id == user_id
            )
        )
        
        if source_result.scalar_one_or_none() and target_result.scalar_one_or_none():
            # Check if exists
            existing = await db.execute(
                select(ContentLink).where(
                    ContentLink.source_id == link_data.source_id,
                    ContentLink.target_id == link_data.target_id
                )
            )
            
            if not existing.scalar_one_or_none():
                link = ContentLink(
                    source_id=link_data.source_id,
                    target_id=link_data.target_id,
                    link_type=link_data.link_type,
                    description=link_data.description,
                    weight=link_data.weight,
                    is_bidirectional=link_data.is_bidirectional
                )
                db.add(link)
                created_count += 1
    
    await db.commit()
    
    return SuccessResponse(message=f"Created {created_count} links")


# ============================================================================
# Helper Functions
# ============================================================================

def _calculate_node_size(content: Content) -> int:
    """Calculate node size based on content importance."""
    base_size = 20
    
    # Increase for favorites/pinned
    if content.is_favorite:
        base_size += 10
    if content.is_pinned:
        base_size += 5
    
    # Increase for view count
    base_size += min(content.view_count, 20)
    
    return base_size


def _get_type_color(content_type: str) -> str:
    """Get color for content type."""
    colors = {
        "text": "#4CAF50",
        "document": "#2196F3",
        "image": "#FF9800",
        "audio": "#9C27B0",
        "video": "#F44336",
        "web": "#00BCD4",
        "code": "#795548"
    }
    return colors.get(content_type, "#607D8B")


async def _generate_tag_edges(
    contents: list,
    content_ids: list,
    existing_edges: list
) -> List[MindMapEdge]:
    """Generate edges based on shared tags."""
    edges = []
    existing_pairs = {(e.source, e.target) for e in existing_edges}
    
    # Build tag index
    tag_to_content = {}
    for content in contents:
        if content.tags:
            for tag in content.tags:
                if tag not in tag_to_content:
                    tag_to_content[tag] = []
                tag_to_content[tag].append(content.id)
    
    # Create edges for content sharing tags
    edge_id = len(existing_edges) + 1000
    for tag, cids in tag_to_content.items():
        if len(cids) > 1 and len(cids) <= 10:  # Avoid over-connecting
            for i, cid1 in enumerate(cids):
                for cid2 in cids[i+1:]:
                    pair = (str(cid1), str(cid2))
                    reverse_pair = (str(cid2), str(cid1))
                    if pair not in existing_pairs and reverse_pair not in existing_pairs:
                        edges.append(MindMapEdge(
                            id=f"tag_{edge_id}",
                            source=str(cid1),
                            target=str(cid2),
                            type="shared_tag",
                            weight=0.5,
                            label=tag
                        ))
                        existing_pairs.add(pair)
                        edge_id += 1
    
    return edges


async def _generate_subject_edges(
    contents: list,
    content_ids: list,
    existing_edges: list
) -> List[MindMapEdge]:
    """Generate edges based on shared subjects."""
    edges = []
    existing_pairs = {(e.source, e.target) for e in existing_edges}
    
    # Group by subject
    subject_to_content = {}
    for content in contents:
        if content.subject:
            if content.subject not in subject_to_content:
                subject_to_content[content.subject] = []
            subject_to_content[content.subject].append(content.id)
    
    edge_id = len(existing_edges) + 2000
    for subject, cids in subject_to_content.items():
        if len(cids) > 1 and len(cids) <= 15:
            # Create a star topology with first content as center
            center = cids[0]
            for cid in cids[1:]:
                pair = (str(center), str(cid))
                if pair not in existing_pairs:
                    edges.append(MindMapEdge(
                        id=f"subject_{edge_id}",
                        source=str(center),
                        target=str(cid),
                        type="same_subject",
                        weight=0.3,
                        label=None
                    ))
                    existing_pairs.add(pair)
                    edge_id += 1
    
    return edges
