/**
 * @jest-environment jsdom
 */

import $ from "jquery";
(globalThis as any).$ = $;
(globalThis as any).jQuery = $;

import { mechanicsEngine } from "../../controller/mechanics/mechanicsEngine";
import { gameController } from "../../controller/gameController";
import { state } from "../../state";
import { gameView } from "../../views/gameView";
import { BookSectionStates } from "../../model/bookSectionStates";
import { BookSeriesId } from "../../model/bookSeries";
import { CombatMechanics } from "../../controller/mechanics/combatMechanics";

describe("goto exception regression", () => {

    let originalLoadSection: typeof gameController.loadSection;
    let originalMessage: typeof mechanicsEngine.message;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="game-section">
                <div class="choice"></div>
            </div>
            <div id="game-navSectionButtons"></div>
        `;

        // Mock state
        (state as any).book = {
            bookNumber: 1,
            getBookSeries: () => ({ id: BookSeriesId.Kai }),
            getBookTitle: () => "Test Book",
            getSectionXml: (id: string) => $(`<section class="numbered" id="${id}"></section>`),
        };
        (state as any).mechanics = {
            getSection: () => null,
            getLastSectionId: () => "sect200",
        };
        (state as any).sectionStates = new BookSectionStates();
        state.sectionStates.currentSection = "sect1";
        (state as any).actionChart = {
            currentEndurance: 20,
            hasKaiDiscipline: () => false,
            hasMgnDiscipline: () => false,
            hasGndDiscipline: () => false,
            hasNewOrderDiscipline: () => false,
            getMaxEndurance: () => 20,
            kaiName: "",
            yScrollPosition: 0,
        };

        // Mock gameController.loadSection to simulate section change without full navigation
        originalLoadSection = gameController.loadSection;
        gameController.loadSection = (sectionId: string) => {
            state.sectionStates.currentSection = sectionId;
        };

        // Spy on message to detect sibling rule execution
        originalMessage = mechanicsEngine.message;

        // Mock gameView methods to avoid DOM errors during run()
        jest.spyOn(gameView, "enableNextLink").mockImplementation(() => {});
        jest.spyOn(gameView, "enablePreviousLink").mockImplementation(() => {});
        jest.spyOn(gameView, "setSectionContent").mockImplementation(() => {});
        jest.spyOn(gameView, "updateNavigation").mockImplementation(() => {});
        jest.spyOn(gameView, "bindChoiceLinks").mockImplementation(() => {});
        jest.spyOn(gameView, "bindIllustrationZoom").mockImplementation(() => {});
        jest.spyOn(CombatMechanics, "renderCombats").mockImplementation(() => {});
    });

    afterEach(() => {
        gameController.loadSection = originalLoadSection;
        mechanicsEngine.message = originalMessage;
        jest.restoreAllMocks();
        document.body.innerHTML = "";
    });

    test("runChildRules stops siblings after goto", () => {
        // Use createElementNS to preserve camelCase nodeName (like XML)
        const parent = document.createElementNS(null, "section");
        const gotoRule = document.createElementNS(null, "goToSection");
        gotoRule.setAttribute("section", "sect99");
        const msgRule = document.createElementNS(null, "message");
        msgRule.setAttribute("text", "should-not-appear");
        parent.appendChild(gotoRule);
        parent.appendChild(msgRule);

        let siblingRan = false;
        mechanicsEngine.message = function(rule: Element) {
            siblingRan = true;
            return originalMessage.call(this, rule);
        };

        // Current behavior: throws string. After refactor: no throw.
        // Either way, sibling should NOT run.
        let threw = false;
        let thrownValue: any = null;
        try {
            mechanicsEngine.runChildRules($(parent));
        } catch (e) {
            threw = true;
            thrownValue = e;
        }

        expect(siblingRan).toBe(false);
        // After Phase 1 refactor, this should be false (no throw):
        if (threw) {
            expect(mechanicsEngine.isGotoException(thrownValue)).toBe(true);
        }
    });

    test("run post-rule work continues after goto (current behavior)", () => {
        // CURRENT BEHAVIOR: runSectionRules catches the goto internally and returns
        // normally, so run() continues to fireInventoryEvents. This will change
        // after Phase 1 refactor.
        const section = {
            sectionId: "sect1",
            hasNavigation: () => false,
            getTitleText: () => "Test",
            getHtml: () => "",
            getCombats: () => [],
            getFirstIllustrationHtml: () => "",
            book: state.book,
        } as any;

        const xmlDoc = document.implementation.createDocument(null, "section", null);
        const gotoRule = xmlDoc.createElement("goToSection");
        gotoRule.setAttribute("section", "sect99");
        xmlDoc.documentElement.appendChild(gotoRule);
        const $sectionMechanics = $(xmlDoc.documentElement);
        (state.mechanics as any).getSection = () => $sectionMechanics;

        let fireInventoryCalled = false;
        const origFireInventory = mechanicsEngine.fireInventoryEvents;
        mechanicsEngine.fireInventoryEvents = () => {
            fireInventoryCalled = true;
        };

        try {
            mechanicsEngine.run(section);
        } catch (e) {
            if (!mechanicsEngine.isGotoException(e)) {
                throw e;
            }
        } finally {
            mechanicsEngine.fireInventoryEvents = origFireInventory;
        }

        // CURRENT BEHAVIOR: fireInventoryEvents IS called because runSectionRules
        // catches the goto and returns normally.
        expect(fireInventoryCalled).toBe(true);
    });

    test("runChildRules propagates real TypeError", () => {
        const parent = document.createElementNS(null, "section");
        const badRule = document.createElementNS(null, "message");
        parent.appendChild(badRule);

        // Temporarily make message throw a real TypeError
        const origMessage = mechanicsEngine.message;
        mechanicsEngine.message = () => {
            throw new TypeError("intentional test error");
        };

        try {
            expect(() => {
                mechanicsEngine.runChildRules($(parent));
            }).toThrow("intentional test error");
        } finally {
            mechanicsEngine.message = origMessage;
        }
    });

    test("nested goto: outer post-rule work continues (current behavior)", () => {
        // CURRENT BEHAVIOR: runSectionRules catches goto and returns normally,
        // so outer run() continues. After Phase 1 refactor, run() will check
        // currentSection !== _expectedSection and return early.

        const section = {
            sectionId: "sect1",
            hasNavigation: () => false,
            getTitleText: () => "Test",
            getHtml: () => "",
            getCombats: () => [],
            getFirstIllustrationHtml: () => "",
            book: state.book,
        } as any;

        const xmlDoc2 = document.implementation.createDocument(null, "section", null);
        const gotoRule2 = xmlDoc2.createElement("goToSection");
        gotoRule2.setAttribute("section", "sect99");
        xmlDoc2.documentElement.appendChild(gotoRule2);
        const $sectionMechanics = $(xmlDoc2.documentElement);
        (state.mechanics as any).getSection = () => $sectionMechanics;

        let fireInventoryCalled = false;
        const origFireInventory = mechanicsEngine.fireInventoryEvents;
        mechanicsEngine.fireInventoryEvents = () => {
            fireInventoryCalled = true;
        };

        try {
            mechanicsEngine.run(section);
        } catch (e) {
            if (!mechanicsEngine.isGotoException(e)) {
                throw e;
            }
        } finally {
            mechanicsEngine.fireInventoryEvents = origFireInventory;
        }

        // CURRENT BEHAVIOR: fireInventoryEvents IS called
        expect(fireInventoryCalled).toBe(true);
    });
});
