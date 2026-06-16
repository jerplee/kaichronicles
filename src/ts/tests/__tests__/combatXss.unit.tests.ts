/**
 * @jest-environment jsdom
 */

import $ from "jquery";
(globalThis as any).$ = $;
(globalThis as any).jQuery = $;

import { CombatMechanics } from "../../controller/mechanics/combatMechanics";
import { mechanicsEngine } from "../../controller/mechanics/mechanicsEngine";
import { state } from "../../state";
import { BookSectionStates } from "../../model/bookSectionStates";
import { BookSeriesId } from "../../model/bookSeries";
import { Combat } from "../../model/combat";

describe("Combat player name XSS prevention", () => {
    beforeEach(() => {
        // Combat UI template with necessary elements
        const templateHtml = `
            <div id="mechanics-combat">
                <span class="mechanics-playerName"></span>
                <span class="mechanics-enemyName"></span>
                <span class="mechanics-combatRatio"></span>
                <span class="mechanics-player-current-endurance"></span>
                <span class="mechanics-player-max-endurance"></span>
                <span class="mechanics-player-cs"></span>
                <span class="mechanics-enemy-current-endurance"></span>
                <span class="mechanics-enemy-max-endurance"></span>
                <span class="mechanics-enemy-cs"></span>
                <table><tbody></tbody></table>
                <a class="crlink"></a>
                <button class="mechanics-playTurn"></button>
                <button class="mechanics-elude"></button>
                <button class="mechanics-audit"></button>
            </div>
        `;
        mechanicsEngine.$mechanicsUI = $(`<div>${templateHtml}</div>`);

        document.body.innerHTML = `
            <div id="game-section">
                <div class="combat"></div>
            </div>
        `;

        (state as any).book = {
            bookNumber: 1,
            getBookSeries: () => ({ id: BookSeriesId.NewOrder }),
            getDisciplinesTable: () => ({}),
            getSectionXml: () => $("<section></section>"),
        };

        (state as any).actionChart = {
            currentEndurance: 20,
            combatSkill: 15,
            kaiName: "<img src=x onerror=alert(1)>",
            getMaxEndurance: () => 20,
            getDisciplines: () => [],
            hasKaiDiscipline: () => false,
            hasMgnDiscipline: () => false,
            hasGndDiscipline: () => false,
            hasNewOrderDiscipline: () => false,
            getCurrentCombatSkillBonuses: () => [],
        };

        (state as any).sectionStates = new BookSectionStates();
        state.sectionStates.currentSection = "sect100";

        const sectionState = state.sectionStates.getSectionState();
        const combat = new Combat("Test Enemy", 10, 20, 20);
        sectionState.combats.push(combat);
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    test("renders player name as text, not HTML", () => {
        CombatMechanics.renderCombats();

        const $playerName = $(".mechanics-playerName");
        expect($playerName.length).toBe(1);
        // .text() should escape HTML tags
        expect($playerName.html()).toBe("&lt;img src=x onerror=alert(1)&gt;");
        // There should be no <img> element
        expect($playerName.find("img").length).toBe(0);
    });
});
