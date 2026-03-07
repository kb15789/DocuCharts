import { useEffect, useState } from "react";

import { deleteDocument, fetchDocuments, uploadDocuments } from "../api/documents";
import UploadDropzone from "../components/UploadDropzone";
import { notifyDocumentsUpdated } from "../utils/documentsEvents";

export default function UploadPage() {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function loadDocuments() {
    try {
      const data = await fetchDocuments();
      setDocuments(data);
    } catch {
      setDocuments([]);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  async function handleUpload(files) {
    setError("");
    setUploading(true);
    try {
      await uploadDocuments(files);
      await loadDocuments();
      notifyDocumentsUpdated();
    } catch (err) {
      setError(err?.response?.data?.detail ?? "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteDocument(documentId) {
    setError("");
    try {
      await deleteDocument(documentId);
      await loadDocuments();
      notifyDocumentsUpdated();
    } catch (err) {
      setError(err?.response?.data?.detail ?? "Delete failed.");
    }
  }

  return (
    <div className="grid-layout">
      <section className="card">
        <h3>Upload New Documents</h3>
        <UploadDropzone onFilesSelected={handleUpload} />
        {uploading && <p>Uploading files...</p>}
        {error && <p className="error-text">{error}</p>}
      </section>

      <section className="card">
        <h3>All Documents</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Status</th>
              <th>Rows</th>
              <th>Uploaded</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id}>
                <td>{doc.name}</td>
                <td>{doc.file_type || "-"}</td>
                <td>{doc.parse_status || "-"}</td>
                <td>{doc.row_count ?? 0}</td>
                <td>{new Date(doc.uploaded_at).toLocaleString()}</td>
                <td>
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => handleDeleteDocument(doc.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
