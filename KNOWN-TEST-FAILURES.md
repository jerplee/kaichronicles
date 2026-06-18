# Known Pre-Existing Test Failures

> **Status:** These failures existed before the goto-exception refactor (commit `cb9a58b`).
> They are **not regressions** from the `SectionJumpError` / `_expectedSection` refactor.
> Date documented: 2026-06-17

## Summary

| Suite | Failing Test | Count | Error | Pre-existing? |
|-------|-------------|-------|-------|---------------|
| `rules.tests.ts` | `hasObject` | 1 | `TypeError: Cannot read properties of null (reading 'click')` | Yes |
| `rules.tests.ts` | `canUseBow` | 1 | `TypeError: Cannot read properties of null (reading 'click')` | Yes |
| `setDisciplines.tests.ts` | `Select initial disciplines number` | 18 | `NoSuchAlertError: no such alert` | Yes |

---

## 1. `rules.tests.ts` — `hasObject` and `canUseBow`

### Failure

```
TypeError: Cannot read properties of null (reading 'click')
    at Object.next (src/ts/tests/gameDriver.ts:14:53)
```

### Root Cause

Both tests call `driver.pick(objectId, true)` which triggers the `fromSection=true` branch in `GameDriver.pick()`:

```typescript
public async pick(objectId: string, fromSection: boolean = false) {
    if (!fromSection) {
        await this.driver.executeScript(`kai.actionChartController.pick("${objectId}")`);
    } else {
        const pickLink = await this.getObjectOpLink(objectId, "get");
        await this.cleanClickAndWait(pickLink);  // <-- pickLink is null
    }
}
```

`getObjectOpLink()` queries for `a[data-objectid=${objectId}][data-op=get]`. If the section renderer does not produce this link (because the object was never actually dropped onto the section in a way the renderer sees, or section state is cached from a prior visit), `getElementByCss` returns `null`, and `cleanClickAndWait(null)` crashes.

### Why this is a stale test

- The `git blame` for these lines points to commit `9f03566` (initial project commit, 2025-09-18) — they have never been updated.
- The same failures occur on the original code (`cb9a58b`) before any refactor.
- The refactor touched `goToSection`, `runChildRules`, and `fire*` methods — none of which affect whether `a[data-objectid][data-op=get]` links exist in the DOM.

### What needs to be fixed

Option A — Fix the test expectations:
- Either ensure the section mechanics actually render a "pick from section" link before clicking it.
- Or change the test to use `driver.pick("sommerswerd")` (the `executeScript` path) instead of the DOM-click path.

Option B — Fix the section mechanics / inventory rendering:
- Ensure `mechanicsEngine.fireInventoryEvents()` correctly renders object-operation links after a `drop(objectId, true)` call.

---

## 2. `setDisciplines.tests.ts` — `NoSuchAlertError`

### Failure

```
NoSuchAlertError: no such alert
```

At lines ~70-75 and ~122-126, the test expects a native browser `alert()` dialog when too many disciplines (or weapons) are selected:

```typescript
// If you pick other weapon more, expect an error
await weaponsChecks[bookSeries.initialWeaponskillNWeapons].click();
const alert = await driver.getAlert();
expect( alert ).not.toBeNull();
await alert.accept();
```

### Root Cause

The app no longer fires native `alert()` dialogs for this validation. It likely uses:
- A Bootstrap modal
- A toastr notification
- Inline validation (disabled button + message)

The test was written when the app used `window.alert()` and was never updated when the UI changed.

### Why this is a stale test

- `git blame` shows these lines were added in commit `9f03566` (initial commit) and never modified.
- Same failures occur on the original code (`cb9a58b`) before any refactor.
- The refactor did not touch discipline-picker UI or alert behavior.

### What needs to be fixed

Update the test to match the current app behavior:
- If the app uses a modal: check for the modal element instead of `driver.getAlert()`.
- If the app uses a toast: check for `.toast` visibility and text.
- If the app disables the button: assert the button has the `disabled` class / `isEnabled() === false`.

---

## Verification Steps

To confirm these are pre-existing, run this on a clean checkout:

```bash
# Check out original code before refactor
git checkout cb9a58b

# Apply only the footer fixes (needed for Selenium to run at all)
git show 225b0aa:src/ts/template.ts > src/ts/template.ts
git show 225b0aa:src/ts/tests/gameDriver.ts > src/ts/tests/gameDriver.ts

npx webpack --mode development
npx jest --no-coverage --runInBand src/ts/tests/__tests__/rules.tests.ts --testNamePattern="hasObject|canUseBow"
npx jest --no-coverage --runInBand src/ts/tests/__tests__/setDisciplines.tests.ts --testNamePattern="Select initial disciplines number"
```

The same failures will occur.

---

## Refactor-Specific Fixes That **Did** Work

The following issues were introduced by the refactor and have been resolved in commit `225b0aa`:

| Issue | Cause | Fix |
|-------|-------|-----|
| `TimeoutError: Waiting for element to be located By(css selector, *[id="section-ready"])` | Combat turn promise chain did not add `section-ready` marker when aborting early | Added `hasSectionChanged()` checks to ensure `addSectionReadyMarker()` is reached |
| `ElementClickInterceptedError` (footer) | `app-footer` was visible during Selenium tests | Hide `#app-footer` in `template.updateFooter()` and `template.hideCopyrightsForTests()`; inject CSS override for `body.sidebar-visible` |
| `ElementClickInterceptedError` (toasts) | Toastr success notifications blocked clicks on random links | Remove `.toast` and `#toast-container` elements before clicks in `cleanClickAndWait()` |

---

## Recommended Backlog Priority

| Issue | Priority | Effort | Notes |
|-------|----------|--------|-------|
| Fix `hasObject` / `canUseBow` tests | Low | Small | Either update test or ensure section mechanics render pick links |
| Fix `setDisciplines.tests.ts` alert assumptions | Low | Small | Update test to match current UI behavior (no native alerts) |
