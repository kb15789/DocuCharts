import { useEffect, useState } from "react";

import { fetchDocumentData, fetchDocuments } from "../api/documents";
import DataTable from "../components/DataTable";
import { DOCUMENTS_UPDATED_EVENT } from "../utils/documentsEvents";

export default function DataExplorerPage() {
  const [documents, setDocuments] = useState([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState([]);
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);

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

    loadData().catch(() => {
      setRows([]);
      setColumns([]);
    });
  }, [selectedDocumentIds]);

  return (
    <div className="grid-layout">
      <section className="card">
        <h3>Select Documents</h3>
        <p className="table-note">Choose one or more uploaded documents for data exploration.</p>
        <select
          className="input"
          multiple
          value={selectedDocumentIds}
          onChange={(event) => {
            const ids = Array.from(event.target.selectedOptions).map((option) => option.value);
            setSelectedDocumentIds(ids);
          }}
        >
          {documents.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.name} ({doc.parse_status || "unknown"})
            </option>
          ))}
        </select>
      </section>

      <DataTable rows={rows} columns={columns} />
    </div>
  );
}
