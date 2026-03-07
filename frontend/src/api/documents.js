import apiClient from "./client";

export async function uploadDocuments(files) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const { data } = await apiClient.post("/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function fetchDocuments() {
  const { data } = await apiClient.get("/documents/");
  return data;
}

export async function fetchDocumentData(documentIds) {
  const { data } = await apiClient.post("/documents/data", {
    document_ids: documentIds,
  });
  return data;
}

export async function deleteDocument(documentId) {
  await apiClient.delete(`/documents/${documentId}`);
}
