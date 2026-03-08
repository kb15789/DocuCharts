import { useEffect, useMemo, useState } from "react";

import { fetchDocumentData, fetchDocuments, joinDocumentData } from "../api/documents";
import DataTable from "../components/DataTable";
import { DOCUMENTS_UPDATED_EVENT } from "../utils/documentsEvents";

export default function DataExplorerPage() {
  const [documents, setDocuments] = useState([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState([]);
  const [tableMode, setTableMode] = useState("combined");
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);

  const [leftDocumentId, setLeftDocumentId] = useState("");
  const [rightDocumentId, setRightDocumentId] = useState("");
  const [leftColumn, setLeftColumn] = useState("");
  const [rightColumn, setRightColumn] = useState("");
  const [joinType, setJoinType] = useState("inner");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");

  const [columnOptionsByDocumentId, setColumnOptionsByDocumentId] = useState({});

  useEffect(() => {
    async function loadDocuments() {
      const docs = await fetchDocuments();
      setDocuments(docs);
      setSelectedDocumentIds((prev) => {
        const valid = prev.filter((id) => docs.some((doc) => doc.id === id));
        if (valid.length) return valid;
        return docs.length ? [docs[0].id] : [];
      });
    }

    function handleDocumentsUpdated() {
      loadDocuments().catch(() => setDocuments([]));
    }

    loadDocuments().catch(() => setDocuments([]));
    window.addEventListener(DOCUMENTS_UPDATED_EVENT, handleDocumentsUpdated);
    return () => window.removeEventListener(DOCUMENTS_UPDATED_EVENT, handleDocumentsUpdated);
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!selectedDocumentIds.length) {
        setRows([]);
        setColumns([]);
        return;
      }

      const data = await fetchDocumentData(selectedDocumentIds);
      setRows(data.rows || []);
      setColumns(data.columns || []);
    }

    if (tableMode === "combined") {
      loadData().catch(() => {
        setRows([]);
        setColumns([]);
      });
    }
  }, [selectedDocumentIds, tableMode]);

  useEffect(() => {
    const selectedSet = new Set(selectedDocumentIds);
    setLeftDocumentId((prev) => {
      if (prev && selectedSet.has(prev)) return prev;
      return selectedDocumentIds[0] || "";
    });
    setRightDocumentId((prev) => {
      if (prev && selectedSet.has(prev) && prev !== (selectedDocumentIds[0] || "")) return prev;
      return selectedDocumentIds.find((id) => id !== (selectedDocumentIds[0] || "")) || "";
    });
  }, [selectedDocumentIds]);

  useEffect(() => {
    async function loadColumnsForDocument(documentId) {
      if (!documentId) return;
      if (columnOptionsByDocumentId[documentId]) return;
      const data = await fetchDocumentData([documentId]);
      const columnOptions = (data.columns || []).filter((col) => col !== "_document");
      setColumnOptionsByDocumentId((prev) => ({
        ...prev,
        [documentId]: columnOptions,
      }));
    }

    loadColumnsForDocument(leftDocumentId).catch(() => undefined);
    loadColumnsForDocument(rightDocumentId).catch(() => undefined);
  }, [leftDocumentId, rightDocumentId, columnOptionsByDocumentId]);

  useEffect(() => {
    const leftOptions = columnOptionsByDocumentId[leftDocumentId] || [];
    const rightOptions = columnOptionsByDocumentId[rightDocumentId] || [];

    setLeftColumn((prev) => (prev && leftOptions.includes(prev) ? prev : leftOptions[0] || ""));
    setRightColumn((prev) => (prev && rightOptions.includes(prev) ? prev : rightOptions[0] || ""));
  }, [leftDocumentId, rightDocumentId, columnOptionsByDocumentId]);

  const selectableDocs = useMemo(
    () => documents.filter((doc) => selectedDocumentIds.includes(doc.id)),
    [documents, selectedDocumentIds]
  );

  async function onCreateJoin() {
    setJoinError("");
    if (!leftDocumentId || !rightDocumentId) {
      setJoinError("Select two documents to join.");
      return;
    }
    if (!leftColumn || !rightColumn) {
      setJoinError("Select join columns for both documents.");
      return;
    }

    try {
      setJoinLoading(true);
      const joined = await joinDocumentData({
        left_document_id: leftDocumentId,
        right_document_id: rightDocumentId,
        left_column: leftColumn,
        right_column: rightColumn,
        join_type: joinType,
      });
      setRows(joined.rows || []);
      setColumns(joined.columns || []);
      setTableMode("joined");
    } catch (error) {
      setJoinError(error?.response?.data?.detail ?? "Unable to create joined table.");
    } finally {
      setJoinLoading(false);
    }
  }

  return (
    <div className="grid-layout">
      <section className="card">
        <h3>Document Catalogue</h3>
        <p className="table-note">Multi-select documents, then configure how two selected tables should be joined.</p>
        <table className="data-table">
          <thead>
            <tr>
              <th>Select</th>
              <th>Document</th>
              <th>Type</th>
              <th>Status</th>
              <th>Rows</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedDocumentIds.includes(doc.id)}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setSelectedDocumentIds((prev) =>
                        checked ? [...new Set([...prev, doc.id])] : prev.filter((id) => id !== doc.id)
                      );
                    }}
                  />
                </td>
                <td>{doc.name}</td>
                <td>{doc.file_type || "-"}</td>
                <td>{doc.parse_status || "-"}</td>
                <td>{doc.row_count ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h3>Join Builder</h3>
        <p className="table-note">Pick two selected documents, choose join columns, and generate the joined table.</p>
        <div className="chart-controls">
          <label>
            Left Table
            <select value={leftDocumentId} onChange={(event) => setLeftDocumentId(event.target.value)}>
              <option value="">Select left table</option>
              {selectableDocs.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Left Join Column
            <select value={leftColumn} onChange={(event) => setLeftColumn(event.target.value)}>
              <option value="">Select column</option>
              {(columnOptionsByDocumentId[leftDocumentId] || []).map((column) => (
                <option key={`left-${column}`} value={column}>
                  {column}
                </option>
              ))}
            </select>
          </label>

          <label>
            Join Type
            <select value={joinType} onChange={(event) => setJoinType(event.target.value)}>
              <option value="inner">Inner Join</option>
              <option value="left">Left Join</option>
              <option value="right">Right Join</option>
              <option value="full">Full Join</option>
            </select>
          </label>

          <label>
            Right Table
            <select value={rightDocumentId} onChange={(event) => setRightDocumentId(event.target.value)}>
              <option value="">Select right table</option>
              {selectableDocs.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Right Join Column
            <select value={rightColumn} onChange={(event) => setRightColumn(event.target.value)}>
              <option value="">Select column</option>
              {(columnOptionsByDocumentId[rightDocumentId] || []).map((column) => (
                <option key={`right-${column}`} value={column}>
                  {column}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="table-actions">
          <button type="button" className="primary-btn" onClick={onCreateJoin} disabled={joinLoading}>
            {joinLoading ? "Creating..." : "Create Joined Table"}
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => setTableMode("combined")}
            disabled={tableMode === "combined"}
          >
            Show Combined View
          </button>
        </div>
        {joinError ? <p className="error-text">{joinError}</p> : null}
      </section>

      <DataTable rows={rows} columns={columns} />
    </div>
  );
}
