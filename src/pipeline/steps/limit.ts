import { ValidationError } from "../../errors.js";
import type { JsonValue, LimitStep } from "../../types.js";

export function runLimitStep(step: LimitStep, input: JsonValue): JsonValue {
  if (!Array.isArray(input)) throw new ValidationError("limit step expects array context");
  return input.slice(0, step.count);
}
