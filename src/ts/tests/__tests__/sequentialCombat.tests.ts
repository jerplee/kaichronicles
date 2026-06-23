import { GameDriver } from "../gameDriver";

// Selenium web driver
const driver: GameDriver = new GameDriver();

GameDriver.globalSetup();

jest.setTimeout(40000);

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

describe("sequential combat on same section", () => {

    test("only first combat is active initially; second is queued", async () => {
        await driver.setupBookState(1);
        await driver.setEndurance(20);
        await driver.goToSection("sect136");

        const combatCount = await driver.executeScript(
            "return kai.state.sectionStates.getSectionState().combats.length"
        ) as number;
        expect(combatCount).toBe(2);

        // First combat active, second queued
        expect(await driver.isCombatQueued(0)).toBe(false);
        expect(await driver.isCombatFinished(0)).toBe(false);
        expect(await driver.isCombatQueued(1)).toBe(true);
        expect(await driver.isCombatFinished(1)).toBe(false);
    });

    test("endurance carries over and second combat activates after first finishes", async () => {
        await driver.setupBookState(1);
        await driver.setEndurance(20);
        await driver.goToSection("sect136");

        // Simulate first combat finished with 5 EP lost
        await driver.executeScript(`
            const sectionState = kai.state.sectionStates.getSectionState();
            const combat1 = sectionState.combats[0];
            combat1.endurance = 0;
            combat1.combatFinished = true;
            kai.state.actionChart.currentEndurance = 15;
            kai.CombatMechanics.renderCombats();
        `);

        // First combat finished, second now active
        expect(await driver.isCombatFinished(0)).toBe(true);
        expect(await driver.isCombatQueued(1)).toBe(false);
        expect(await driver.isCombatFinished(1)).toBe(false);

        // Second combat's originalPlayerEndurance should reflect carried-over EP
        const originalEP = await driver.executeScript(
            "return kai.state.sectionStates.getSectionState().combats[1].originalPlayerEndurance"
        ) as number;
        expect(originalEP).toBe(15);

        // Player current endurance should also be 15
        const currentEP = await driver.getCurrentEndurance();
        expect(currentEP).toBe(15);
    });

    test("originalPlayerEndurance updates for unstarted combat on re-render", async () => {
        await driver.setupBookState(1);
        await driver.setEndurance(20);
        await driver.goToSection("sect136");

        // Lose some endurance before any combat starts
        await driver.executeScript(`
            kai.state.actionChart.currentEndurance = 12;
            kai.CombatMechanics.renderCombats();
        `);

        const originalEP = await driver.executeScript(
            "return kai.state.sectionStates.getSectionState().combats[1].originalPlayerEndurance"
        ) as number;
        expect(originalEP).toBe(12);
    });

});
