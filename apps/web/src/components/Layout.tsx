import type { ReactNode } from "react";
import type { DataSource } from "../types.js";
import { isRouteActive, routeHref, type Route } from "../router.js";

const navigation = [
  { path: "/", label: "Overview" },
  { path: "/accounts", label: "Accounts" },
  { path: "/concepts", label: "Concepts" },
  { path: "/assets", label: "Assets" },
  { path: "/candidates", label: "Candidates" },
  { path: "/calendar", label: "Calendar" },
  { path: "/jobs", label: "Jobs" },
  { path: "/plugins", label: "Plugins" },
  { path: "/settings", label: "Settings" }
];

export function Layout({
  route,
  source,
  error,
  refreshing,
  children
}: {
  route: Route;
  source?: DataSource;
  error?: string;
  refreshing?: boolean;
  children: ReactNode;
}) {
  const status = connectionStatus(source, error, refreshing);

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <a className="brand" href={routeHref("/")}>
          <span className="brand-mark">IG</span>
          <span>
            <strong>IG Manager</strong>
            <small>Local workspace</small>
          </span>
        </a>
        <nav className="nav-list" aria-label="Main navigation">
          {navigation.map((item) => (
            <a className={isRouteActive(route, item.path) ? "active" : ""} href={routeHref(item.path)} key={item.path}>
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className={`connection-status ${status.tone}`} data-testid="connection-status">
            <strong>{status.title}</strong>
            <span>{status.detail}</span>
          </div>
          <a className="utility-link" href={routeHref("/settings")}>
            Local API
          </a>
        </header>
        {children}
      </div>
    </div>
  );
}

function connectionStatus(source: DataSource | undefined, error: string | undefined, refreshing: boolean | undefined) {
  if (source === "sample") {
    return { tone: "sample", title: "Sample preview", detail: "Example data, not saved" };
  }

  if (source === "api") {
    if (error) return { tone: "warning", title: "API unreachable", detail: "Showing last loaded workspace" };
    return { tone: "ok", title: "API connected", detail: refreshing ? "Refreshing..." : "Local workspace" };
  }

  if (error) return { tone: "warning", title: "API unreachable", detail: "No workspace loaded" };
  return { tone: "ok", title: "Connecting", detail: "Loading local workspace..." };
}
