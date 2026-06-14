/**
 * @jest-environment jsdom
 */

import $ from "jquery";
(globalThis as any).$ = $;
(globalThis as any).jQuery = $;

import { template } from "../../template";
import { state } from "../../state";
import { BookSeriesId } from "../../model/bookSeries";
import { BookSectionStates } from "../../model/bookSectionStates";

describe("Hunting Indicator", () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="achart-hunting-row" style="display:none"></div>
            <div id="achart-hunting-available" style="display:none"></div>
            <div id="achart-hunting-unavailable" style="display:none"></div>
        `;

        // Reset state to minimal valid objects
        (state as any).sectionStates = new BookSectionStates();
        state.sectionStates.currentSection = "sect1";
        state.sectionStates.huntEnabled = true;
    });

    afterEach(() => {
        (state as any).sectionStates = null;
        (state as any).mechanics = null;
        (state as any).book = null;
        (state as any).actionChart = null;
    });

    function mockSection(mealXml: string) {
        const $section = $(`<section id="sect1">${mealXml}</section>`);
        (state as any).mechanics = {
            getSection: () => $section
        };
    }

    function mockBookSeries(seriesId: BookSeriesId) {
        (state as any).book = {
            getBookSeries: () => ({ id: seriesId })
        };
    }

    function mockActionChart(hasHunting: boolean) {
        (state as any).actionChart = {
            hasKaiDiscipline: () => hasHunting,
            hasMgnDiscipline: () => false,
            hasGndDiscipline: () => false,
            hasNewOrderDiscipline: () => false,
        };
    }

    describe("early returns", () => {
        test("hides row when sectionStates is null", () => {
            (state as any).sectionStates = null;
            template.updateHuntingIndicator();
            expect($("#achart-hunting-row").css("display")).toBe("none");
        });

        test("hides row when currentSection is null", () => {
            state.sectionStates.currentSection = null;
            template.updateHuntingIndicator();
            expect($("#achart-hunting-row").css("display")).toBe("none");
        });

        test("hides row when mechanics is null", () => {
            (state as any).mechanics = null;
            template.updateHuntingIndicator();
            expect($("#achart-hunting-row").css("display")).toBe("none");
        });

        test("hides row when section has no meal rule", () => {
            mockSection(""); // no meal tag
            template.updateHuntingIndicator();
            expect($("#achart-hunting-row").css("display")).toBe("none");
        });
    });

    describe("with meal rule present", () => {
        beforeEach(() => {
            mockBookSeries(BookSeriesId.Kai);
            mockActionChart(true);
            mockSection("<meal></meal>");
        });

        test("shows row when meal rule exists", () => {
            template.updateHuntingIndicator();
            expect($("#achart-hunting-row").css("display")).not.toBe("none");
        });

        test("shows available when hunting discipline present and enabled", () => {
            template.updateHuntingIndicator();
            expect($("#achart-hunting-available").css("display")).not.toBe("none");
            expect($("#achart-hunting-unavailable").css("display")).toBe("none");
        });

        test("shows unavailable when huntEnabled is false", () => {
            state.sectionStates.huntEnabled = false;
            template.updateHuntingIndicator();
            expect($("#achart-hunting-available").css("display")).toBe("none");
            expect($("#achart-hunting-unavailable").css("display")).not.toBe("none");
        });

        test("shows unavailable when huntDisabled attr is true", () => {
            mockSection('<meal huntDisabled="true"></meal>');
            template.updateHuntingIndicator();
            expect($("#achart-hunting-available").css("display")).toBe("none");
            expect($("#achart-hunting-unavailable").css("display")).not.toBe("none");
        });

        test("shows unavailable when no hunting discipline", () => {
            mockActionChart(false);
            template.updateHuntingIndicator();
            expect($("#achart-hunting-available").css("display")).toBe("none");
            expect($("#achart-hunting-unavailable").css("display")).not.toBe("none");
        });
    });

    describe("New Order series discipline check", () => {
        test("checks GrandHuntmastery for New Order", () => {
            mockBookSeries(BookSeriesId.NewOrder);
            mockSection("<meal></meal>");

            (state as any).actionChart = {
                hasNewOrderDiscipline: (d: string) => d === "hntmstry",
                hasKaiDiscipline: () => false,
                hasMgnDiscipline: () => false,
                hasGndDiscipline: () => false,
            };

            template.updateHuntingIndicator();
            expect($("#achart-hunting-available").css("display")).not.toBe("none");
        });
    });
});
