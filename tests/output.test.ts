import { describe, expect, test } from "vitest";
import { renderToString } from "../src/output.js";

describe("output", () => {
  test("renders json", () => {
    const out = renderToString({ id: 1, title: "hello" }, { fmt: "json" });
    expect(out).toContain('"id": 1');
  });

  test("renders yaml", () => {
    const out = renderToString({ id: 1 }, { fmt: "yaml" });
    expect(out).toContain("id: 1");
  });

  test("renders csv", () => {
    const out = renderToString([{ id: 1, title: "a" }], { fmt: "csv" });
    expect(out.split("\n")[0]).toBe("id,title");
  });

  test("renders table", () => {
    const out = renderToString([{ id: 1, title: "a" }], { fmt: "table", columns: ["id", "title"] });
    expect(out).toContain("id");
    expect(out).toContain("title");
  });
});
