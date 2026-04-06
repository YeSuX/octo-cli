import { cli } from "../../../src/registry.js";

cli({
  site: "fixture",
  name: "broken",
  description: "Broken ts adapter",
  strategy: "public",
  browser: false,
  async func() {
    return { ok: true };
  },
;
