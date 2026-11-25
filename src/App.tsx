import { AppProvider, useApp } from "./context/AppContext";
import { AuthProvider } from "./context/AuthContext";
import { BrandingProvider } from "./context/BrandingContext";
import { ContentProvider } from "./context/ContentContext";
import { Sidebar } from "./components/navigation/Sidebar";
import { Topbar } from "./components/navigation/Topbar";
import { ModalLayer } from "./components/modals/ModalLayer";
import { AuthModal } from "./features/authentication/AuthModal";
import { Toast } from "./components/ui/Toast";

import { Dashboard } from "./features/dashboard/Dashboard";
import { ContentLibrary } from "./features/content-library/ContentLibrary";
import { CreateContent } from "./features/content-creation/CreateContent";
import { Courses } from "./features/courses/Courses";
import { AuthoringWorkspace } from "./features/authoring-workspace/AuthoringWorkspace";
import { QuizEditor } from "./features/quiz-editor/QuizEditor";
import { PreviewScreen } from "./features/preview/PreviewScreen";
import { ExportCenter } from "./features/export-center/ExportCenter";
import { MediaLibrary } from "./features/media-library/MediaLibrary";
import { Integrations } from "./features/lms-integrations/Integrations";
import { Analytics } from "./features/analytics/Analytics";
import { Team } from "./features/team/Team";
import { SettingsScreen } from "./features/settings/SettingsScreen";
import { DistributorHub } from "./features/distributor/DistributorHub";
import { SuperAdminConsole } from "./features/super-admin/SuperAdminConsole";
import { Help } from "./features/help/Help";

function AppShell() {
  const { route, sidebarOpen, toast, clearToast } = useApp();

  const isEditorMode = route === "editor" || route === "quiz" || route === "preview";

  if (isEditorMode) {
    return (
      <>
        {route === "editor" && <AuthoringWorkspace />}
        {route === "quiz" && <QuizEditor />}
        {route === "preview" && <PreviewScreen />}
        <ModalLayer />
        <AuthModal />
        <Toast message={toast} onClose={clearToast} />
      </>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />

      <div className={`main-column ${sidebarOpen ? "" : "expanded"}`}>
        <Topbar />
        <main className="page">
          {route === "dashboard" && <Dashboard />}
          {route === "library" && <ContentLibrary />}
          {route === "courses" && <Courses />}
          {route === "create" && <CreateContent />}
          {route === "export" && <ExportCenter />}
          {route === "media" && <MediaLibrary />}
          {route === "integrations" && <Integrations />}
          {route === "analytics" && <Analytics />}
          {route === "team" && <Team />}
          {route === "distributor" && <DistributorHub />}
          {route === "super-admin" && <SuperAdminConsole />}
          {route === "settings" && <SettingsScreen />}
          {route === "help" && <Help />}
        </main>
      </div>

      <ModalLayer />
      <AuthModal />
      <Toast message={toast} onClose={clearToast} />
    </div>
  );
}

export function App() {
  return (
    <BrandingProvider>
      <AuthProvider>
        <AppProvider>
          <ContentProvider>
            <AppShell />
          </ContentProvider>
        </AppProvider>
      </AuthProvider>
    </BrandingProvider>
  );
}

export default App;
