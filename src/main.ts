#!/usr/bin/env node
import { runCli } from "./cli.js";

// CLI 进程入口：把原始命令行参数交给统一运行器处理。
await runCli(process.argv);
