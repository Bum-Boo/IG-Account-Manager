import { z } from "zod";
import { PluginPermissionError } from "./errors.js";

export const PluginPermissionSchema = z.enum([
  "workspace:read",
  "account:read",
  "account:write",
  "concept:read",
  "concept:write",
  "asset:read",
  "asset:write",
  "recipe:read",
  "recipe:write",
  "candidate:read",
  "candidate:write",
  "candidate:review",
  "source:read",
  "source:import",
  "media:generate",
  "copy:generate",
  "validator:run",
  "schedule:read",
  "schedule:write",
  "scheduler:policy",
  "publish:validate",
  "publish:approved",
  "analytics:read",
  "analytics:export",
  "ui:render",
  "settings:read",
  "settings:write",
  "audit:write"
]);

export type PluginPermission = z.infer<typeof PluginPermissionSchema>;

export const PluginPermissionSetSchema = z.array(PluginPermissionSchema).min(1);

export interface PermissionCheck {
  granted: boolean;
  missing: PluginPermission[];
}

export function checkPermissions(
  granted: readonly PluginPermission[],
  required: readonly PluginPermission[]
): PermissionCheck {
  const grantedSet = new Set(granted);
  const missing = required.filter((permission) => !grantedSet.has(permission));

  return {
    granted: missing.length === 0,
    missing
  };
}

export function requirePermissions(
  granted: readonly PluginPermission[],
  required: readonly PluginPermission[]
): void {
  const check = checkPermissions(granted, required);

  if (!check.granted) {
    throw new PluginPermissionError(
      `Missing plugin permission(s): ${check.missing.join(", ")}`,
      check.missing[0]
    );
  }
}

export function requirePermission(
  granted: readonly PluginPermission[],
  required: PluginPermission
): void {
  requirePermissions(granted, [required]);
}

