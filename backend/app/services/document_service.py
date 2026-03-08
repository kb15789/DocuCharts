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


def _prefixed_row(row: dict, prefix: str) -> dict:
    return {f"{prefix}.{key}": value for key, value in row.items()}


def _merge_join_rows(left_row: dict | None, right_row: dict | None, left_prefix: str, right_prefix: str) -> dict:
    merged: dict = {}
    if left_row is not None:
        merged.update(_prefixed_row(left_row, left_prefix))
    if right_row is not None:
        merged.update(_prefixed_row(right_row, right_prefix))
    return merged


async def get_joined_document_data(
    user_id: str,
    left_document_id: str,
    right_document_id: str,
    left_column: str,
    right_column: str,
    join_type: str,
) -> dict:
    docs = await get_user_documents_by_ids(user_id, [left_document_id, right_document_id])
    docs_by_id = {doc["id"]: doc for doc in docs}

    left_doc = docs_by_id.get(left_document_id)
    right_doc = docs_by_id.get(right_document_id)
    if not left_doc or not right_doc:
        return {"columns": [], "rows": []}

    left_rows = left_doc.get("parsed_rows") or []
    right_rows = right_doc.get("parsed_rows") or []

    left_columns = set(left_doc.get("parsed_columns") or [])
    right_columns = set(right_doc.get("parsed_columns") or [])
    if left_column not in left_columns or right_column not in right_columns:
        return {"columns": [], "rows": []}

    left_prefix = left_doc["name"]
    right_prefix = right_doc["name"]

    right_index: dict[str, list[tuple[int, dict]]] = {}
    for idx, row in enumerate(right_rows):
        key = str(row.get(right_column, ""))
        right_index.setdefault(key, []).append((idx, row))

    joined_rows: list[dict] = []
    matched_right_indexes: set[int] = set()

    for left_row in left_rows:
        left_key = str(left_row.get(left_column, ""))
        matches = right_index.get(left_key, [])

        if matches:
            for right_idx, right_row in matches:
                matched_right_indexes.add(right_idx)
                joined_rows.append(_merge_join_rows(left_row, right_row, left_prefix, right_prefix))
        elif join_type in {"left", "full"}:
            joined_rows.append(_merge_join_rows(left_row, None, left_prefix, right_prefix))

    if join_type in {"right", "full"}:
        for right_idx, right_row in enumerate(right_rows):
            if right_idx in matched_right_indexes:
                continue
            joined_rows.append(_merge_join_rows(None, right_row, left_prefix, right_prefix))

    if join_type == "inner":
        joined_rows = [row for row in joined_rows if row]
    elif join_type == "right":
        # Remove rows that only originated from unmatched left rows.
        joined_rows = [
            row
            for row in joined_rows
            if any(key.startswith(f"{right_prefix}.") for key in row.keys())
        ]

    joined_columns: list[str] = []
    for row in joined_rows:
        for col in row.keys():
            if col not in joined_columns:
                joined_columns.append(col)

    return {"columns": joined_columns, "rows": joined_rows}


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
