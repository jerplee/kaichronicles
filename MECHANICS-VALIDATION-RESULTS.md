# Mechanics Validation Results (Books 1–29)

**Date:** 2026-06-13  
**Method:** `BookValidator.validateBook()` via standalone script `scripts/validate-all-books.ts`

## Summary

All 29 books now pass semantic validation with **zero errors**.

## Issue Found & Fixed

During the initial run, **Books 25, 26, 27, and 29** failed validation with:

```
Error evaluating expression: Error: Unexpected character: M
```

### Root Cause

The Phase 3 refactor that replaced `eval()` with `safeMathEvaluator` did not include support for `Math.max()` and `Math.min()` function calls. Several late-series books use expressions like:

- `Math.max(0, [KAILEVEL] - 7)`
- `Math.max(0, ([RANDOM] - 2))`

### Fix

Updated `src/ts/model/safeMathEvaluator.ts` to tokenize and parse `Math.max` and `Math.min` as identifier-based function calls with comma-separated arguments.

- Added `TokenType.Identifier` and `TokenType.Comma`
- Extended tokenizer to recognize `Math.max` / `Math.min`
- Extended `parsePrimary` to parse function-call syntax and delegate to `Math.max(...)` / `Math.min(...)`

### Files Changed

- `src/ts/model/safeMathEvaluator.ts` — added `Math.max` / `Math.min` support
- `src/ts/tests/__tests__/mechanicsValidation.tests.ts` — expanded to cover books 1–29
- `scripts/validate-all-books.ts` — standalone validation script

## How to Re-run

```bash
# Standalone script (fast, no browser)
npx ts-node --transpile-only --compiler-options '{"module":"commonjs"}' scripts/validate-all-books.ts

# Jest test (slower, same checks)
npx jest src/ts/tests/__tests__/mechanicsValidation.tests.ts --no-coverage --testTimeout=120000
```
