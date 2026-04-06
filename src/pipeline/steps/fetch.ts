import { CommandExecutionError } from "../../errors.js";
import type { FetchStep, JsonValue } from "../../types.js";

export async function runFetchStep(step: FetchStep): Promise<JsonValue> {
  const response = await fetch(step.url, {
    method: step.method ?? "GET",
    headers: step.headers,
  });
  if (!response.ok) {
    throw new CommandExecutionError(`fetch step failed: ${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as JsonValue;
  return data;
}
