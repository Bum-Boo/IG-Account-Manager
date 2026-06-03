import { Layout } from "./components/Layout.js";
import { ErrorState, LoadingState } from "./components/StateBlock.js";
import { useHashRoute } from "./hooks/useHashRoute.js";
import { useWorkspaceData } from "./hooks/useWorkspaceData.js";
import { AccountDetailPage } from "./pages/AccountDetailPage.js";
import { AccountsPage } from "./pages/AccountsPage.js";
import { AssetsPage } from "./pages/AssetsPage.js";
import { CalendarPage } from "./pages/CalendarPage.js";
import { CandidatesPage } from "./pages/CandidatesPage.js";
import { ConceptEditorPage } from "./pages/ConceptEditorPage.js";
import { ConceptsPage } from "./pages/ConceptsPage.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { PluginsPage } from "./pages/PluginsPage.js";
import { PublishJobsPage } from "./pages/PublishJobsPage.js";
import { SettingsPage } from "./pages/SettingsPage.js";

export function App() {
  const route = useHashRoute();
  const workspace = useWorkspaceData();

  if (workspace.loading || !workspace.data) {
    return (
      <Layout route={route} source={workspace.source} error={workspace.error}>
        <LoadingState />
      </Layout>
    );
  }

  return (
    <Layout route={route} source={workspace.source} error={workspace.error}>
      {workspace.error && workspace.source === "api" ? <ErrorState message={workspace.error} /> : null}
      {renderRoute(route, workspace)}
    </Layout>
  );
}

function renderRoute(route: ReturnType<typeof useHashRoute>, workspace: ReturnType<typeof useWorkspaceData>) {
  const data = workspace.data!;

  switch (route.name) {
    case "accounts":
      return (
        <AccountsPage
          data={data}
          onConnectInstagram={workspace.connectInstagram}
          onLoadInstagramConnection={workspace.loadInstagramConnection}
          onRefreshInstagramConnection={workspace.refreshInstagramConnection}
          onSelectInstagramAccount={workspace.selectInstagramAccount}
          source={workspace.source}
        />
      );
    case "account":
      return (
        <AccountDetailPage
          accountId={route.id}
          data={data}
          onConnectInstagram={workspace.connectInstagram}
          onDisconnectInstagram={workspace.disconnectInstagram}
          onLoadInstagramConnection={workspace.loadInstagramConnection}
          onRefreshInstagramConnection={workspace.refreshInstagramConnection}
          onSelectInstagramAccount={workspace.selectInstagramAccount}
          source={workspace.source}
        />
      );
    case "concepts":
      return <ConceptsPage data={data} />;
    case "concept":
      return <ConceptEditorPage conceptId={route.id} data={data} onSave={workspace.updateConcept} />;
    case "assets":
      return <AssetsPage data={data} />;
    case "candidates":
    case "candidate":
      return (
        <CandidatesPage
          data={data}
          selectedCandidateId={route.name === "candidate" ? route.id : undefined}
          onApprove={workspace.approveCandidate}
          onGenerateCandidate={workspace.generateCandidate}
          onReject={workspace.rejectCandidate}
          onRequestRegeneration={workspace.requestRegeneration}
          onSchedule={workspace.scheduleCandidate}
          onRetryJob={workspace.retryPublishJob}
        />
      );
    case "calendar":
      return <CalendarPage data={data} />;
    case "jobs":
      return <PublishJobsPage data={data} onRetry={workspace.retryPublishJob} />;
    case "plugins":
      return <PluginsPage data={data} onToggle={workspace.setPluginEnabled} />;
    case "settings":
      return (
        <SettingsPage
          apiBaseUrl={workspace.apiBaseUrl}
          apiToken={workspace.apiToken}
          onReload={workspace.reload}
          onSave={workspace.updateSettings}
          source={workspace.source}
        />
      );
    case "dashboard":
    default:
      return <DashboardPage data={data} />;
  }
}
