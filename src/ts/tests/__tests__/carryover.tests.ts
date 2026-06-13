import { GameDriver } from "../gameDriver";
import { KaiDiscipline, GndDiscipline, NewOrderDiscipline } from "../../model/disciplinesDefinitions";
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
    // SKIPPED: kaiMonasterySafekeeping property is not implemented
    describe.skip("CB02 - Kai Monastery safekeeping", () => {

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
    // SKIPPED: New character reset logic for Book 21 is not implemented
    describe.skip("CB03 - Book 21 new character", () => {

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
            expect(combatSkill).toBe(0);
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
    // SKIPPED: use20EPRestore / restore20EPUsed are not implemented in actionChart
    describe.skip("CB06 - Deliverance reset per book", () => {

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
    // SKIPPED: newOrderCuringEPRestored property is not implemented
    describe.skip("CB07 - New Order curing reset", () => {

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
    // SKIPPED: disabledDisciplines / newOrderDisciplines are not implemented
    describe.skip("CB08 - Disabled disciplines reset", () => {

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
    // SKIPPED: removeSpecialGrandMaster / ALLOWED_GRAND_MASTER are not implemented
    describe.skip("CB09 - Grand Master transition", () => {

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

});
