/**
 * ScamShield Desktop — App Root
 *
 * Routes to the appropriate page based on the current AppView state.
 */
import { useEffect } from "react";
import { useApp, AppProvider } from "./store/app";
import { useAuth, AuthProvider } from "./store/auth";
import Navbar from "./components/Navbar";
import HomePage from "./pages/Home";
import ScanPage from "./pages/Scan";
import ResultsPage from "./pages/Results";
import HistoryPage from "./pages/History";
import LoginPage from "./pages/Login";
import SettingsPage from "./pages/Settings";

function AppContent() {
  const { view } = useApp();
  const { checkSession } = useAuth();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const renderPage = () => {
    switch (view.kind) {
      case "home":
        return <HomePage />;
      case "scan":
        return <ScanPage />;
      case "results":
        return <ResultsPage id={view.id} />;
      case "history":
        return <HistoryPage />;
      case "login":
        return <LoginPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6">
        {renderPage()}
      </main>
      <footer className="py-6 text-center text-xs text-gray-400 dark:text-gray-600">
        ScamShield Desktop v1.0.0 · by Lunik · Powered by AI · Client-only · See{" "}
        <a href="https://scamshield.app" className="hover:underline">
          scamshield.app
        </a>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}
