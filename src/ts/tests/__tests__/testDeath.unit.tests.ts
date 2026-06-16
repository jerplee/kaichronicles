/**
 * @jest-environment jsdom
 */

import $ from "jquery";
(globalThis as any).$ = $;
(globalThis as any).jQuery = $;

import { mechanicsEngine } from "../../controller/mechanics/mechanicsEngine";
import { numberPickerMechanics } from "../../controller/mechanics/numberPickerMechanics";
import { state } from "../../state";
import { BookSectionStates } from "../../model/bookSectionStates";
import { BookSeriesId } from "../../model/bookSeries";

describe("testDeath edge cases", () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="game-section">
                <div class="choice"></div>
            </div>
        `;

        // Mock mechanics UI template with death UI
        mechanicsEngine.$mechanicsUI = $(`
            <div>
                <div id="mechanics-death">
                    <button id="mechanics-restart">Restart</button>
                </div>
            </div>
        `);

        // Mock state
        (state as any).book = {
            bookNumber: 1,
            getBookSeries: () => ({ id: BookSeriesId.Kai }),
            getSectionXml: (id: string) => $(`<section class="numbered" id="${id}"></section>`),
        };
        (state as any).mechanics = {
            getSection: () => null,
        };
        (state as any).sectionStates = new BookSectionStates();
        state.sectionStates.currentSection = "sect100";

        // Spy on methods that modify global state or UI
        jest.spyOn(mechanicsEngine, "setChoiceState").mockImplementation(() => {});
        jest.spyOn(numberPickerMechanics, "disable").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
        document.body.innerHTML = "";
    });

    const deathCases = [
        { endurance: 0, description: "zero" },
        { endurance: -1, description: "negative" },
        { endurance: null as any, description: "null" },
        { endurance: undefined as any, description: "undefined" },
        { endurance: NaN, description: "NaN" },
    ];

    test.each(deathCases)("triggers death UI when endurance is $description", ({ endurance }) => {
        (state as any).actionChart = { currentEndurance: endurance };

        mechanicsEngine.testDeath();

        // Death UI should have been appended to the game section
        expect($("#game-section").html()).toContain("mechanics-death");
    });

    test("does not trigger death UI when endurance is positive", () => {
        (state as any).actionChart = { currentEndurance: 5 };

        mechanicsEngine.testDeath();

        expect($("#game-section").html()).not.toContain("mechanics-death");
    });
});
