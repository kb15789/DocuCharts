from uuid import uuid4

from openai import AsyncOpenAI

from app.core.config import settings
from app.database.supabase_client import supabase
from app.services.document_service import get_selected_document_context


openai_client = AsyncOpenAI(api_key=settings.openai_api_key)


async def ask_ai(user_id: str, question: str, document_ids: list[str]) -> str:
    # Bound the model context strictly to user-selected uploaded documents.
    context = await get_selected_document_context(user_id, document_ids)

    messages = [
        {
            "role": "system",
            "content": (
                "You are a document analytics assistant. "
                "Answer only using the provided selected-document context and user question."
            ),
        },
        {
            "role": "user",
            "content": f"{context}\n\nQuestion: {question}",
        },
    ]

    completion = await openai_client.chat.completions.create(
        model=settings.openai_model,
        messages=messages,
        temperature=0.2,
    )
    return completion.choices[0].message.content or "No answer generated."


async def store_chat_history(
    user_id: str,
    question: str,
    answer: str,
    document_ids: list[str],
) -> dict:
    payload = {
        "id": str(uuid4()),
        "user_id": user_id,
        "document_ids": document_ids,
        "question": question,
        "answer": answer,
    }
    response = supabase.table("chat_history").insert(payload).execute()
    return response.data[0]


async def get_chat_history(user_id: str) -> list[dict]:
    response = (
        supabase.table("chat_history")
        .select("id, user_id, document_ids, question, answer, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=False)
        .execute()
    )
    return response.data or []
