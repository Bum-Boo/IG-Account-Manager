export type Route =
  | { name: "dashboard" }
  | { name: "accounts" }
  | { name: "account"; id: string }
  | { name: "concepts" }
  | { name: "concept"; id: string }
  | { name: "assets" }
  | { name: "candidates" }
  | { name: "candidate"; id: string }
  | { name: "calendar" }
  | { name: "jobs" }
  | { name: "plugins" }
  | { name: "settings" };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, "") || "/";
  const parts = path.split("/").filter(Boolean);

  if (parts[0] === "accounts" && parts[1]) return { name: "account", id: parts[1] };
  if (parts[0] === "accounts") return { name: "accounts" };
  if (parts[0] === "concepts" && parts[1]) return { name: "concept", id: parts[1] };
  if (parts[0] === "concepts") return { name: "concepts" };
  if (parts[0] === "assets") return { name: "assets" };
  if (parts[0] === "candidates" && parts[1]) return { name: "candidate", id: parts[1] };
  if (parts[0] === "candidates") return { name: "candidates" };
  if (parts[0] === "calendar") return { name: "calendar" };
  if (parts[0] === "jobs") return { name: "jobs" };
  if (parts[0] === "plugins") return { name: "plugins" };
  if (parts[0] === "settings") return { name: "settings" };

  return { name: "dashboard" };
}

export function routeHref(path: string): string {
  return `#${path}`;
}

export function isRouteActive(route: Route, path: string): boolean {
  if (path === "/") return route.name === "dashboard";
  if (path === "/accounts") return route.name === "accounts" || route.name === "account";
  if (path === "/concepts") return route.name === "concepts" || route.name === "concept";
  if (path === "/assets") return route.name === "assets";
  if (path === "/candidates") return route.name === "candidates" || route.name === "candidate";
  if (path === "/calendar") return route.name === "calendar";
  if (path === "/jobs") return route.name === "jobs";
  if (path === "/plugins") return route.name === "plugins";
  if (path === "/settings") return route.name === "settings";
  return false;
}
