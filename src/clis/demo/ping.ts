import { cli } from "../../registry.js";

cli({
  site: "demo",
  name: "ping",
  description: "Return a basic runtime payload",
  strategy: "public",
  browser: false,
  args: [{ name: "name", type: "string", required: false, default: "world" }],
  columns: ["message", "timestamp", "version"],
  async func(_page, kwargs) {
    const name = kwargs.name ? String(kwargs.name) : "world";
    return {
      message: `hello ${name}`,
      timestamp: new Date().toISOString(),
      version: "phase-a",
    };
  },
});
