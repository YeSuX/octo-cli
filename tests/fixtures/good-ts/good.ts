import { cli } from "../../../src/registry.js";

cli({
  site: "fixture",
  name: "tsok",
  description: "Valid ts adapter",
  strategy: "public",
  browser: false,
  async func() {
    return { ok: true };
  },
});
