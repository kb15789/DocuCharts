from fastapi import APIRouter, Depends, HTTPException, status

from app.models.chat import ChatHistoryItem, ChatQueryRequest, ChatResponse
from app.services.chat_service import ask_ai, get_chat_history, store_chat_history
from app.utils.deps import get_current_user


router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/query", response_model=ChatResponse)
async def chatbot_query(
    payload: ChatQueryRequest,
    current_user: dict = Depends(get_current_user),
):
    if not current_user.get("chat_assistant_enabled", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chat assistant is disabled for this account.",
        )

    selected_ids = [str(doc_id) for doc_id in payload.document_ids]
    answer = await ask_ai(current_user["id"], payload.question, selected_ids)
    await store_chat_history(current_user["id"], payload.question, answer, selected_ids)
    return ChatResponse(answer=answer)


@router.get("/history", response_model=list[ChatHistoryItem])
async def chat_history(current_user: dict = Depends(get_current_user)):
    if not current_user.get("chat_assistant_enabled", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chat assistant is disabled for this account.",
        )

    history = await get_chat_history(current_user["id"])
    return [ChatHistoryItem(**item) for item in history]
