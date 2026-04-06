import { ValidationError } from "../../errors.js";
import type { JsonObject, JsonValue, MapStep } from "../../types.js";
import { isDict } from "../../utils.js";

function toRows(input: JsonValue): JsonObject[] {
  if (Array.isArray(input)) {
    const out: JsonObject[] = [];
    for (const row of input) {
      if (!isDict(row)) throw new ValidationError("map step expects object rows");
      out.push(row);
    }
    return out;
  }
  if (isDict(input)) return [input];
  throw new ValidationError("map step expects array/object context");
}

export function runMapStep(step: MapStep, input: JsonValue): JsonValue {
  const rows = toRows(input);
  const mapped: JsonObject[] = [];
  for (const row of rows) {
    const next: JsonObject = {};
    for (const [target, source] of Object.entries(step.pick)) {
      const value = row[source];
      next[target] = value === undefined ? null : value;
    }
    mapped.push(next);
  }
  return mapped;
}
