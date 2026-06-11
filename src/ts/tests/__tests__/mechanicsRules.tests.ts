import { GameDriver } from "../gameDriver";
import { KaiDiscipline } from "../../model/disciplinesDefinitions";

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
    await driver.cleanLog();
});

describe("mechanicsEngine rule dispatch", () => {

    describe("runRule", () => {

        test("unknown rule logs warning without error", async () => {
            await driver.setupBookState(1);
            await driver.executeScript(`
                const fakeRule = document.createElement("fakeRule");
                kai.mechanicsEngine.runRule(fakeRule);
            `);
            const warnings = await driver.getLogWarnings();
            expect(warnings.some(w => w.includes("Unknown rule"))).toBe(true);
        });
    });

    describe("test rule - discipline", () => {

        test("hasDiscipline true runs children", async () => {
            await driver.setupBookState(1);
            await driver.setDisciplines([KaiDiscipline.Healing]);
            const result = await driver.executeScript(`
                const rule = document.createElement("test");
                rule.setAttribute("hasDiscipline", "healing");
                const child = document.createElement("message");
                child.setAttribute("text", "test-passed");
                rule.appendChild(child);
                kai.mechanicsEngine.test(rule);
                return kai.mechanicsEngine.messageQueue.length;
            `) as number;
            expect(result).toBeGreaterThan(0);
        });

        test("hasDiscipline false skips children", async () => {
            await driver.setupBookState(1);
            await driver.setDisciplines([]);
            const result = await driver.executeScript(`
                kai.mechanicsEngine.messageQueue = [];
                const rule = document.createElement("test");
                rule.setAttribute("hasDiscipline", "mindblast");
                const child = document.createElement("message");
                child.setAttribute("text", "test-passed");
                rule.appendChild(child);
                kai.mechanicsEngine.test(rule);
                return kai.mechanicsEngine.messageQueue.length;
            `) as number;
            expect(result).toBe(0);
        });

        test("not=true inverts condition", async () => {
            await driver.setupBookState(1);
            await driver.setDisciplines([KaiDiscipline.Healing]);
            const result = await driver.executeScript(`
                kai.mechanicsEngine.messageQueue = [];
                const rule = document.createElement("test");
                rule.setAttribute("hasDiscipline", "healing");
                rule.setAttribute("not", "true");
                const child = document.createElement("message");
                child.setAttribute("text", "test-passed");
                rule.appendChild(child);
                kai.mechanicsEngine.test(rule);
                return kai.mechanicsEngine.messageQueue.length;
            `) as number;
            expect(result).toBe(0);
        });
    });

    describe("test rule - object", () => {

        test("hasObject true runs children", async () => {
            await driver.setupBookState(1);
            await driver.pick("meal");
            const result = await driver.executeScript(`
                kai.mechanicsEngine.messageQueue = [];
                const rule = document.createElement("test");
                rule.setAttribute("hasObject", "meal");
                const child = document.createElement("message");
                child.setAttribute("text", "test-passed");
                rule.appendChild(child);
                kai.mechanicsEngine.test(rule);
                return kai.mechanicsEngine.messageQueue.length;
            `) as number;
            expect(result).toBeGreaterThan(0);
        });

        test("hasObject false skips children", async () => {
            await driver.setupBookState(1);
            const result = await driver.executeScript(`
                kai.mechanicsEngine.messageQueue = [];
                const rule = document.createElement("test");
                rule.setAttribute("hasObject", "map");
                const child = document.createElement("message");
                child.setAttribute("text", "test-passed");
                rule.appendChild(child);
                kai.mechanicsEngine.test(rule);
                return kai.mechanicsEngine.messageQueue.length;
            `) as number;
            expect(result).toBe(0);
        });
    });

    describe("test rule - expression", () => {

        test("expression true runs children", async () => {
            await driver.setupBookState(1);
            await driver.setEndurance(15);
            const result = await driver.executeScript(`
                kai.mechanicsEngine.messageQueue = [];
                const rule = document.createElement("test");
                rule.setAttribute("expression", "[ENDURANCE] > 10");
                const child = document.createElement("message");
                child.setAttribute("text", "test-passed");
                rule.appendChild(child);
                kai.mechanicsEngine.test(rule);
                return kai.mechanicsEngine.messageQueue.length;
            `) as number;
            expect(result).toBeGreaterThan(0);
        });

        test("expression false skips children", async () => {
            await driver.setupBookState(1);
            await driver.setEndurance(3);
            const result = await driver.executeScript(`
                kai.mechanicsEngine.messageQueue = [];
                const rule = document.createElement("test");
                rule.setAttribute("expression", "[ENDURANCE] < 5");
                const child = document.createElement("message");
                child.setAttribute("text", "test-passed");
                rule.appendChild(child);
                kai.mechanicsEngine.test(rule);
                return kai.mechanicsEngine.messageQueue.length;
            `) as number;
            expect(result).toBe(0);
        });
    });

    describe("test rule - sectionVisited", () => {

        test("sectionVisited true runs children", async () => {
            await driver.setupBookState(1);
            const result = await driver.executeScript(`
                kai.state.sectionStates.setSectionAsVisited("sect1");
                kai.mechanicsEngine.messageQueue = [];
                const rule = document.createElement("test");
                rule.setAttribute("sectionVisited", "sect1");
                const child = document.createElement("message");
                child.setAttribute("text", "test-passed");
                rule.appendChild(child);
                kai.mechanicsEngine.test(rule);
                return kai.mechanicsEngine.messageQueue.length;
            `) as number;
            expect(result).toBeGreaterThan(0);
        });

        test("sectionVisited false skips children", async () => {
            await driver.setupBookState(1);
            const result = await driver.executeScript(`
                kai.mechanicsEngine.messageQueue = [];
                const rule = document.createElement("test");
                rule.setAttribute("sectionVisited", "fakeSection999");
                const child = document.createElement("message");
                child.setAttribute("text", "test-passed");
                rule.appendChild(child);
                kai.mechanicsEngine.test(rule);
                return kai.mechanicsEngine.messageQueue.length;
            `) as number;
            expect(result).toBe(0);
        });
    });

    describe("test rule - tag", () => {

        test("hasTag true runs children", async () => {
            await driver.setupBookState(1);
            const result = await driver.executeScript(`
                kai.state.actionChart.tags.push("testTag");
                kai.mechanicsEngine.messageQueue = [];
                const rule = document.createElement("test");
                rule.setAttribute("hasTag", "testTag");
                const child = document.createElement("message");
                child.setAttribute("text", "test-passed");
                rule.appendChild(child);
                kai.mechanicsEngine.test(rule);
                return kai.mechanicsEngine.messageQueue.length;
            `) as number;
            expect(result).toBeGreaterThan(0);
        });

        test("hasTag false skips children", async () => {
            await driver.setupBookState(1);
            const result = await driver.executeScript(`
                kai.mechanicsEngine.messageQueue = [];
                const rule = document.createElement("test");
                rule.setAttribute("hasTag", "nonExistentTag");
                const child = document.createElement("message");
                child.setAttribute("text", "test-passed");
                rule.appendChild(child);
                kai.mechanicsEngine.test(rule);
                return kai.mechanicsEngine.messageQueue.length;
            `) as number;
            expect(result).toBe(0);
        });
    });

    describe("pick rule", () => {

        test("pick adds object to action chart", async () => {
            await driver.setupBookState(1);
            await driver.executeScript(`
                const rule = document.createElement("pick");
                rule.setAttribute("objectId", "meal");
                kai.mechanicsEngine.pick(rule);
            `);
            const hasMeal = await driver.hasObject("meal");
            expect(hasMeal).toBe(true);
        });

        test("pick with count adds multiple", async () => {
            await driver.setupBookState(1);
            await driver.executeScript(`
                const rule = document.createElement("pick");
                rule.setAttribute("objectId", "meal");
                rule.setAttribute("count", "3");
                kai.mechanicsEngine.pick(rule);
            `);
            const meals = await driver.executeScript(
                "return kai.state.actionChart.meals"
            ) as number;
            expect(meals).toBe(3);
        });
    });

    describe("drop rule", () => {

        test("drop removes object from action chart", async () => {
            await driver.setupBookState(1);
            await driver.pick("meal");
            const hasBefore = await driver.hasObject("meal");
            expect(hasBefore).toBe(true);

            await driver.executeScript(`
                const rule = document.createElement("drop");
                rule.setAttribute("objectId", "meal");
                kai.mechanicsEngine.drop(rule);
            `);
            const hasAfter = await driver.hasObject("meal");
            expect(hasAfter).toBe(false);
        });
    });

    describe("message rule", () => {

        test("message adds to message queue", async () => {
            await driver.setupBookState(1);
            const result = await driver.executeScript(`
                kai.mechanicsEngine.messageQueue = [];
                const rule = document.createElement("message");
                rule.setAttribute("text", "Hello test");
                kai.mechanicsEngine.message(rule);
                return kai.mechanicsEngine.messageQueue.length;
            `) as number;
            expect(result).toBeGreaterThan(0);
        });
    });
});
