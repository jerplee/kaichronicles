import { GameDriver } from "../gameDriver";
import { KaiDiscipline, MgnDiscipline, GndDiscipline, NewOrderDiscipline } from "../../model/disciplinesDefinitions";
import { Book, Item, state, BookSeriesId } from "../..";

// Selenium web driver
const driver: GameDriver = new GameDriver();

GameDriver.globalSetup();

jest.setTimeout(2000000);

// Initial setup
beforeAll(async () => {
    await driver.setupBrowser();
});

// Final shutdown
afterAll(async () => {
    await driver.close();
});

beforeEach(async () => {
    // Clean log before each test
    await driver.cleanLog();
});

/**
 * Helper: Navigate to the last section of the current book and click nextBook.
 * After this, the browser state will have bookNumber + 1 loaded.
 */
async function goToNextBook() {
    await driver.goToSection(state.mechanics.getLastSectionId());
    await driver.cleanClickAndWait(await driver.getElementById("game-nextBook"));
}

describe("carryover", () => {

    // ─── CB01: Action Chart stats carry forward ───
    describe("CB01 - Action Chart carryover", () => {

        test("Stats persist to next book", async () => {
            await driver.setupBookState(2);

            // Set specific stats on the action chart
            await driver.executeScript(`
                kai.state.actionChart.combatSkill = 15;
                kai.state.actionChart.endurance = 18;
                kai.state.actionChart.currentEndurance = 12;
            `);

            await goToNextBook();

            // Stats should carry over to Book 3
            const combatSkill = await driver.getCombatSkill();
            const endurance = await driver.executeScript("return kai.state.actionChart.endurance") as number;
            const currentEndurance = await driver.getCurrentEndurance();

            expect(combatSkill).toBe(15);
            expect(endurance).toBe(18);
            // currentEndurance gets restored to max by the tssf <endurance> rule
            expect(currentEndurance).toBe(endurance);
        });

        test("Items persist to next book", async () => {
            await driver.setupBookState(2);

            // Pick an item (meals go to meals counter, not backpackItems)
            await driver.executeScript(`kai.actionChartController.pick("meal")`);
            await driver.executeScript(`kai.actionChartController.pick("healingpotion")`);

            const mealsBefore = await driver.executeScript(
                "return kai.state.actionChart.meals"
            ) as number;
            const itemsBefore = await driver.executeScript(
                "return kai.state.actionChart.backpackItems.map(i => i.id)"
            ) as string[];
            expect(mealsBefore).toBeGreaterThan(0);
            expect(itemsBefore).toContain("healingpotion");

            await goToNextBook();

            // Items should still be present after transition to Book 3
            const mealsAfter = await driver.executeScript(
                "return kai.state.actionChart.meals"
            ) as number;
            const itemsAfter = await driver.executeScript(
                "return kai.state.actionChart.backpackItems.map(i => i.id)"
            ) as string[];
            expect(mealsAfter).toBeGreaterThan(0);
            expect(itemsAfter).toContain("healingpotion");
        });

        test("Disciplines persist to next book", async () => {
            await driver.setupBookState(2);

            // Set disciplines for Kai series
            await driver.executeScript(`
                kai.state.actionChart.setDisciplines(["${KaiDiscipline.Healing}", "${KaiDiscipline.Mindblast}", "${KaiDiscipline.Hunting}"], ${BookSeriesId.Kai});
            `);

            const disciplinesBefore = await driver.executeScript(
                `return kai.state.actionChart.getDisciplines()`
            ) as string[];
            expect(disciplinesBefore).toContain(KaiDiscipline.Healing);
            expect(disciplinesBefore).toContain(KaiDiscipline.Mindblast);

            await goToNextBook();

            // Disciplines should persist to Book 3
            const disciplinesAfter = await driver.executeScript(
                `return kai.state.actionChart.getDisciplines()`
            ) as string[];
            expect(disciplinesAfter).toContain(KaiDiscipline.Healing);
            expect(disciplinesAfter).toContain(KaiDiscipline.Mindblast);
        });
    });

    // ─── CB02: Kai Monastery objects persist ───
    describe("CB02 - Kai Monastery safekeeping", () => {

        test("Kai Monastery objects restored on next book", async () => {
            await driver.setupBookState(6);
            await driver.executeScript(`
                kai.state.actionChart.kaiMonasterySafekeeping = [
                    { id: "meal", count: 2, usageCount: 0, price: 0, currency: "crown", unlimited: false, useOnSection: false, dessiStoneBonus: false },
                    { id: "laumspur", count: 1, usageCount: 0, price: 0, currency: "crown", unlimited: false, useOnSection: false, dessiStoneBonus: false }
                ];
            `);
            await goToNextBook();
            const kaiMonasteryObjects = await driver.executeScript(
                `return kai.state.sectionStates.getSectionState("kaimonastery").objects.map(o => o.id)`
            ) as string[];
            expect(kaiMonasteryObjects).toContain("meal");
            expect(kaiMonasteryObjects).toContain("laumspur");
        });
    });

    // ─── CB03: Book 21 starts new character ───
    describe("CB03 - Book 21 new character", () => {

        test("Book 21 creates fresh ActionChart", async () => {
            await driver.setupBookState(20);
            await driver.executeScript(`
                kai.state.actionChart.combatSkill = 30;
                kai.state.actionChart.endurance = 35;
                kai.state.actionChart.currentEndurance = 30;
                kai.state.actionChart.setDisciplines(["${GndDiscipline.GrandWeaponmastery}", "${GndDiscipline.Deliverance}"], ${BookSeriesId.GrandMaster});
            `);
            await driver.executeScript(`kai.actionChartController.pick("meal")`);
            await goToNextBook();
            const currentBook = await driver.executeScript("return kai.state.book.bookNumber") as number;
            expect(currentBook).toBe(21);
            const combatSkill = await driver.getCombatSkill();
            // New Order debug default is 30
            expect(combatSkill).toBe(30);
            // Verify items were not carried over
            const hasMeal = await driver.executeScript(
                `return kai.state.actionChart.backpackItems.some(i => i.id === "meal")`
            ) as boolean;
            expect(hasMeal).toBe(false);
        });
    });

    // ─── CB04: Map dropped at start of each book ───
    describe("CB04 - Map dropped at book start", () => {

        test("Map is removed when starting next book", async () => {
            await driver.setupBookState(2);

            // Add map to backpack
            await driver.executeScript(`kai.actionChartController.pick("map")`);

            const hasMapBefore = await driver.hasObject("map");
            expect(hasMapBefore).toBe(true);

            await goToNextBook();

            // Map should be dropped by the tssf <drop objectId="map"/> rule
            const hasMapAfter = await driver.hasObject("map");
            expect(hasMapAfter).toBe(false);
        });
    });

    // ─── CB05: Endurance restored to max ───
    describe("CB05 - Endurance restored at book start", () => {

        test("Current endurance restored to maximum", async () => {
            await driver.setupBookState(2);

            // Set low current endurance
            await driver.executeScript(`
                kai.state.actionChart.endurance = 25;
                kai.state.actionChart.currentEndurance = 8;
            `);

            const maxEnduranceBefore = await driver.getMaxEndurance();
            expect(maxEnduranceBefore).toBe(25);

            await goToNextBook();

            // The tssf <endurance count="+[MAXENDURANCE]"/> rule restores EP
            const currentEndurance = await driver.getCurrentEndurance();
            const maxEndurance = await driver.getMaxEndurance();

            expect(currentEndurance).toBe(maxEndurance);
        });
    });

    // ─── CB06: Deliverance use counter resets ───
    describe("CB06 - Deliverance reset per book", () => {

        test("restore20EPUsed reset on next book", async () => {
            await driver.setupBookState(13);
            await driver.executeScript(`kai.state.actionChart.use20EPRestore()`);
            await goToNextBook();
            const usedAfter = await driver.executeScript(
                `return kai.state.actionChart.restore20EPUsed`
            ) as boolean;
            expect(usedAfter).toBe(false);
        });
    });

    // ─── CB07: New Order curing EP restored counter resets ───
    describe("CB07 - New Order curing reset", () => {

        test("newOrderCuringEPRestored reset on next book", async () => {
            await driver.setupBookState(21);
            await driver.executeScript(`kai.state.actionChart.newOrderCuringEPRestored = 15`);
            await goToNextBook();
            const countAfter = await driver.executeScript(
                `return kai.state.actionChart.newOrderCuringEPRestored`
            ) as number;
            expect(countAfter).toBe(0);
        });
    });

    // ─── CB08: Disabled disciplines reset ───
    describe("CB08 - Disabled disciplines reset", () => {

        test("disabledDisciplines cleared on next book", async () => {
            await driver.setupBookState(21);
            await driver.executeScript(`
                kai.state.actionChart.setDisciplines(["${NewOrderDiscipline.GrandWeaponmastery}", "${NewOrderDiscipline.Deliverance}", "${NewOrderDiscipline.GrandHuntmastery}", "${NewOrderDiscipline.Assimilance}", "${NewOrderDiscipline.AnimalMastery}"], ${BookSeriesId.NewOrder});
                kai.state.actionChart.disableDiscipline(2);
            `);
            await goToNextBook();
            const disabledAfter = await driver.executeScript(
                `return kai.state.actionChart.newOrderDisciplines.disabledDisciplines`
            ) as string[];
            expect(disabledAfter.length).toBe(0);
        });
    });

    // ─── CB09: Grand Master transition ───
    describe("CB09 - Grand Master transition", () => {

        test("Non-allowed special items removed", async () => {
            await driver.setupBookState(12);
            await driver.executeScript(`kai.actionChartController.pick("lamp")`);
            await goToNextBook();
            const hasItemAfter = await driver.executeScript(
                `return kai.state.actionChart.specialItems.some(i => i.id === "lamp")`
            ) as boolean;
            expect(hasItemAfter).toBe(false);
        });

        test("Allowed special items are kept", async () => {
            await driver.setupBookState(12);
            await driver.executeScript(`kai.actionChartController.pick("sommerswerd")`);
            await goToNextBook();
            const hasItemAfter = await driver.executeScript(
                `return kai.state.actionChart.specialItems.some(i => i.id === "sommerswerd")`
            ) as boolean;
            expect(hasItemAfter).toBe(true);
        });
    });

    // ─── CB10: Cross-series discipline and weapon carryover ───
    describe("CB10 - Cross-series carryover", () => {

        test("Magnakai to Grand Master disciplines and weapons carry over", async () => {
            await driver.setupBookState(12);

            // Set Magnakai disciplines and weapons
            await driver.executeScript(`
                kai.state.actionChart.setDisciplines([
                    "${MgnDiscipline.Weaponmastery}",
                    "${MgnDiscipline.Curing}",
                    "${MgnDiscipline.Huntmastery}"
                ], ${BookSeriesId.Magnakai});
                kai.state.actionChart.setWeaponSkill(["axe", "sword", "bow"], ${BookSeriesId.Magnakai});
            `);

            await goToNextBook();

            // Verify Grand Master book loaded
            const currentBook = await driver.executeScript("return kai.state.book.bookNumber") as number;
            expect(currentBook).toBe(13);

            // Verify previous Magnakai disciplines are preserved for loyalty bonus
            const magnakaiDisciplines = await driver.executeScript(
                `return kai.state.actionChart.getDisciplines(${BookSeriesId.Magnakai})`
            ) as string[];
            expect(magnakaiDisciplines.length).toBeGreaterThan(0);
            expect(magnakaiDisciplines).toContain(MgnDiscipline.Weaponmastery);

            // Verify previous Magnakai weapons are preserved
            const magnakaiWeapons = await driver.executeScript(
                `return kai.state.actionChart.getWeaponSkill(${BookSeriesId.Magnakai})`
            ) as string[];
            expect(magnakaiWeapons.length).toBeGreaterThan(0);
        });

        test("Grand Master to New Order starts fresh character", async () => {
            await driver.setupBookState(20);

            // Set Grand Master disciplines and items
            await driver.executeScript(`
                kai.state.actionChart.setDisciplines([
                    "${GndDiscipline.GrandWeaponmastery}",
                    "${GndDiscipline.Deliverance}"
                ], ${BookSeriesId.GrandMaster});
            `);
            await driver.executeScript(`kai.actionChartController.pick("meal")`);
            await driver.executeScript(`kai.actionChartController.pick("healingpotion")`);

            await goToNextBook();

            // Verify New Order book loaded
            const currentBook = await driver.executeScript("return kai.state.book.bookNumber") as number;
            expect(currentBook).toBe(21);

            // Verify Grand Master items were not carried over (new character)
            const hasMeal = await driver.executeScript(
                `return kai.state.actionChart.backpackItems.some(i => i.id === "meal")`
            ) as boolean;
            expect(hasMeal).toBe(false);
            const hasPotion = await driver.executeScript(
                `return kai.state.actionChart.backpackItems.some(i => i.id === "healingpotion")`
            ) as boolean;
            expect(hasPotion).toBe(false);
        });
    });

    // ─── CB11: Save after transition preserves per-book resets ───
    describe("CB11 - Save after transition", () => {

        test("Per-book reset flags survive save and restore", async () => {
            await driver.setupBookState(1);

            // Simulate per-book flags set in Book 1
            await driver.executeScript(`
                kai.state.actionChart.restore20EPUsed = true;
                kai.state.actionChart.newOrderCuringEPRestored = 5;
                kai.state.actionChart.newOrderDisciplines.disabledDisciplines = ["huntmastery"];
            `);

            await goToNextBook();

            // Verify resets were applied during transition
            const restore20EPUsed = await driver.executeScript(
                `return kai.state.actionChart.restore20EPUsed`
            ) as boolean;
            expect(restore20EPUsed).toBe(false);

            const newOrderCuringEPRestored = await driver.executeScript(
                `return kai.state.actionChart.newOrderCuringEPRestored`
            ) as number;
            expect(newOrderCuringEPRestored).toBe(0);

            const disabledDisciplines = await driver.executeScript(
                `return kai.state.actionChart.newOrderDisciplines.disabledDisciplines`
            ) as string[];
            expect(disabledDisciplines.length).toBe(0);

            // Save the game (persistState schedules debounced IndexedDB write)
            await driver.executeScript(`
                kai.state.persistState();
                return new Promise(resolve => setTimeout(resolve, 800));
            `);

            // Corrupt the state to prove restore actually loads from save
            await driver.executeScript(`
                kai.state.actionChart.restore20EPUsed = true;
                kai.state.actionChart.newOrderCuringEPRestored = 99;
                kai.state.actionChart.newOrderDisciplines.disabledDisciplines = ["huntmastery"];
            `);

            // Restore from auto-save
            const restored = await driver.executeScript(
                `return kai.state.restoreFromIndexedDb();`
            ) as boolean;
            expect(restored).toBe(true);

            // Verify restored state still has the reset values
            const restoredRestore20EPUsed = await driver.executeScript(
                `return kai.state.actionChart.restore20EPUsed`
            ) as boolean;
            expect(restoredRestore20EPUsed).toBe(false);

            const restoredCuring = await driver.executeScript(
                `return kai.state.actionChart.newOrderCuringEPRestored`
            ) as number;
            expect(restoredCuring).toBe(0);

            const restoredDisabled = await driver.executeScript(
                `return kai.state.actionChart.newOrderDisciplines.disabledDisciplines`
            ) as string[];
            expect(restoredDisabled.length).toBe(0);
        });
    });

});
