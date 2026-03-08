from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.models.documents import (
    AIInsightsRequest,
    AIInsightsResponse,
    DocumentDataRequest,
    DocumentDataResponse,
    DocumentJoinRequest,
    DocumentResponse,
    UploadSummaryResponse,
)
from app.services.document_service import (
    delete_user_document,
    get_joined_document_data,
    get_merged_document_data,
    get_user_documents,
    save_document_metadata,
)
from app.services.visualization_service import generate_ai_insights
from app.services.activity_service import record_user_activity_log, record_user_query_log
from app.utils.deps import get_current_user


router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=UploadSummaryResponse)
async def upload_documents(
    files: list[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user),
):
    saved = await save_document_metadata(current_user["id"], files)
    await record_user_activity_log(current_user["id"], "document_upload")
    documents = [DocumentResponse(**doc) for doc in saved]
    return UploadSummaryResponse(uploaded_count=len(documents), documents=documents)


@router.get("/", response_model=list[DocumentResponse])
async def fetch_documents(current_user: dict = Depends(get_current_user)):
    docs = await get_user_documents(current_user["id"])
    await record_user_activity_log(current_user["id"], "documents_list_view")
    return [DocumentResponse(**doc) for doc in docs]


@router.post("/data", response_model=DocumentDataResponse)
async def fetch_document_data(
    payload: DocumentDataRequest,
    current_user: dict = Depends(get_current_user),
):
    data = await get_merged_document_data(
        current_user["id"], [str(doc_id) for doc_id in payload.document_ids]
    )
    await record_user_activity_log(current_user["id"], "documents_data_view")
    return DocumentDataResponse(**data)


@router.post("/join", response_model=DocumentDataResponse)
async def join_document_data(
    payload: DocumentJoinRequest,
    current_user: dict = Depends(get_current_user),
):
    if payload.left_document_id == payload.right_document_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Please select two different documents to join.",
        )

    data = await get_joined_document_data(
        current_user["id"],
        str(payload.left_document_id),
        str(payload.right_document_id),
        payload.left_column,
        payload.right_column,
        payload.join_type,
    )
    await record_user_activity_log(current_user["id"], f"documents_join_{payload.join_type}")
    return DocumentDataResponse(**data)


@router.post("/ai-insights", response_model=AIInsightsResponse)
async def fetch_ai_insights(
    payload: AIInsightsRequest,
    current_user: dict = Depends(get_current_user),
):
    insights = await generate_ai_insights(
        current_user["id"],
        [str(doc_id) for doc_id in payload.document_ids],
        payload.custom_prompt,
    )
    await record_user_query_log(
        current_user["id"],
        "visualization",
        payload.custom_prompt or "Auto insights generation",
    )
    await record_user_activity_log(current_user["id"], "ai_insights_generate")
    return AIInsightsResponse(**insights)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_document(
    document_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    deleted = await delete_user_document(current_user["id"], str(document_id))
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    await record_user_activity_log(current_user["id"], "document_delete")
