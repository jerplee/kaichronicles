/**
 * @jest-environment jsdom
 */

import { ExpressionEvaluator } from "../../model/expressionEvaluator";

describe("ExpressionEvaluator unit tests", () => {

    describe("getKeywords", () => {
        test("extracts single keyword", () => {
            const keywords = ExpressionEvaluator.getKeywords("[ENDURANCE] > 5");
            expect(keywords).toEqual(["[ENDURANCE]"]);
        });

        test("extracts multiple keywords", () => {
            const keywords = ExpressionEvaluator.getKeywords("[MONEY] + [CROWNS]");
            expect(keywords).toEqual(["[MONEY]", "[CROWNS]"]);
        });

        test("returns empty for no keywords", () => {
            const keywords = ExpressionEvaluator.getKeywords("no keywords here");
            expect(keywords).toEqual([]);
        });

        test("deduplicates repeated keywords", () => {
            const keywords = ExpressionEvaluator.getKeywords("[RANDOM] + [RANDOM]");
            expect(keywords).toEqual(["[RANDOM]"]);
        });

        test("handles empty string", () => {
            const keywords = ExpressionEvaluator.getKeywords("");
            expect(keywords).toEqual([]);
        });
    });

    describe("isValidKeyword", () => {
        test("valid keywords return true", () => {
            const valid = ["[ENDURANCE]", "[MONEY]", "[RANDOM]", "[MAXENDURANCE]", "[COMBATRANDOM]"]
                .map(k => ExpressionEvaluator.isValidKeyword(k));
            expect(valid.every(v => v === true)).toBe(true);
        });

        test("invalid keyword returns false", () => {
            expect(ExpressionEvaluator.isValidKeyword("[FAKE]")).toBe(false);
        });

        test("empty string returns false", () => {
            expect(ExpressionEvaluator.isValidKeyword("")).toBe(false);
        });
    });

    describe("evalInteger edge cases", () => {
        test("empty expression returns null", () => {
            const result = ExpressionEvaluator.evalInteger("");
            expect(result).toBeNull();
        });

        test("undefined expression returns null", () => {
            const result = ExpressionEvaluator.evalInteger(undefined);
            expect(result).toBeNull();
        });
    });

    describe("evalFloat edge cases", () => {
        test("empty expression returns null", () => {
            const result = ExpressionEvaluator.evalFloat("");
            expect(result).toBeNull();
        });

        test("undefined expression returns null", () => {
            const result = ExpressionEvaluator.evalFloat(undefined);
            expect(result).toBeNull();
        });
    });

});
