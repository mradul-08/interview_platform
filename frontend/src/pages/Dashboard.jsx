import { Navigate } from "react-router-dom";
import { logoutEverywhere } from "../utils/auth";

function Dashboard() {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="p-10">
      <h1 className="text-4xl font-bold">
        Dashboard 🚀
      </h1>

      <p>Welcome to Interview Platform.</p>

      <button
        onClick={logoutEverywhere}
      >
        Logout
      </button>
    </div>
  );
}

export default Dashboard;
