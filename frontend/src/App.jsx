import { Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import ChatbotPage from "./pages/ChatbotPage";
import DataExplorerPage from "./pages/DataExplorerPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import UploadPage from "./pages/UploadPage";
import VisualizationsPage from "./pages/VisualizationsPage";

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/upload" replace />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="explorer" element={<DataExplorerPage />} />
        <Route path="visualizations" element={<VisualizationsPage />} />
        <Route
          path="chatbot"
          element={
            user?.chat_assistant_enabled ? (
              <ChatbotPage />
            ) : (
              <Navigate to="/upload" replace />
            )
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/upload" replace />} />
    </Routes>
  );
}
