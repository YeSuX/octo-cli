import { ValidationError } from "../../errors.js";
import type { FilterStep, JsonObject, JsonValue } from "../../types.js";
import { isDict } from "../../utils.js";

function asRows(input: JsonValue): JsonObject[] {
  if (!Array.isArray(input)) throw new ValidationError("filter step expects array context");
  const out: JsonObject[] = [];
  for (const row of input) {
    if (!isDict(row)) throw new ValidationError("filter step expects object rows");
    out.push(row);
  }
  return out;
}

export function runFilterStep(step: FilterStep, input: JsonValue): JsonValue {
  const rows = asRows(input);
  return rows.filter((row) => row[step.field] === step.equals);
}
