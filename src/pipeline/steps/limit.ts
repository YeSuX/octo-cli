import { ValidationError } from "../../errors.js";
import type { JsonValue, LimitStep } from "../../types.js";

// limit 步骤：截取前 N 条结果。
export function runLimitStep(step: LimitStep, input: JsonValue): JsonValue {
  if (!Array.isArray(input)) throw new ValidationError("limit step expects array context");
  return input.slice(0, step.count);
}
