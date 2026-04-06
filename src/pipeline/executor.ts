import { ValidationError } from "../errors.js";
import type { JsonValue, PipelineStep } from "../types.js";
import { runFetchStep } from "./steps/fetch.js";
import { runFilterStep } from "./steps/filter.js";
import { runLimitStep } from "./steps/limit.js";
import { runMapStep } from "./steps/map.js";
import { runSortStep } from "./steps/sort.js";

// 支持 `${name}` 形式的简单变量替换。
function interpolate(input: string, kwargs: Record<string, string | number | boolean>): string {
  return input.replace(/\$\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => {
    const value = kwargs[key];
    return value === undefined ? "" : String(value);
  });
}

// pipeline 执行主流程：按步骤顺序串行执行并传递上下文。
export async function executePipeline(
  steps: PipelineStep[],
  kwargs: Record<string, string | number | boolean>,
  debug = false,
): Promise<JsonValue> {
  let context: JsonValue = null;

  for (const step of steps) {
    // fetch 步骤支持参数插值，便于复用 YAML 模板。
    if (step.use === "fetch") {
      context = await runFetchStep({
        ...step,
        url: interpolate(step.url, kwargs),
      });
      continue;
    }
    if (step.use === "map") {
      context = runMapStep(step, context);
      continue;
    }
    if (step.use === "filter") {
      context = runFilterStep(step, context);
      continue;
    }
    if (step.use === "limit") {
      context = runLimitStep(step, context);
      continue;
    }
    if (step.use === "sort") {
      context = runSortStep(step, context);
      continue;
    }
    // debug 步骤不改变上下文，仅在 debug 模式输出信息。
    if (debug) {
      process.stderr.write(`[debug] ${step.label ?? "pipeline"}\n`);
    }
  }

  if (context === null) {
    throw new ValidationError("pipeline produced no output");
  }

  return context;
}
