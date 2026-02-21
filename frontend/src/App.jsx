import { Route, Routes, Navigate } from "react-router-dom";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./Components/Layout/Layout";
import ProtectedRoute from "./Components/ProtectedRoute/ProtectedRoute";
import Home from "./Pages/Home";
import Login from "./Pages/Login";
import Register from "./Pages/Register";
import Scan from "./Pages/Scan";
import Loading from "./Pages/Loading";
import Results from "./Pages/Results";
import Report from "./Pages/Report";
import Dashboard from "./Pages/Dashboard";
import History from "./Pages/History";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="scan" element={<Scan />} />
          <Route path="loading" element={<Loading />} />
          <Route path="results" element={<Results />} />
          <Route path="report" element={<Navigate to="/" replace />} />
          <Route path="report/:scanId" element={<Report />} />
          <Route
            path="history"
            element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
