import apiClient from "./client";

export async function askChatbot(question, documentIds) {
  const { data } = await apiClient.post("/chat/query", {
    question,
    document_ids: documentIds,
  });
  return data;
}

export async function fetchChatHistory() {
  const { data } = await apiClient.get("/chat/history");
  return data;
}
