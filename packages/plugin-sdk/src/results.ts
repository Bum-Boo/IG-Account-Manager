export type DryRunMode = "validate_only" | "preview" | "no_write";

export interface DryRunOptions {
  enabled: boolean;
  mode: DryRunMode;
  persist?: false;
}

export interface PluginWarning {
  code: string;
  message: string;
  path?: string;
}

export interface PluginExecutionErrorInfo {
  code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export type PluginExecutionResult<TData> =
  | {
      ok: true;
      data: TData;
      dryRun: boolean;
      warnings: PluginWarning[];
      audit?: Record<string, unknown>;
    }
  | {
      ok: false;
      error: PluginExecutionErrorInfo;
      dryRun: boolean;
      warnings: PluginWarning[];
      audit?: Record<string, unknown>;
    };

export function pluginSuccess<TData>(
  data: TData,
  options: {
    dryRun?: boolean;
    warnings?: PluginWarning[];
    audit?: Record<string, unknown>;
  } = {}
): PluginExecutionResult<TData> {
  return {
    ok: true,
    data,
    dryRun: options.dryRun ?? false,
    warnings: options.warnings ?? [],
    audit: options.audit
  };
}

export function pluginFailure<TData = never>(
  error: PluginExecutionErrorInfo,
  options: {
    dryRun?: boolean;
    warnings?: PluginWarning[];
    audit?: Record<string, unknown>;
  } = {}
): PluginExecutionResult<TData> {
  return {
    ok: false,
    error,
    dryRun: options.dryRun ?? false,
    warnings: options.warnings ?? [],
    audit: options.audit
  };
}

