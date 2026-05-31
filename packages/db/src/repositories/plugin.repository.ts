import { and, asc, eq } from "drizzle-orm";
import type { Permission, PluginRegistration, PluginType } from "@ig-manager/domain";
import type { IgManagerDatabase } from "../database.js";
import { pluginPermissions, plugins } from "../schema.js";
import { fromPluginRow, toPluginRow } from "../mappers.js";

export class PluginRepository {
  constructor(private readonly db: IgManagerDatabase) {}

  create(plugin: PluginRegistration): PluginRegistration {
    this.db.transaction((tx) => {
      tx.insert(plugins).values(toPluginRow(plugin)).run();
      insertPermissions(tx, plugin.id, plugin.permissions, plugin.createdAt);
    });

    return plugin;
  }

  getById(id: string): PluginRegistration | undefined {
    const row = this.db.select().from(plugins).where(eq(plugins.id, id)).get();
    return row ? fromPluginRow(row, this.getPermissions(id)) : undefined;
  }

  list(): PluginRegistration[] {
    const rows = this.db.select().from(plugins).orderBy(asc(plugins.name)).all();
    return rows.map((row) => fromPluginRow(row, this.getPermissions(row.id)));
  }

  getEnabledByType(type: PluginType): PluginRegistration[] {
    const rows = this.db
      .select()
      .from(plugins)
      .where(and(eq(plugins.enabled, true), eq(plugins.type, type)))
      .orderBy(asc(plugins.name))
      .all();

    return rows.map((row) => fromPluginRow(row, this.getPermissions(row.id)));
  }

  update(plugin: PluginRegistration): PluginRegistration {
    this.db.transaction((tx) => {
      tx.update(plugins).set(toPluginRow(plugin)).where(eq(plugins.id, plugin.id)).run();
      tx.delete(pluginPermissions).where(eq(pluginPermissions.pluginRegistrationId, plugin.id)).run();
      insertPermissions(tx, plugin.id, plugin.permissions, plugin.updatedAt);
    });

    return plugin;
  }

  delete(id: string): void {
    this.db.delete(plugins).where(eq(plugins.id, id)).run();
  }

  private getPermissions(pluginRegistrationId: string): Permission[] {
    return this.db
      .select({ permission: pluginPermissions.permission })
      .from(pluginPermissions)
      .where(eq(pluginPermissions.pluginRegistrationId, pluginRegistrationId))
      .all()
      .map((row) => row.permission);
  }
}

type Transaction = Parameters<Parameters<IgManagerDatabase["transaction"]>[0]>[0];

function insertPermissions(
  db: Transaction,
  pluginRegistrationId: string,
  permissions: Permission[],
  createdAt: string
): void {
  const uniquePermissions = [...new Set(permissions)];

  if (uniquePermissions.length === 0) {
    return;
  }

  db.insert(pluginPermissions)
    .values(
      uniquePermissions.map((permission) => ({
        pluginRegistrationId,
        permission,
        createdAt
      }))
    )
    .run();
}
