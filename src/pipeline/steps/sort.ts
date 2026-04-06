import { ValidationError } from "../../errors.js";
import type { JsonObject, JsonValue, SortStep } from "../../types.js";
import { isDict } from "../../utils.js";

function asRows(input: JsonValue): JsonObject[] {
  if (!Array.isArray(input)) throw new ValidationError("sort step expects array context");
  const out: JsonObject[] = [];
  for (const row of input) {
    if (!isDict(row)) throw new ValidationError("sort step expects object rows");
    out.push(row);
  }
  return out;
}

export function runSortStep(step: SortStep, input: JsonValue): JsonValue {
  const rows = asRows(input);
  const order = step.order ?? "asc";
  return [...rows].sort((a, b) => {
    const aValue = a[step.field];
    const bValue = b[step.field];
    const aText = aValue === undefined || aValue === null ? "" : String(aValue);
    const bText = bValue === undefined || bValue === null ? "" : String(bValue);
    return order === "asc" ? aText.localeCompare(bText) : bText.localeCompare(aText);
  });
}
