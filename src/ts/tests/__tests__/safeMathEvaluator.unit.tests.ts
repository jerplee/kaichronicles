/**
 * @jest-environment node
 */

import { safeMathEvaluate } from "../../model/safeMathEvaluator";

describe("safeMathEvaluate edge cases", () => {

    test("returns null for empty expression", () => {
        expect(safeMathEvaluate("")).toBeNull();
        expect(safeMathEvaluate("   ")).toBeNull();
    });

    test("basic arithmetic works", () => {
        expect(safeMathEvaluate("2 + 3")).toBe(5);
        expect(safeMathEvaluate("10 - 4")).toBe(6);
        expect(safeMathEvaluate("3 * 4")).toBe(12);
        expect(safeMathEvaluate("12 / 4")).toBe(3);
        expect(safeMathEvaluate("10 % 3")).toBe(1);
    });

    test("division by zero returns 0 instead of Infinity", () => {
        expect(safeMathEvaluate("5 / 0")).toBe(0);
        expect(safeMathEvaluate("0 / 0")).toBe(0);
    });

    test("modulo by zero returns 0 instead of NaN", () => {
        expect(safeMathEvaluate("5 % 0")).toBe(0);
        expect(safeMathEvaluate("0 % 0")).toBe(0);
    });

    test("comparisons work", () => {
        expect(safeMathEvaluate("5 > 3")).toBe(true);
        expect(safeMathEvaluate("3 >= 3")).toBe(true);
        expect(safeMathEvaluate("2 == 2")).toBe(true);
        expect(safeMathEvaluate("2 != 3")).toBe(true);
    });

    test("logical operators work", () => {
        expect(safeMathEvaluate("1 && 1")).toBe(1);
        expect(safeMathEvaluate("1 && 0")).toBe(0);
        expect(safeMathEvaluate("1 || 0")).toBe(1);
        expect(safeMathEvaluate("0 || 0")).toBe(0);
    });

    test("ternary operator works", () => {
        expect(safeMathEvaluate("1 ? 10 : 20")).toBe(10);
        expect(safeMathEvaluate("0 ? 10 : 20")).toBe(20);
    });

    test("Math.max and Math.min work", () => {
        expect(safeMathEvaluate("Math.max(3, 7, 2)")).toBe(7);
        expect(safeMathEvaluate("Math.min(3, 7, 2)")).toBe(2);
    });

    test("throws on invalid syntax", () => {
        expect(() => safeMathEvaluate("5 = 3")).toThrow();
        expect(() => safeMathEvaluate("5 ! 3")).toThrow();
        expect(() => safeMathEvaluate("5 & 3")).toThrow();
        expect(() => safeMathEvaluate("5 | 3")).toThrow();
        expect(() => safeMathEvaluate("unknownFunc()")).toThrow();
    });
});
