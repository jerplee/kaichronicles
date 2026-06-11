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
    await driver.cleanLog();
});

describe("expressionEvaluator", () => {

    describe("getKeywords", () => {

        test("extracts single keyword", async () => {
            const keywords = await driver.executeScript(
                'return kai.ExpressionEvaluator.getKeywords("[ENDURANCE] > 5")'
            ) as string[];
            expect(keywords).toEqual(["[ENDURANCE]"]);
        });

        test("extracts multiple keywords", async () => {
            const keywords = await driver.executeScript(
                'return kai.ExpressionEvaluator.getKeywords("[MONEY] + [CROWNS]")'
            ) as string[];
            expect(keywords).toEqual(["[MONEY]", "[CROWNS]"]);
        });

        test("returns empty for no keywords", async () => {
            const keywords = await driver.executeScript(
                'return kai.ExpressionEvaluator.getKeywords("no keywords here")'
            ) as string[];
            expect(keywords).toEqual([]);
        });

        test("deduplicates repeated keywords", async () => {
            const keywords = await driver.executeScript(
                'return kai.ExpressionEvaluator.getKeywords("[RANDOM] + [RANDOM]")'
            ) as string[];
            expect(keywords).toEqual(["[RANDOM]"]);
        });

        test("handles empty string", async () => {
            const keywords = await driver.executeScript(
                'return kai.ExpressionEvaluator.getKeywords("")'
            ) as string[];
            expect(keywords).toEqual([]);
        });
    });

    describe("isValidKeyword", () => {

        test("valid keywords return true", async () => {
            const valid = await driver.executeScript(
                'return ["[ENDURANCE]", "[MONEY]", "[RANDOM]", "[MAXENDURANCE]", "[COMBATRANDOM]"].map(k => kai.ExpressionEvaluator.isValidKeyword(k))'
            ) as boolean[];
            expect(valid.every(v => v === true)).toBe(true);
        });

        test("invalid keyword returns false", async () => {
            const valid = await driver.executeScript(
                'return kai.ExpressionEvaluator.isValidKeyword("[FAKE]")'
            ) as boolean;
            expect(valid).toBe(false);
        });

        test("empty string returns false", async () => {
            const valid = await driver.executeScript(
                'return kai.ExpressionEvaluator.isValidKeyword("")'
            ) as boolean;
            expect(valid).toBe(false);
        });
    });

    describe("evalBoolean", () => {

        test("true condition with ENDURANCE", async () => {
            await driver.setupBookState(1);
            await driver.setEndurance(10);
            const result = await driver.executeScript(
                'return kai.ExpressionEvaluator.evalBoolean("[ENDURANCE] > 5")'
            ) as boolean;
            expect(result).toBe(true);
        });

        test("false condition with ENDURANCE", async () => {
            await driver.setupBookState(1);
            await driver.setEndurance(3);
            const result = await driver.executeScript(
                'return kai.ExpressionEvaluator.evalBoolean("[ENDURANCE] > 5")'
            ) as boolean;
            expect(result).toBe(false);
        });

        test("equality with MONEY", async () => {
            await driver.setupBookState(1);
            await driver.increaseMoney(15);
            const result = await driver.executeScript(
                'return kai.ExpressionEvaluator.evalBoolean("[MONEY] >= 10")'
            ) as boolean;
            expect(result).toBe(true);
        });

        test("NOT operator", async () => {
            await driver.setupBookState(1);
            await driver.setEndurance(10);
            const result = await driver.executeScript(
                'return kai.ExpressionEvaluator.evalBoolean("![ENDURANCE] > 5")'
            ) as boolean;
            expect(result).toBe(false);
        });
    });

    describe("evalInteger", () => {

        test("MAXENDURANCE replacement", async () => {
            await driver.setupBookState(1);
            await driver.setMaxEndurance(25);
            await driver.setEndurance(25);
            const result = await driver.executeScript(
                'return kai.ExpressionEvaluator.evalInteger("+[MAXENDURANCE]")'
            ) as number;
            expect(result).toBe(25);
        });

        test("ENDURANCE arithmetic", async () => {
            await driver.setupBookState(1);
            await driver.setEndurance(10);
            const result = await driver.executeScript(
                'return kai.ExpressionEvaluator.evalInteger("[ENDURANCE] + 5")'
            ) as number;
            expect(result).toBe(15);
        });

        test("floor for float", async () => {
            await driver.setupBookState(1);
            await driver.setEndurance(10);
            const result = await driver.executeScript(
                'return kai.ExpressionEvaluator.evalInteger("[ENDURANCE] / 3")'
            ) as number;
            expect(result).toBe(3);
        });
    });

    describe("evalFloat", () => {

        test("returns float value", async () => {
            await driver.setupBookState(1);
            await driver.setEndurance(10);
            const result = await driver.executeScript(
                'return kai.ExpressionEvaluator.evalFloat("[ENDURANCE] / 3")'
            ) as number;
            expect(result).toBeCloseTo(3.33, 1);
        });
    });

    describe("edge cases", () => {

        test("unknown keyword returns 0 with warning", async () => {
            await driver.setupBookState(1);
            const result = await driver.executeScript(
                'return kai.ExpressionEvaluator.evalInteger("[FAKEKEYWORD] + 1")'
            ) as number;
            expect(result).toBe(1); // 0 + 1 = 1
        });

        test("empty expression returns null", async () => {
            await driver.setupBookState(1);
            const result = await driver.executeScript(
                'return kai.ExpressionEvaluator.evalInteger("")'
            ) as number|null;
            expect(result).toBeNull();
        });

        test("undefined expression returns null", async () => {
            await driver.setupBookState(1);
            const result = await driver.executeScript(
                'return kai.ExpressionEvaluator.evalInteger(undefined)'
            ) as number|null;
            expect(result).toBeNull();
        });
    });
});
