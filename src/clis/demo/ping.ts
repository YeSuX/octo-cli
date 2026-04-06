import { cli } from "../../registry.js";

// 最小 TS adapter 示例：用于验证 func 执行链路。
cli({
  site: "demo",
  name: "ping",
  description: "Return a basic runtime payload",
  strategy: "public",
  browser: false,
  args: [{ name: "name", type: "string", required: false, default: "world" }],
  columns: ["message", "timestamp", "version"],
  async func(_page, kwargs) {
    // 把输入参数回显到结构化输出里，便于本地调试。
    const name = kwargs.name ? String(kwargs.name) : "world";
    return {
      message: `hello ${name}`,
      timestamp: new Date().toISOString(),
      version: "phase-a",
    };
  },
});
