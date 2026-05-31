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
  children
}: {
  route: Route;
  source: DataSource;
  error?: string;
  children: ReactNode;
}) {
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
          <div>
            <strong>{source === "api" ? "API connected" : "Mock data"}</strong>
            <span>{error ? `Fallback: ${error}` : "Ready"}</span>
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
