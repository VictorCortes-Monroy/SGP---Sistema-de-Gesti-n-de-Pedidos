from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Any, List
from uuid import UUID
import os
import hashlib

from app.api import deps
from app.models.users import User
from app.models.maintenance.document import MaintDocument, DOCUMENT_TYPES
from app.models.maintenance.request import MaintRequest

router = APIRouter()
download_router = APIRouter()

UPLOAD_DIR = "uploads/documents"
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.get("/{id}/documents")
async def list_documents(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    result = await db.execute(
        select(MaintDocument)
        .options(selectinload(MaintDocument.uploaded_by))
        .where(MaintDocument.maint_request_id == id)
        .order_by(MaintDocument.document_type, MaintDocument.uploaded_at)
    )
    docs = result.scalars().all()
    return [
        {
            "id": str(d.id),
            "maint_request_id": str(d.maint_request_id),
            "document_type": d.document_type,
            "file_name": d.file_name,
            "file_size": d.file_size,
            "mime_type": d.mime_type,
            "notes": d.notes,
            "uploaded_by_id": str(d.uploaded_by_id),
            "uploaded_by_name": d.uploaded_by.full_name if d.uploaded_by else None,
            "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else None,
        }
        for d in docs
    ]


@router.post("/{id}/documents")
async def upload_document(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    document_type: str = Query(..., description="Document type: D1, D2, D3, D4, D5, D6 or D7"),
    notes: str = Query(None),
    file: UploadFile = File(...),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    if document_type not in DOCUMENT_TYPES:
        raise HTTPException(status_code=422, detail=f"document_type must be one of {DOCUMENT_TYPES}")

    # Verify the SM exists
    sm_result = await db.execute(select(MaintRequest).where(MaintRequest.id == id))
    sm = sm_result.scalars().first()
    if not sm:
        raise HTTPException(status_code=404, detail="Maintenance Request not found")

    # Read file content (enforce size limit)
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds maximum size of 10MB")

    # Determine mime type (trust content-type header as a hint)
    mime_type = file.content_type or "application/octet-stream"

    # Save file
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    safe_filename = f"{id}_{document_type}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    with open(file_path, "wb") as f:
        f.write(content)

    doc = MaintDocument(
        maint_request_id=id,
        document_type=document_type,
        file_name=file.filename,
        file_path=file_path,
        file_size=len(content),
        mime_type=mime_type,
        notes=notes,
        uploaded_by_id=current_user.id,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    return {
        "id": str(doc.id),
        "document_type": doc.document_type,
        "file_name": doc.file_name,
        "file_size": doc.file_size,
        "mime_type": doc.mime_type,
        "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
    }


@download_router.get("/{doc_id}/download")
async def download_document(
    *,
    db: AsyncSession = Depends(deps.get_db),
    doc_id: UUID,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    result = await db.execute(select(MaintDocument).where(MaintDocument.id == doc_id))
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on server")

    return FileResponse(
        path=doc.file_path,
        filename=doc.file_name,
        media_type=doc.mime_type or "application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{doc.file_name}"'},
    )
