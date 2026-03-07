import json
from collections import defaultdict
from datetime import datetime
from typing import Any

from openai import AsyncOpenAI

from app.core.config import settings
from app.services.document_service import get_merged_document_data


openai_client = AsyncOpenAI(api_key=settings.openai_api_key)


def _to_number(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number


def _to_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    raw = str(value).strip()
    if not raw:
        return None
    for candidate in (raw, raw.replace("Z", "+00:00")):
        try:
            return datetime.fromisoformat(candidate)
        except ValueError:
            continue
    return None


def _detect_column_types(rows: list[dict[str, Any]], columns: list[str]) -> tuple[list[str], list[str], list[str]]:
    numeric_columns: list[str] = []
    date_columns: list[str] = []
    categorical_columns: list[str] = []

    for column in columns:
        if column == "_document":
            continue
        values = [row.get(column) for row in rows if row.get(column) not in (None, "")]
        if not values:
            continue

        numeric_count = sum(1 for value in values if _to_number(value) is not None)
        date_count = sum(1 for value in values if _to_datetime(value) is not None)
        unique_count = len({str(value) for value in values})

        if numeric_count / len(values) >= 0.8:
            numeric_columns.append(column)
        elif date_count / len(values) >= 0.8:
            date_columns.append(column)
        elif unique_count <= min(25, max(6, len(values) // 2)):
            categorical_columns.append(column)

    if not categorical_columns and columns:
        fallback = next((column for column in columns if column not in ("_document",)), None)
        if fallback:
            categorical_columns.append(fallback)

    return numeric_columns, date_columns, categorical_columns


def _aggregate(
    rows: list[dict[str, Any]],
    x_axis: str,
    y_axis: str | None,
    aggregation: str,
    *,
    sort_as_datetime: bool = False,
) -> list[dict[str, Any]]:
    buckets: dict[str, dict[str, float]] = defaultdict(
        lambda: {"count": 0, "sum": 0, "numeric_count": 0, "epoch": 0}
    )

    for row in rows:
        x_raw = row.get(x_axis, "Unknown")
        x_value = str(x_raw)
        bucket = buckets[x_value]
        bucket["count"] += 1

        if sort_as_datetime:
            dt = _to_datetime(x_raw)
            if dt:
                bucket["epoch"] = dt.timestamp()

        if y_axis:
            numeric = _to_number(row.get(y_axis))
            if numeric is not None:
                bucket["sum"] += numeric
                bucket["numeric_count"] += 1

    points: list[dict[str, Any]] = []
    for label, bucket in buckets.items():
        if aggregation == "count":
            value = bucket["count"]
        elif aggregation == "average":
            value = bucket["sum"] / bucket["numeric_count"] if bucket["numeric_count"] else 0
        else:
            value = bucket["sum"]
        points.append(
            {
                "x": label,
                "value": round(float(value), 2),
                "_epoch": bucket["epoch"],
            }
        )

    if sort_as_datetime:
        points.sort(key=lambda item: item["_epoch"] or float("inf"))
    else:
        points.sort(key=lambda item: item["value"], reverse=True)

    return [{"x": item["x"], "value": item["value"]} for item in points[:12]]


def _build_fallback_insights(rows: list[dict[str, Any]], columns: list[str]) -> dict[str, Any]:
    numeric_columns, date_columns, categorical_columns = _detect_column_types(rows, columns)

    chosen_category = categorical_columns[0] if categorical_columns else "_document"
    chosen_numeric = numeric_columns[0] if numeric_columns else None
    chosen_date = date_columns[0] if date_columns else None

    bar_data = _aggregate(rows, chosen_category, chosen_numeric, "sum" if chosen_numeric else "count")
    pie_data = _aggregate(rows, chosen_category, None, "count")
    line_data = (
        _aggregate(rows, chosen_date, chosen_numeric, "sum" if chosen_numeric else "count", sort_as_datetime=True)
        if chosen_date
        else []
    )

    charts = [
        {
            "title": f"{'Sum of ' + chosen_numeric if chosen_numeric else 'Record Count'} by {chosen_category}",
            "chart_type": "bar",
            "x_axis": chosen_category,
            "y_axis": chosen_numeric,
            "aggregation": "sum" if chosen_numeric else "count",
            "data": bar_data,
        },
        {
            "title": f"Distribution by {chosen_category}",
            "chart_type": "pie",
            "x_axis": chosen_category,
            "y_axis": None,
            "aggregation": "count",
            "data": pie_data,
        },
    ]

    if line_data:
        charts.append(
            {
                "title": f"{'Sum of ' + chosen_numeric if chosen_numeric else 'Record Count'} trend by {chosen_date}",
                "chart_type": "line",
                "x_axis": chosen_date,
                "y_axis": chosen_numeric,
                "aggregation": "sum" if chosen_numeric else "count",
                "data": line_data,
            }
        )

    top_insight = "No significant insight identified."
    key_insights: list[str] = []
    if bar_data:
        winner = bar_data[0]
        top_insight = f"Top segment is {winner['x']} with value {winner['value']}."
        key_insights.append(top_insight)

    if len(line_data) >= 2:
        start = line_data[0]["value"]
        end = line_data[-1]["value"]
        if start:
            delta = ((end - start) / start) * 100
            key_insights.append(f"Trend changed by {delta:.1f}% across the selected period.")

    if len(key_insights) < 3:
        key_insights.append(f"Generated {len(charts)} charts from selected document data.")

    return {
        "top_insight": top_insight,
        "key_insights": key_insights[:4],
        "charts": charts[:3],
    }


def _normalize_insights_payload(payload: dict[str, Any]) -> dict[str, Any] | None:
    top_insight = payload.get("top_insight")
    key_insights = payload.get("key_insights")
    charts = payload.get("charts")
    if not isinstance(top_insight, str) or not isinstance(key_insights, list) or not isinstance(charts, list):
        return None

    cleaned_charts: list[dict[str, Any]] = []
    for chart in charts:
        if not isinstance(chart, dict):
            continue
        chart_type = str(chart.get("chart_type", "bar")).lower()
        if chart_type not in {"bar", "line", "pie"}:
            continue
        raw_data = chart.get("data", [])
        points: list[dict[str, Any]] = []
        if isinstance(raw_data, list):
            for point in raw_data:
                if not isinstance(point, dict):
                    continue
                x_value = str(point.get("x", "Unknown"))
                number = _to_number(point.get("value"))
                points.append({"x": x_value, "value": round(number or 0, 2)})
        if not points:
            continue
        cleaned_charts.append(
            {
                "title": str(chart.get("title") or "Generated Chart"),
                "chart_type": chart_type,
                "x_axis": str(chart.get("x_axis") or "x"),
                "y_axis": str(chart.get("y_axis")) if chart.get("y_axis") else None,
                "aggregation": str(chart.get("aggregation") or "count"),
                "data": points[:12],
            }
        )

    if not cleaned_charts:
        return None

    cleaned_key_insights = [str(item) for item in key_insights if isinstance(item, str)]
    return {
        "top_insight": top_insight.strip() or "No significant insight identified.",
        "key_insights": cleaned_key_insights[:5],
        "charts": cleaned_charts[:3],
    }


async def generate_ai_insights(
    user_id: str,
    document_ids: list[str],
    custom_prompt: str | None = None,
) -> dict[str, Any]:
    merged = await get_merged_document_data(user_id, document_ids)
    rows = merged.get("rows", [])
    columns = merged.get("columns", [])

    if not rows:
        return {
            "top_insight": "No data available for selected documents.",
            "key_insights": ["Upload documents with tabular rows to generate insights."],
            "charts": [],
        }

    numeric_columns, date_columns, categorical_columns = _detect_column_types(rows, columns)
    prompt = {
        "task": "Auto-detect important columns and generate insights with charts.",
        "rules": [
            "Use only the provided selected document rows.",
            "Return strict JSON, no markdown.",
            "Return exactly this shape:",
            '{'
            '"top_insight":"string",'
            '"key_insights":["string"],'
            '"charts":[{"title":"string","chart_type":"bar|line|pie","x_axis":"string","y_axis":"string|null","aggregation":"sum|count|average","data":[{"x":"string","value":number}]}]'
            '}',
            "Prefer 3 charts: one bar, one line (if date/time exists), one pie.",
            "Keep each chart data array <= 12 points.",
        ],
        "available_columns": columns,
        "detected_numeric_columns": numeric_columns,
        "detected_date_columns": date_columns,
        "detected_categorical_columns": categorical_columns,
        "rows_sample": rows[:350],
    }
    if custom_prompt and custom_prompt.strip():
        prompt["custom_prompt"] = custom_prompt.strip()
        prompt["rules"].append("Honor the custom_prompt when choosing insight focus and chart emphasis.")

    completion = await openai_client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {
                "role": "system",
                "content": "You are DocuCharts insight generator. Return strict JSON only.",
            },
            {"role": "user", "content": json.dumps(prompt)},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )

    raw = completion.choices[0].message.content or "{}"
    parsed: dict[str, Any]
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        parsed = {}

    normalized = _normalize_insights_payload(parsed)
    if normalized:
        return normalized

    return _build_fallback_insights(rows, columns)


def _build_pivot_cells(
    rows: list[dict[str, Any]],
    row_field: str,
    column_field: str,
    value_field: str | None,
    aggregation: str,
) -> dict[str, Any]:
    buckets: dict[tuple[str, str], dict[str, float]] = defaultdict(
        lambda: {"count": 0, "sum": 0, "numeric_count": 0}
    )
    row_keys: set[str] = set()
    column_keys: set[str] = set()

    for row in rows:
        row_key = str(row.get(row_field, "Unknown"))
        column_key = str(row.get(column_field, "Unknown"))
        row_keys.add(row_key)
        column_keys.add(column_key)

        bucket = buckets[(row_key, column_key)]
        bucket["count"] += 1
        if value_field:
            numeric = _to_number(row.get(value_field))
            if numeric is not None:
                bucket["sum"] += numeric
                bucket["numeric_count"] += 1

    cells = []
    for (row_key, column_key), bucket in buckets.items():
        if aggregation == "count":
            value = bucket["count"]
        elif aggregation == "average":
            value = bucket["sum"] / bucket["numeric_count"] if bucket["numeric_count"] else 0
        else:
            value = bucket["sum"]
        cells.append({"row_key": row_key, "column_key": column_key, "value": round(float(value), 2)})

    return {
        "row_keys": sorted(row_keys),
        "column_keys": sorted(column_keys),
        "cells": cells,
    }


def _normalize_pivot_payload(payload: dict[str, Any]) -> dict[str, Any] | None:
    required = ["title", "row_field", "column_field", "aggregation", "row_keys", "column_keys", "cells"]
    if any(key not in payload for key in required):
        return None

    aggregation = str(payload.get("aggregation", "count")).lower()
    if aggregation not in {"sum", "count", "average"}:
        aggregation = "count"

    row_keys_raw = payload.get("row_keys")
    column_keys_raw = payload.get("column_keys")
    cells_raw = payload.get("cells")
    if not isinstance(row_keys_raw, list) or not isinstance(column_keys_raw, list) or not isinstance(cells_raw, list):
        return None

    row_keys = [str(item) for item in row_keys_raw]
    column_keys = [str(item) for item in column_keys_raw]
    cells = []
    for cell in cells_raw:
        if not isinstance(cell, dict):
            continue
        row_key = str(cell.get("row_key", "Unknown"))
        column_key = str(cell.get("column_key", "Unknown"))
        value = _to_number(cell.get("value")) or 0
        cells.append({"row_key": row_key, "column_key": column_key, "value": round(value, 2)})

    if not row_keys or not column_keys or not cells:
        return None

    return {
        "title": str(payload.get("title") or "AI Pivot Table"),
        "row_field": str(payload.get("row_field")),
        "column_field": str(payload.get("column_field")),
        "value_field": str(payload.get("value_field")) if payload.get("value_field") else None,
        "aggregation": aggregation,
        "row_keys": row_keys,
        "column_keys": column_keys,
        "cells": cells,
    }


async def generate_ai_pivot_table(
    user_id: str,
    document_ids: list[str],
    custom_prompt: str,
) -> dict[str, Any]:
    merged = await get_merged_document_data(user_id, document_ids)
    rows = merged.get("rows", [])
    columns = merged.get("columns", [])

    if not rows:
        return {
            "title": "No data available for selected documents",
            "row_field": "",
            "column_field": "",
            "value_field": None,
            "aggregation": "count",
            "row_keys": [],
            "column_keys": [],
            "cells": [],
        }

    numeric_columns, _, categorical_columns = _detect_column_types(rows, columns)
    prompt = {
        "task": "Create a pivot table from selected document rows based on user prompt.",
        "custom_prompt": custom_prompt,
        "rules": [
            "Use only provided rows.",
            "Pick row_field and column_field from available columns.",
            "Choose aggregation from sum|count|average.",
            "If aggregation is sum or average, set value_field to a numeric column.",
            "Return strict JSON only with shape:",
            '{'
            '"title":"string","row_field":"string","column_field":"string","value_field":"string|null",'
            '"aggregation":"sum|count|average","row_keys":["string"],"column_keys":["string"],'
            '"cells":[{"row_key":"string","column_key":"string","value":number}]'
            '}',
            "Limit row_keys and column_keys to 20 each.",
        ],
        "available_columns": columns,
        "numeric_columns": numeric_columns,
        "categorical_columns": categorical_columns,
        "rows_sample": rows[:400],
    }

    completion = await openai_client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {
                "role": "system",
                "content": "You generate pivot-table JSON for DocuCharts. Return strict JSON only.",
            },
            {"role": "user", "content": json.dumps(prompt)},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )

    raw = completion.choices[0].message.content or "{}"
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        parsed = {}

    normalized = _normalize_pivot_payload(parsed)
    if normalized:
        return normalized

    row_field = categorical_columns[0] if categorical_columns else columns[0]
    column_field = categorical_columns[1] if len(categorical_columns) > 1 else "_document"
    aggregation = "sum" if numeric_columns else "count"
    value_field = numeric_columns[0] if numeric_columns else None
    built = _build_pivot_cells(rows, row_field, column_field, value_field, aggregation)
    return {
        "title": f"{aggregation.title()} pivot of {value_field or 'records'} by {row_field} x {column_field}",
        "row_field": row_field,
        "column_field": column_field,
        "value_field": value_field,
        "aggregation": aggregation,
        **built,
    }
