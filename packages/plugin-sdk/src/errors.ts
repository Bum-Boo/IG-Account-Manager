export class PluginManifestError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = "PluginManifestError";
  }
}

export class PluginPermissionError extends Error {
  constructor(
    message: string,
    readonly permission?: string
  ) {
    super(message);
    this.name = "PluginPermissionError";
  }
}

export class PluginExecutionError extends Error {
  constructor(
    message: string,
    readonly code = "PLUGIN_EXECUTION_ERROR",
    readonly retryable = false,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = "PluginExecutionError";
  }
}

