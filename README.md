# OctoCLI

Phase A implementation is complete. The CLI supports:

- dynamic YAML/TS adapter discovery from `src/clis` and `~/.octo/clis`
- command execution (`func` and pipeline)
- unified output (`table`, `json`, `yaml`, `csv`)
- built-in commands: `list`, `validate`, `verify`
- typed error model and exit codes

## Install

```bash
bun install
```

## Development

```bash
bun run dev
```

## Typecheck

```bash
bun run typecheck
```

## Test

```bash
bun run test
```

## Examples

```bash
octo list
octo validate
octo verify
octo demo ping
octo demo hello --format json
```
