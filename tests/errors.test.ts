import { describe, expect, test } from "vitest";
import {
  ArgumentError,
  CliError,
  EmptyResultError,
  TimeoutError,
  ValidationError,
} from "../src/errors.js";

describe("errors", () => {
  test("inherits CliError", () => {
    const error = new ArgumentError("bad arg");
    expect(error).toBeInstanceOf(CliError);
    expect(error.exitCode).toBe(2);
  });

  test("empty result has expected code", () => {
    const error = new EmptyResultError();
    expect(error.code).toBe("EMPTY_RESULT");
    expect(error.exitCode).toBe(66);
  });

  test("timeout has expected code", () => {
    const error = new TimeoutError();
    expect(error.code).toBe("TIMEOUT");
    expect(error.exitCode).toBe(75);
  });

  test("validation has expected code", () => {
    const error = new ValidationError("invalid");
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.exitCode).toBe(2);
  });
});
