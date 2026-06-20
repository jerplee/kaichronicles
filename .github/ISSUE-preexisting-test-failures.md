---
Title: [Known Failures] Fix pre-existing integration test failures (hasObject, canUseBow, setDisciplines)
Labels: tests, bug, good first issue
---

## Summary

Three integration test failures have existed since the initial project commit (`9f03566`, 2025-09-18). They are **not regressions** from any recent refactor. This issue tracks fixing them.

## Failing Tests

### 1. `rules.tests.ts` — `hasObject`

**Error:**
```
TypeError: Cannot read properties of null (reading 'click')
```

**Repro:**
```bash
npx jest --no-coverage --runInBand src/ts/tests/__tests__/rules.tests.ts --testNamePattern="hasObject"
```

**Root cause:**
Test calls `driver.pick("sommerswerd", true)` which uses the `fromSection=true` branch. This looks for a DOM link `a[data-objectid="sommerswerd"][data-op="get"]` via `getObjectOpLink()`, but the link doesn't exist (section mechanics don't render it, or section state is stale from a prior visit). `getElementByCss` returns `null`, and `cleanClickAndWait(null)` crashes.

**Likely fix:**
Either:
- (a) Update the test to use `driver.pick("sommerswerd")` (the `executeScript` path) instead of DOM-click, or
- (b) Fix section mechanics / `fireInventoryEvents()` to render the pick-link after `drop(objectId, true)`.

---

### 2. `rules.tests.ts` — `canUseBow`

**Error:** Same `TypeError: Cannot read properties of null (reading 'click')`

**Repro:**
```bash
npx jest --no-coverage --runInBand src/ts/tests/__tests__/rules.tests.ts --testNamePattern="canUseBow"
```

**Root cause:** Same as `hasObject` — `driver.pick(Item.BOW, true)` at line 198 tries to click a DOM pick-link that isn't rendered.

**Likely fix:** Same options as above.

---

### 3. `setDisciplines.tests.ts` — `Select initial disciplines number` (and all 18 variants)

**Error:**
```
NoSuchAlertError: no such alert
```

**Repro:**
```bash
npx jest --no-coverage --runInBand src/ts/tests/__tests__/setDisciplines.tests.ts --testNamePattern="Select initial disciplines number"
```

**Root cause:** Tests at lines ~70-75 and ~122-126 expect a native browser `alert()` dialog when too many disciplines/weapons are selected:

```typescript
await weaponsChecks[bookSeries.initialWeaponskillNWeapons].click();
const alert = await driver.getAlert();
expect( alert ).not.toBeNull();
await alert.accept();
```

The app no longer fires native `alert()` dialogs — it now uses a modal, toast, or inline validation. The tests were never updated after the UI behavior changed.

**Likely fix:** Update tests to match current UI behavior:
- If modal: wait for modal element + assert text
- If toast: check `.toast` visibility
- If inline: assert button has `disabled` class

## Verification that these are pre-existing

```bash
# Check out original code before any refactor
git checkout cb9a58b

# Apply only the Selenium footer fixes (needed for tests to run at all)
git show 225b0aa:src/ts/template.ts > src/ts/template.ts
git show 225b0aa:src/ts/tests/gameDriver.ts > src/ts/tests/gameDriver.ts
npx webpack --mode development
npx jest --no-coverage --runInBand src/ts/tests/__tests__/rules.tests.ts --testNamePattern="hasObject|canUseBow"
npx jest --no-coverage --runInBand src/ts/tests/__tests__/setDisciplines.tests.ts --testNamePattern="Select initial disciplines number"
```

Same failures occur.

## Environment

- OS: Windows
- Chrome: 149.0.7827.116
- ChromeDriver: 149.0.7827.116
- Node: (project local)

## Acceptance Criteria

- [ ] `hasObject` test passes
- [ ] `canUseBow` test passes
- [ ] `setDisciplines.tests.ts` suite passes (all 18+ tests)
