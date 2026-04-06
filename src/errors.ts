export interface CliErrorOptions {
  code?: string;
  exitCode?: number;
  hint?: string;
}

export class CliError extends Error {
  readonly code: string;
  readonly exitCode: number;
  readonly hint?: string;

  constructor(message: string, opts: CliErrorOptions = {}) {
    super(message);
    this.name = new.target.name;
    this.code = opts.code ?? "CLI_ERROR";
    this.exitCode = opts.exitCode ?? 1;
    this.hint = opts.hint;
  }
}

export class ArgumentError extends CliError {
  constructor(message: string, hint?: string) {
    super(message, { code: "ARGUMENT_ERROR", exitCode: 2, hint });
  }
}

export class EmptyResultError extends CliError {
  constructor(message = "Command returned no result") {
    super(message, { code: "EMPTY_RESULT", exitCode: 66 });
  }
}

export class TimeoutError extends CliError {
  constructor(message = "Command timed out") {
    super(message, { code: "TIMEOUT", exitCode: 75 });
  }
}

export class AuthRequiredError extends CliError {
  constructor(message = "Authentication required", hint = "Please login first") {
    super(message, { code: "AUTH_REQUIRED", exitCode: 1, hint });
  }
}

export class CommandExecutionError extends CliError {
  constructor(message: string, opts: CliErrorOptions = {}) {
    super(message, { code: "COMMAND_EXECUTION_ERROR", exitCode: 1, ...opts });
  }
}

export class AdapterLoadError extends CliError {
  constructor(message: string, opts: CliErrorOptions = {}) {
    super(message, { code: "ADAPTER_LOAD_ERROR", exitCode: 1, ...opts });
  }
}

export class ValidationError extends CliError {
  constructor(message: string, hint?: string) {
    super(message, { code: "VALIDATION_ERROR", exitCode: 2, hint });
  }
}

export class UnknownCommandError extends CliError {
  constructor(commandName: string) {
    super(`Unknown command: ${commandName}`, { code: "UNKNOWN_COMMAND", exitCode: 2 });
  }
}

export function toCliError(error: Error): CliError {
  if (error instanceof CliError) return error;
  return new CliError(error.message);
}

export function printCliError(error: CliError): void {
  process.stderr.write(`Error: ${error.message}\n`);
  if (error.hint) {
    process.stderr.write(`Hint: ${error.hint}\n`);
  }
}
