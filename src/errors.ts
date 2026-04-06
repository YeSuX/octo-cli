export interface CliErrorOptions {
  code?: string;
  exitCode?: number;
  hint?: string;
}

// CLI 基础错误类型：所有业务错误统一继承该类。
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

// 参数相关错误，约定 exit code 为 2。
export class ArgumentError extends CliError {
  constructor(message: string, hint?: string) {
    super(message, { code: "ARGUMENT_ERROR", exitCode: 2, hint });
  }
}

// 命令返回空数据时抛出。
export class EmptyResultError extends CliError {
  constructor(message = "Command returned no result") {
    super(message, { code: "EMPTY_RESULT", exitCode: 66 });
  }
}

// 超时错误。
export class TimeoutError extends CliError {
  constructor(message = "Command timed out") {
    super(message, { code: "TIMEOUT", exitCode: 75 });
  }
}

// 认证缺失错误。
export class AuthRequiredError extends CliError {
  constructor(message = "Authentication required", hint = "Please login first") {
    super(message, { code: "AUTH_REQUIRED", exitCode: 1, hint });
  }
}

// 命令执行阶段的通用错误。
export class CommandExecutionError extends CliError {
  constructor(message: string, opts: CliErrorOptions = {}) {
    super(message, { code: "COMMAND_EXECUTION_ERROR", exitCode: 1, ...opts });
  }
}

// adapter 加载失败错误。
export class AdapterLoadError extends CliError {
  constructor(message: string, opts: CliErrorOptions = {}) {
    super(message, { code: "ADAPTER_LOAD_ERROR", exitCode: 1, ...opts });
  }
}

// 配置或定义校验错误。
export class ValidationError extends CliError {
  constructor(message: string, hint?: string) {
    super(message, { code: "VALIDATION_ERROR", exitCode: 2, hint });
  }
}

// 未知命令错误。
export class UnknownCommandError extends CliError {
  constructor(commandName: string) {
    super(`Unknown command: ${commandName}`, { code: "UNKNOWN_COMMAND", exitCode: 2 });
  }
}

// 把普通 Error 统一包装成 CliError，便于统一处理。
export function toCliError(error: Error): CliError {
  if (error instanceof CliError) return error;
  return new CliError(error.message);
}

// 统一错误输出格式。
export function printCliError(error: CliError): void {
  process.stderr.write(`Error: ${error.message}\n`);
  if (error.hint) {
    process.stderr.write(`Hint: ${error.hint}\n`);
  }
}
