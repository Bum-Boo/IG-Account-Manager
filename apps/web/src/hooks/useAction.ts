import { useCallback, useState } from "react";
import { errorMessage } from "./workspaceState.js";

/** Tracks one in-flight user action and keeps its failure visible instead of dropping it. */
export function useAction<TKey extends string = string>() {
  const [busy, setBusy] = useState<TKey>();
  const [error, setError] = useState<string>();

  const run = useCallback(async (key: TKey, task: () => Promise<void>) => {
    setBusy(key);
    setError(undefined);

    try {
      await task();
      return true;
    } catch (cause) {
      setError(errorMessage(cause));
      return false;
    } finally {
      setBusy(undefined);
    }
  }, []);

  return { busy, error, run };
}
