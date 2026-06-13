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
                let childRan = false;
                const orig = kai.mechanicsEngine.message;
                kai.mechanicsEngine.message = function(rule) { childRan = true; return orig.call(this, rule); };
                const rule = document.createElement("test");
                rule.setAttribute("hasDiscipline", "healing");
                const child = document.createElement("message");
                child.setAttribute("text", "test-passed");
                rule.appendChild(child);
                kai.mechanicsEngine.test(rule);
                return childRan;
            `) as boolean;
            expect(result).toBe(true);
        });

        test("hasDiscipline false skips children", async () => {
            await driver.setupBookState(1);
            await driver.setDisciplines([]);
            const result = await driver.executeScript(`
                let childRan = false;
                const orig = kai.mechanicsEngine.message;
                kai.mechanicsEngine.message = function(rule) { childRan = true; return orig.call(this, rule); };
                const rule = document.createElement("test");
                rule.setAttribute("hasDiscipline", "mindblast");
                const child = document.createElement("message");
                child.setAttribute("text", "test-passed");
                rule.appendChild(child);
                kai.mechanicsEngine.test(rule);
                return childRan;
            `) as boolean;
            expect(result).toBe(false);
        });

        test("not=true inverts condition", async () => {
            await driver.setupBookState(1);
            await driver.setDisciplines([KaiDiscipline.Healing]);
            const result = await driver.executeScript(`
                let childRan = false;
                const orig = kai.mechanicsEngine.message;
                kai.mechanicsEngine.message = function(rule) { childRan = true; return orig.call(this, rule); };
                const rule = document.createElement("test");
                rule.setAttribute("hasDiscipline", "healing");
                rule.setAttribute("not", "true");
                const child = document.createElement("message");
                child.setAttribute("text", "test-passed");
                rule.appendChild(child);
                kai.mechanicsEngine.test(rule);
                return childRan;
            `) as boolean;
            expect(result).toBe(false);
        });
    });

    describe("test rule - object", () => {

        test("hasObject true runs children", async () => {
            await driver.setupBookState(1);
            await driver.pick("map");
            const result = await driver.executeScript(`
                let childRan = false;
                const orig = kai.mechanicsEngine.message;
                kai.mechanicsEngine.message = function(rule) { childRan = true; return orig.call(this, rule); };
                const rule = document.createElement("test");
                rule.setAttribute("hasObject", "map");
                const child = document.createElement("message");
                child.setAttribute("text", "test-passed");
                rule.appendChild(child);
                kai.mechanicsEngine.test(rule);
                return childRan;
            `) as boolean;
            expect(result).toBe(true);
        });

        test("hasObject false skips children", async () => {
            await driver.setupBookState(1);
            const result = await driver.executeScript(`
                let childRan = false;
                const orig = kai.mechanicsEngine.message;
                kai.mechanicsEngine.message = function(rule) { childRan = true; return orig.call(this, rule); };
                const rule = document.createElement("test");
                rule.setAttribute("hasObject", "map");
                const child = document.createElement("message");
                child.setAttribute("text", "test-passed");
                rule.appendChild(child);
                kai.mechanicsEngine.test(rule);
                return childRan;
            `) as boolean;
            expect(result).toBe(false);
        });
    });

    describe("test rule - expression", () => {

        test("expression true runs children", async () => {
            await driver.setupBookState(1);
            await driver.setEndurance(15);
            const result = await driver.executeScript(`
                let childRan = false;
                const orig = kai.mechanicsEngine.message;
                kai.mechanicsEngine.message = function(rule) { childRan = true; return orig.call(this, rule); };
                const rule = document.createElement("test");
                rule.setAttribute("expression", "[ENDURANCE] > 10");
                const child = document.createElement("message");
                child.setAttribute("text", "test-passed");
                rule.appendChild(child);
                kai.mechanicsEngine.test(rule);
                return childRan;
            `) as boolean;
            expect(result).toBe(true);
        });

        test("expression false skips children", async () => {
            await driver.setupBookState(1);
            await driver.setEndurance(3);
            const result = await driver.executeScript(`
                let childRan = false;
                const orig = kai.mechanicsEngine.message;
                kai.mechanicsEngine.message = function(rule) { childRan = true; return orig.call(this, rule); };
                const rule = document.createElement("test");
                rule.setAttribute("expression", "[ENDURANCE] > 10");
                const child = document.createElement("message");
                child.setAttribute("text", "test-passed");
                rule.appendChild(child);
                kai.mechanicsEngine.test(rule);
                return childRan;
            `) as boolean;
            expect(result).toBe(false);
        });
    });

    describe("test rule - sectionVisited", () => {

        test("sectionVisited true runs children", async () => {
            await driver.setupBookState(1);
            const result = await driver.executeScript(`
                kai.state.sectionStates.getSectionState("sect1");
                let childRan = false;
                const orig = kai.mechanicsEngine.message;
                kai.mechanicsEngine.message = function(rule) { childRan = true; return orig.call(this, rule); };
                const rule = document.createElement("test");
                rule.setAttribute("sectionVisited", "sect1");
                const child = document.createElement("message");
                child.setAttribute("text", "test-passed");
                rule.appendChild(child);
                kai.mechanicsEngine.test(rule);
                return childRan;
            `) as boolean;
            expect(result).toBe(true);
        });

        test("sectionVisited false skips children", async () => {
            await driver.setupBookState(1);
            const result = await driver.executeScript(`
                let childRan = false;
                const orig = kai.mechanicsEngine.message;
                kai.mechanicsEngine.message = function(rule) { childRan = true; return orig.call(this, rule); };
                const rule = document.createElement("test");
                rule.setAttribute("sectionVisited", "fakeSection999");
                const child = document.createElement("message");
                child.setAttribute("text", "test-passed");
                rule.appendChild(child);
                kai.mechanicsEngine.test(rule);
                return childRan;
            `) as boolean;
            expect(result).toBe(false);
        });
    });

    describe("test rule - tag", () => {

        test("hasTag true runs children", async () => {
            await driver.setupBookState(1);
            const result = await driver.executeScript(`
                kai.state.actionChart.tags.push("testTag");
                let childRan = false;
                const orig = kai.mechanicsEngine.message;
                kai.mechanicsEngine.message = function(rule) { childRan = true; return orig.call(this, rule); };
                const rule = document.createElement("test");
                rule.setAttribute("hasTag", "testTag");
                const child = document.createElement("message");
                child.setAttribute("text", "test-passed");
                rule.appendChild(child);
                kai.mechanicsEngine.test(rule);
                return childRan;
            `) as boolean;
            expect(result).toBe(true);
        });

        test("hasTag false skips children", async () => {
            await driver.setupBookState(1);
            const result = await driver.executeScript(`
                let childRan = false;
                const orig = kai.mechanicsEngine.message;
                kai.mechanicsEngine.message = function(rule) { childRan = true; return orig.call(this, rule); };
                const rule = document.createElement("test");
                rule.setAttribute("hasTag", "nonExistentTag");
                const child = document.createElement("message");
                child.setAttribute("text", "test-passed");
                rule.appendChild(child);
                kai.mechanicsEngine.test(rule);
                return childRan;
            `) as boolean;
            expect(result).toBe(false);
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
            const meals = await driver.executeScript(
                "return kai.state.actionChart.meals"
            ) as number;
            expect(meals).toBeGreaterThan(0);
        });

        test("pick with count adds multiple", async () => {
            await driver.setupBookState(1);
            await driver.executeScript(`
                const rule = document.createElement("pick");
                rule.setAttribute("class", "meal");
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
            const mealsBefore = await driver.executeScript(
                "return kai.state.actionChart.meals"
            ) as number;
            expect(mealsBefore).toBeGreaterThan(0);

            await driver.executeScript(`
                const rule = document.createElement("drop");
                rule.setAttribute("objectId", "meal");
                kai.mechanicsEngine.drop(rule);
            `);
            const mealsAfter = await driver.executeScript(
                "return kai.state.actionChart.meals"
            ) as number;
            expect(mealsAfter).toBe(0);
        });
    });

    describe("message rule", () => {

        test("message displays in section", async () => {
            await driver.setupBookState(1);
            await driver.executeScript(`
                const rule = document.createElement("message");
                rule.setAttribute("text", "Hello test");
                kai.mechanicsEngine.message(rule);
            `);
            const html = await driver.getTextByCss("#game-section");
            expect(html).toContain("Hello test");
        });
    });
});
