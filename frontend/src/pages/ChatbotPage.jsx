import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import { fetchDocuments } from "../api/documents";
import ChatPanel from "../components/ChatPanel";
import { useAuth } from "../context/AuthContext";
import { DOCUMENTS_UPDATED_EVENT } from "../utils/documentsEvents";

export default function ChatbotPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState([]);

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

  if (!user?.chat_assistant_enabled) {
    return <Navigate to="/upload" replace />;
  }

  return (
    <div className="grid-layout">
      <section className="card">
        <h3>Select Documents</h3>
        <p className="table-note">Choose uploaded documents for chat context.</p>
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

      <ChatPanel selectedDocumentIds={selectedDocumentIds} />
    </div>
  );
}
