from uuid import uuid4

from fastapi import UploadFile

from app.database.supabase_client import supabase
from app.utils.document_parser import parse_tabular_document


async def save_document_metadata(user_id: str, files: list[UploadFile]) -> list[dict]:
    documents: list[dict] = []

    for file in files:
        filename = file.filename or "unnamed_file"
        content = await file.read()
        parsed = parse_tabular_document(filename, content)

        row = {
            "id": str(uuid4()),
            "user_id": user_id,
            "name": filename,
            "file_type": parsed["file_type"],
            "parse_status": parsed["parse_status"],
            "row_count": parsed["row_count"],
            "parsed_columns": parsed["parsed_columns"],
            "parsed_rows": parsed["parsed_rows"],
        }
        created = supabase.table("documents").insert(row).execute().data[0]
        documents.append(created)

    return documents


async def get_user_documents(user_id: str) -> list[dict]:
    response = (
        supabase.table("documents")
        .select("id, user_id, name, file_type, parse_status, row_count, uploaded_at")
        .eq("user_id", user_id)
        .order("uploaded_at", desc=True)
        .execute()
    )
    return response.data or []


async def get_user_documents_by_ids(user_id: str, document_ids: list[str]) -> list[dict]:
    if not document_ids:
        return []

    response = (
        supabase.table("documents")
        .select("id, name, parsed_columns, parsed_rows, parse_status")
        .eq("user_id", user_id)
        .in_("id", document_ids)
        .execute()
    )
    return response.data or []


async def get_merged_document_data(user_id: str, document_ids: list[str]) -> dict:
    docs = await get_user_documents_by_ids(user_id, document_ids)

    merged_rows: list[dict] = []
    all_columns: list[str] = []

    for doc in docs:
        rows = doc.get("parsed_rows") or []
        for row in rows:
            merged = {
                "_document": doc["name"],
                **row,
            }
            merged_rows.append(merged)

        for col in doc.get("parsed_columns") or []:
            if col not in all_columns:
                all_columns.append(col)

    columns = ["_document", *all_columns] if merged_rows else []
    return {"columns": columns, "rows": merged_rows}


async def get_selected_document_context(user_id: str, document_ids: list[str]) -> str:
    docs = await get_user_documents_by_ids(user_id, document_ids)

    if not docs:
        return "No selected documents found for this user."

    lines = []
    for doc in docs:
        columns = doc.get("parsed_columns") or []
        sample_rows = (doc.get("parsed_rows") or [])[:3]
        lines.append(
            f"Document: {doc['name']} | parse_status={doc.get('parse_status')} | columns={columns} | sample_rows={sample_rows}"
        )

    return "Selected document context:\n" + "\n".join(lines)


async def delete_user_document(user_id: str, document_id: str) -> bool:
    existing = (
        supabase.table("documents")
        .select("id")
        .eq("id", document_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not existing.data:
        return False

    supabase.table("documents").delete().eq("id", document_id).eq("user_id", user_id).execute()
    return True
