/**
 * @jest-environment jsdom
 */

import { state, Color, TextSize, Font } from "../../state";

describe("State settings persistence", () => {

    beforeEach(() => {
        localStorage.clear();
        // Reset state to known defaults before each test
        state.color = Color.Light;
        state.textSize = TextSize.Normal;
        state.font = Font.SansSerif;
    });

    describe("setupDefaultColorTheme", () => {
        test("defaults to Light when nothing stored", () => {
            state.setupDefaultColorTheme();
            expect(state.color).toBe(Color.Light);
        });

        test("restores Dark from localStorage", () => {
            localStorage.setItem("color", "Dark");
            state.setupDefaultColorTheme();
            expect(state.color).toBe(Color.Dark);
        });

        test("restores Light from localStorage", () => {
            localStorage.setItem("color", "Light");
            state.setupDefaultColorTheme();
            expect(state.color).toBe(Color.Light);
        });

        test("defaults to Light on invalid stored value", () => {
            localStorage.setItem("color", "invalid");
            state.setupDefaultColorTheme();
            expect(state.color).toBe(Color.Light);
        });
    });

    describe("setupDefaultTextSize", () => {
        test("defaults to Normal when nothing stored", () => {
            state.setupDefaultTextSize();
            expect(state.textSize).toBe(TextSize.Normal);
        });

        test("restores Large from localStorage", () => {
            localStorage.setItem("textSize", "Large");
            state.setupDefaultTextSize();
            expect(state.textSize).toBe(TextSize.Large);
        });

        test("defaults to Normal on invalid stored value", () => {
            localStorage.setItem("textSize", "invalid");
            state.setupDefaultTextSize();
            expect(state.textSize).toBe(TextSize.Normal);
        });
    });

    describe("setupDefaultFont", () => {
        test("defaults to SansSerif when nothing stored", () => {
            state.setupDefaultFont();
            expect(state.font).toBe(Font.SansSerif);
        });

        test("restores Serif from localStorage", () => {
            localStorage.setItem("font", "Serif");
            state.setupDefaultFont();
            expect(state.font).toBe(Font.Serif);
        });

        test("restores SansSerif from localStorage", () => {
            localStorage.setItem("font", "SansSerif");
            state.setupDefaultFont();
            expect(state.font).toBe(Font.SansSerif);
        });
    });

    describe("updateColorTheme", () => {
        test("persists Dark to localStorage", () => {
            state.updateColorTheme(Color.Dark);
            expect(localStorage.getItem("color")).toBe("Dark");
            expect(state.color).toBe(Color.Dark);
        });

        test("persists Light to localStorage", () => {
            state.updateColorTheme(Color.Light);
            expect(localStorage.getItem("color")).toBe("Light");
            expect(state.color).toBe(Color.Light);
        });
    });

    describe("updateTextSize", () => {
        test("persists Large to localStorage", () => {
            state.updateTextSize(TextSize.Large);
            expect(localStorage.getItem("textSize")).toBe("Large");
            expect(state.textSize).toBe(TextSize.Large);
        });

        test("persists Normal to localStorage", () => {
            state.updateTextSize(TextSize.Normal);
            expect(localStorage.getItem("textSize")).toBe("Normal");
            expect(state.textSize).toBe(TextSize.Normal);
        });
    });

    describe("updateFont", () => {
        test("persists Serif to localStorage", () => {
            state.updateFont(Font.Serif);
            expect(localStorage.getItem("font")).toBe("Serif");
            expect(state.font).toBe(Font.Serif);
        });

        test("persists SansSerif to localStorage", () => {
            state.updateFont(Font.SansSerif);
            expect(localStorage.getItem("font")).toBe("SansSerif");
            expect(state.font).toBe(Font.SansSerif);
        });
    });
});
