import { ValidationError } from "../../errors.js";
import type { JsonObject, JsonValue, MapStep } from "../../types.js";
import { isDict } from "../../utils.js";

// 把输入上下文规范化为对象数组，便于后续批处理。
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

// map 步骤：按 pick 映射字段，生成新的对象数组。
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
