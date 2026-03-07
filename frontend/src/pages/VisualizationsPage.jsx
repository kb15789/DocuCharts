import { useEffect, useMemo, useState } from "react";

import { fetchDocumentData, fetchDocuments } from "../api/documents";
import ChartBuilder from "../components/ChartBuilder";
import { DOCUMENTS_UPDATED_EVENT } from "../utils/documentsEvents";

function isNumericColumn(rows, key) {
  return rows.length > 0 && rows.some((row) => Number.isFinite(Number(row[key])));
}

export default function VisualizationsPage() {
  const [documents, setDocuments] = useState([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState([]);
  const [dataset, setDataset] = useState([]);
  const [columns, setColumns] = useState([]);

  const [chartType, setChartType] = useState("bar");
  const [xAxis, setXAxis] = useState("");
  const [yAxis, setYAxis] = useState("");

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
        setDataset([]);
        setColumns([]);
        setXAxis("");
        setYAxis("");
        return;
      }

      const data = await fetchDocumentData(selectedDocumentIds);
      const rows = data.rows || [];
      const keys = data.columns || [];
      setDataset(rows);
      setColumns(keys);

      if (keys.length) {
        setXAxis(keys[0]);
        const numeric = keys.find((key) => isNumericColumn(rows, key));
        setYAxis(numeric || keys[Math.min(1, keys.length - 1)]);
      }
    }

    loadData().catch(() => {
      setDataset([]);
      setColumns([]);
    });
  }, [selectedDocumentIds]);

  const normalizedData = useMemo(
    () =>
      dataset.map((row) => {
        const copy = { ...row };
        if (yAxis) {
          const numeric = Number(copy[yAxis]);
          copy[yAxis] = Number.isFinite(numeric) ? numeric : 0;
        }
        return copy;
      }),
    [dataset, yAxis]
  );

  return (
    <div className="grid-layout">
      <section className="card">
        <h3>Select Documents</h3>
        <p className="table-note">Choose uploaded documents before building charts.</p>
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

      {columns.length > 0 ? (
        <ChartBuilder
          dataset={normalizedData}
          chartType={chartType}
          onChartTypeChange={setChartType}
          xAxis={xAxis}
          yAxis={yAxis}
          onAxisChange={(axis, value) => {
            if (axis === "x") setXAxis(value);
            if (axis === "y") setYAxis(value);
          }}
        />
      ) : (
        <section className="card">
          <p className="table-note">No chartable dataset found for selected documents.</p>
        </section>
      )}
    </div>
  );
}
