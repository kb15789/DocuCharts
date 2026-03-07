import { useEffect, useState } from "react";

import { askChatbot, fetchChatHistory } from "../api/chat";

export default function ChatPanel({ selectedDocumentIds }) {
  const [history, setHistory] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [currentResponse, setCurrentResponse] = useState(null);

  async function loadHistory() {
    try {
      const data = await fetchChatHistory();
      setHistory(data);
    } catch {
      setHistory([]);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function submitQuestion(event) {
    event.preventDefault();
    const cleanQuestion = question.trim();
    if (!cleanQuestion || !selectedDocumentIds.length) return;

    setLoading(true);
    try {
      const response = await askChatbot(cleanQuestion, selectedDocumentIds);

      // Show fresh answer immediately in the current response area.
      setCurrentResponse({
        question: cleanQuestion,
        answer: response.answer,
      });

      setQuestion("");

      // Then refresh persisted chat history from backend.
      await loadHistory();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-layout card">
      <div className="chat-history-header">
        <h3>Chat Assistant</h3>
        <button type="button" className="ghost-btn" onClick={() => setShowHistory((prev) => !prev)}>
          {showHistory ? "Hide History" : "Show History"}
        </button>
      </div>

      {currentResponse && (
        <div className="chat-item current-response">
          <p className="chat-q">Current Question: {currentResponse.question}</p>
          <p className="chat-a">Current Response: {currentResponse.answer}</p>
        </div>
      )}

      {showHistory && (
        <div className="chat-history">
          {history.map((item) => (
            <div key={item.id} className="chat-item">
              <p className="chat-q">You: {item.question}</p>
              <p className="chat-a">AI: {item.answer}</p>
            </div>
          ))}
          {!history.length && <p className="table-note">No previous chats yet.</p>}
        </div>
      )}

      <form className="chat-form" onSubmit={submitQuestion}>
        <input
          className="input"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask AI about your selected uploaded documents..."
          disabled={!selectedDocumentIds.length}
        />
        <button className="primary-btn" type="submit" disabled={loading || !selectedDocumentIds.length}>
          {loading ? "Thinking..." : "Send"}
        </button>
      </form>

      {!selectedDocumentIds.length && (
        <p className="table-note">Select at least one document to enable chat.</p>
      )}
    </div>
  );
}
