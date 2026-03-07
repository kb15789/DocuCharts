import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function DataTable({ rows, columns: explicitColumns }) {
  const [sorting, setSorting] = useState([]);
  const [activeFilterColumns, setActiveFilterColumns] = useState([]);
  const [columnFilters, setColumnFilters] = useState({});

  const baseColumns = useMemo(() => {
    if (explicitColumns?.length) {
      return explicitColumns;
    }
    return Object.keys(rows?.[0] || {});
  }, [rows, explicitColumns]);

  const [visibleColumns, setVisibleColumns] = useState(baseColumns);
  const [columnOrder, setColumnOrder] = useState(baseColumns);
  const [columnToAdd, setColumnToAdd] = useState("");

  useEffect(() => {
    setVisibleColumns((prev) => {
      const kept = prev.filter((col) => baseColumns.includes(col));
      if (kept.length) return kept;
      return baseColumns;
    });

    setColumnOrder((prev) => {
      const kept = prev.filter((col) => baseColumns.includes(col));
      const missing = baseColumns.filter((col) => !kept.includes(col));
      return [...kept, ...missing];
    });

    setActiveFilterColumns((prev) => prev.filter((col) => baseColumns.includes(col)));
    setColumnFilters((prev) => {
      const next = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (baseColumns.includes(key)) {
          next[key] = value;
        }
      });
      return next;
    });
  }, [baseColumns]);

  const orderedVisibleColumns = useMemo(
    () => columnOrder.filter((col) => visibleColumns.includes(col)),
    [columnOrder, visibleColumns]
  );

  const hiddenColumns = useMemo(
    () => baseColumns.filter((col) => !visibleColumns.includes(col)),
    [baseColumns, visibleColumns]
  );

  useEffect(() => {
    setColumnToAdd(hiddenColumns[0] || "");
  }, [hiddenColumns]);

  const filteredRows = useMemo(() => {
    return (rows || []).filter((row) =>
      activeFilterColumns.every((col) => {
        const selected = columnFilters[col];
        if (!selected || selected === "__all__") return true;
        return String(row[col] ?? "") === selected;
      })
    );
  }, [rows, activeFilterColumns, columnFilters]);

  const valueOptionsByColumn = useMemo(() => {
    const map = {};
    for (const col of baseColumns) {
      const unique = Array.from(new Set((rows || []).map((row) => String(row[col] ?? ""))));
      map[col] = unique.sort((a, b) => a.localeCompare(b));
    }
    return map;
  }, [rows, baseColumns]);

  const tableColumns = useMemo(
    () =>
      orderedVisibleColumns.map((key) => ({
        accessorKey: key,
        header: key,
      })),
    [orderedVisibleColumns]
  );

  const table = useReactTable({
    data: filteredRows,
    columns: tableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  function handleAddColumn() {
    if (!columnToAdd || visibleColumns.includes(columnToAdd)) return;
    setVisibleColumns((prev) => [...prev, columnToAdd]);
  }

  function handleRemoveColumn(column) {
    if (visibleColumns.length <= 1) return;
    setVisibleColumns((prev) => prev.filter((col) => col !== column));
  }

  function handleDropColumnToFilter(event) {
    event.preventDefault();
    const columnId = event.dataTransfer.getData("columnId");
    if (!columnId || activeFilterColumns.includes(columnId) || !baseColumns.includes(columnId)) {
      return;
    }
    setActiveFilterColumns((prev) => [...prev, columnId]);
    setColumnFilters((prev) => ({ ...prev, [columnId]: "__all__" }));
  }

  return (
    <div className="card">
      <div
        className="filter-dropzone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDropColumnToFilter}
      >
        <strong>Drop a column header here to add a filter</strong>
        <div className="active-filters">
          {activeFilterColumns.map((col) => (
            <label key={col} className="filter-pill">
              <span>{col}</span>
              <select
                value={columnFilters[col] || "__all__"}
                onChange={(event) => {
                  const value = event.target.value;
                  setColumnFilters((prev) => ({ ...prev, [col]: value }));
                }}
              >
                <option value="__all__">All</option>
                {(valueOptionsByColumn[col] || []).map((option) => (
                  <option key={`${col}-${option}`} value={option}>
                    {option || "(empty)"}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="icon-btn"
                onClick={() => {
                  setActiveFilterColumns((prev) => prev.filter((item) => item !== col));
                  setColumnFilters((prev) => {
                    const next = { ...prev };
                    delete next[col];
                    return next;
                  });
                }}
                aria-label={`Remove ${col} filter`}
              >
                <X size={12} />
              </button>
            </label>
          ))}
        </div>
      </div>

      <div className="column-toolbar">
        <div>
          <strong>Visible Columns</strong>
          <div className="active-columns">
            {orderedVisibleColumns.map((column) => (
              <span key={column} className="column-pill">
                {column}
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => handleRemoveColumn(column)}
                  disabled={visibleColumns.length <= 1}
                  aria-label={`Remove ${column}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="add-column-controls">
          <strong>Add Column</strong>
          <div className="add-column-inline">
            <select
              value={columnToAdd}
              onChange={(event) => setColumnToAdd(event.target.value)}
              disabled={!hiddenColumns.length}
            >
              {!hiddenColumns.length ? (
                <option value="">No hidden columns</option>
              ) : (
                hiddenColumns.map((column) => (
                  <option key={column} value={column}>
                    {column}
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              className="ghost-btn"
              onClick={handleAddColumn}
              disabled={!hiddenColumns.length || !columnToAdd}
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <table className="data-table">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("columnId", header.column.id);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    const draggedId = event.dataTransfer.getData("columnId");
                    const targetId = header.column.id;
                    const newOrder = [...columnOrder];
                    const from = newOrder.indexOf(draggedId);
                    const to = newOrder.indexOf(targetId);
                    if (from < 0 || to < 0 || from === to) return;
                    newOrder.splice(to, 0, newOrder.splice(from, 1)[0]);
                    setColumnOrder(newOrder);
                  }}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>

        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {!rows?.length && <p className="table-note">No rows available for selected documents.</p>}
    </div>
  );
}
