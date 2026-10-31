import { Layout } from "./components/Layout.js";
import { LoadingState } from "./components/StateBlock.js";
import { ConnectionProblem, EmptyWorkspacePanel, SampleBanner, StaleDataNotice } from "./components/WorkspaceStatus.js";
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
  const layoutProps = { route, source: workspace.source, error: workspace.error, refreshing: workspace.refreshing };

  if (!workspace.data) {
    return (
      <Layout {...layoutProps}>
        {route.name === "settings" ? (
          renderSettings(workspace)
        ) : workspace.loading ? (
          <LoadingState />
        ) : (
          <ConnectionProblem
            error={workspace.error}
            onOpenSample={workspace.openSample}
            onRetry={workspace.reload}
            retrying={workspace.refreshing}
          />
        )}
      </Layout>
    );
  }

  return (
    <Layout {...layoutProps}>
      {workspace.source === "sample" ? <SampleBanner onConnect={workspace.reload} retrying={workspace.refreshing} /> : null}
      {workspace.error && workspace.source === "api" ? (
        <StaleDataNotice error={workspace.error} loadedAt={workspace.loadedAt} onRetry={workspace.reload} retrying={workspace.refreshing} />
      ) : null}
      {workspace.source === "api" && workspace.data.accounts.length === 0 && route.name !== "settings" ? (
        <EmptyWorkspacePanel onSeed={workspace.seedWorkspace} />
      ) : null}
      {renderRoute(route, workspace)}
    </Layout>
  );
}

function renderSettings(workspace: ReturnType<typeof useWorkspaceData>) {
  return (
    <SettingsPage
      apiBaseUrl={workspace.apiBaseUrl}
      apiToken={workspace.apiToken}
      onReload={workspace.reload}
      onSave={workspace.updateSettings}
      source={workspace.source}
    />
  );
}

function renderRoute(route: ReturnType<typeof useHashRoute>, workspace: ReturnType<typeof useWorkspaceData>) {
  const data = workspace.data!;

  switch (route.name) {
    case "accounts":
      return <AccountsPage data={data} />;
    case "account":
      return <AccountDetailPage accountId={route.id} data={data} />;
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
          refreshing={workspace.refreshing}
          onCreate={workspace.createCandidate}
          onApprove={workspace.approveCandidate}
          onReject={workspace.rejectCandidate}
          onRequestRegeneration={workspace.requestRegeneration}
          onSchedule={workspace.scheduleCandidate}
          onRunJob={workspace.requestPublishJobRun}
          onRefresh={workspace.reload}
        />
      );
    case "calendar":
      return <CalendarPage data={data} />;
    case "jobs":
      return (
        <PublishJobsPage data={data} onRefresh={workspace.reload} onRunJob={workspace.requestPublishJobRun} refreshing={workspace.refreshing} />
      );
    case "plugins":
      return <PluginsPage data={data} onToggle={workspace.setPluginEnabled} />;
    case "settings":
      return renderSettings(workspace);
    case "dashboard":
    default:
      return <DashboardPage data={data} />;
  }
}
