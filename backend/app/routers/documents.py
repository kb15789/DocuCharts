from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.models.documents import (
    DocumentDataRequest,
    DocumentDataResponse,
    DocumentResponse,
    UploadSummaryResponse,
)
from app.services.document_service import (
    delete_user_document,
    get_merged_document_data,
    get_user_documents,
    save_document_metadata,
)
from app.utils.deps import get_current_user


router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=UploadSummaryResponse)
async def upload_documents(
    files: list[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user),
):
    saved = await save_document_metadata(current_user["id"], files)
    documents = [DocumentResponse(**doc) for doc in saved]
    return UploadSummaryResponse(uploaded_count=len(documents), documents=documents)


@router.get("/", response_model=list[DocumentResponse])
async def fetch_documents(current_user: dict = Depends(get_current_user)):
    docs = await get_user_documents(current_user["id"])
    return [DocumentResponse(**doc) for doc in docs]


@router.post("/data", response_model=DocumentDataResponse)
async def fetch_document_data(
    payload: DocumentDataRequest,
    current_user: dict = Depends(get_current_user),
):
    data = await get_merged_document_data(
        current_user["id"], [str(doc_id) for doc_id in payload.document_ids]
    )
    return DocumentDataResponse(**data)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_document(
    document_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    deleted = await delete_user_document(current_user["id"], str(document_id))
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
