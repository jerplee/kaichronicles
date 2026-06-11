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

            // Pick an item
            await driver.executeScript(`kai.actionChartController.pick("meal")`);
            await driver.executeScript(`kai.actionChartController.pick("healingpotion")`);

            const itemsBefore = await driver.executeScript(
                "return kai.state.actionChart.backpackItems.map(i => i.id)"
            ) as string[];
            expect(itemsBefore).toContain("meal");
            expect(itemsBefore).toContain("healingpotion");

            await goToNextBook();

            // Items should still be in backpack after transition to Book 3
            const itemsAfter = await driver.executeScript(
                "return kai.state.actionChart.backpackItems.map(i => i.id)"
            ) as string[];
            expect(itemsAfter).toContain("meal");
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

            // Store items in Kai Monastery safekeeping
            await driver.executeScript(`
                kai.state.actionChart.kaiMonasterySafekeeping = [
                    { id: "meal", count: 2, usageCount: 0, price: 0, currency: "crown", unlimited: false, useOnSection: false, dessiStoneBonus: false },
                    { id: "laumspur", count: 1, usageCount: 0, price: 0, currency: "crown", unlimited: false, useOnSection: false, dessiStoneBonus: false }
                ];
            `);

            await goToNextBook();

            // Verify Kai Monastery section has the stored objects
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

            // Set up Book 20 with stats, disciplines, items
            await driver.executeScript(`
                kai.state.actionChart.combatSkill = 30;
                kai.state.actionChart.endurance = 35;
                kai.state.actionChart.currentEndurance = 30;
                kai.state.actionChart.setDisciplines(["${GndDiscipline.GrandWeaponmastery}", "${GndDiscipline.Deliverance}"], ${BookSeriesId.GrandMaster});
            `);
            await driver.executeScript(`kai.actionChartController.pick("meal")`);

            // Transition to Book 21
            await goToNextBook();

            const currentBook = await driver.executeScript("return kai.state.book.bookNumber") as number;
            expect(currentBook).toBe(21);

            // Should have a fresh ActionChart
            const combatSkill = await driver.getCombatSkill();
            const endurance = await driver.executeScript("return kai.state.actionChart.endurance") as number;
            const disciplines = await driver.executeScript("return kai.state.actionChart.getDisciplines()") as string[];
            const backpackItems = await driver.executeScript("return kai.state.actionChart.backpackItems.length") as number;

            expect(combatSkill).toBe(0); // Not yet set
            expect(endurance).toBe(0);   // Not yet set
            expect(disciplines.length).toBe(0);
            expect(backpackItems).toBe(0);
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

            // Simulate having used the 20 EP restore
            await driver.executeScript(`kai.state.actionChart.use20EPRestore()`);

            const usedBefore = await driver.executeScript(
                `return kai.state.actionChart.restore20EPUsed`
            ) as boolean;
            expect(usedBefore).toBe(true);

            await goToNextBook();

            // The <restoreDeliveranceUse/> rule should reset the flag
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

            // Simulate having restored some EP via curing
            await driver.executeScript(`kai.state.actionChart.newOrderCuringEPRestored = 15`);

            const countBefore = await driver.executeScript(
                `return kai.state.actionChart.newOrderCuringEPRestored`
            ) as number;
            expect(countBefore).toBe(15);

            await goToNextBook();

            // The <resetNewOrderCuringEPRestoredUse/> rule should reset the counter
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

            // Set disciplines and then disable one
            await driver.executeScript(`
                kai.state.actionChart.setDisciplines(["${NewOrderDiscipline.GrandWeaponmastery}", "${NewOrderDiscipline.Deliverance}", "${NewOrderDiscipline.GrandHuntmastery}", "${NewOrderDiscipline.Assimilance}", "${NewOrderDiscipline.AnimalMastery}"], ${BookSeriesId.NewOrder});
                kai.state.actionChart.disableDiscipline(2);
            `);

            const disabledBefore = await driver.executeScript(
                `return kai.state.actionChart.newOrderDisciplines.disabledDisciplines`
            ) as string[];
            expect(disabledBefore.length).toBeGreaterThan(0);

            await goToNextBook();

            // The <resetNewOrderDisabledDisciplines/> rule should clear the list
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

            // Add a non-allowed special item (not in ALLOWED_GRAND_MASTER)
            await driver.executeScript(`
                kai.actionChartController.pick("lamp")`);

            const hasItemBefore = await driver.executeScript(
                `return kai.state.actionChart.specialItems.some(i => i.id === "lamp")`
            ) as boolean;
            expect(hasItemBefore).toBe(true);

            await goToNextBook();

            // Book 13's <removeSpecialGrandMaster/> rule should drop it
            const hasItemAfter = await driver.executeScript(
                `return kai.state.actionChart.specialItems.some(i => i.id === "lamp")`
            ) as boolean;
            expect(hasItemAfter).toBe(false);
        });

        test("Allowed special items are kept", async () => {
            await driver.setupBookState(12);

            // Add an allowed special item (Sommerswerd is in ALLOWED_GRAND_MASTER)
            await driver.executeScript(`kai.actionChartController.pick("sommerswerd")`);

            const hasItemBefore = await driver.executeScript(
                `return kai.state.actionChart.specialItems.some(i => i.id === "sommerswerd")`
            ) as boolean;
            expect(hasItemBefore).toBe(true);

            await goToNextBook();

            // Allowed items should remain
            const hasItemAfter = await driver.executeScript(
                `return kai.state.actionChart.specialItems.some(i => i.id === "sommerswerd")`
            ) as boolean;
            expect(hasItemAfter).toBe(true);
        });
    });

});
