import { loadGameController, mechanicsEngine, translations, state, routing } from "..";
import { SaveSlotRecord } from "../model/saveGameDb";

/**
 * The load game view interface functions
 */
export const loadGameView = {

    /**
     * Hide the web file uploader
     */
    hideFileUpload() { $("#loadGame-file").hide(); },

    /**
     * Bind web file uploader events
     */
    bindFileUploaderEvents() {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        (<JQuery<HTMLInputElement>> $("#loadGame-file")).on("change", function() {
            if (!this.files || !this.files[0]) {
                return;
            }
            loadGameController.fileUploaderChanged(this.files[0]);
        });
    },

    /**
     * Render save slots as a compact list in the load game view.
     * Only shows auto-saves for the currently active slot.
     * @param slots Save slots to display
     * @param playerName If provided, updates the header to "Load Game: [PlayerName]"
     */
    renderSlots(slots: SaveSlotRecord[], playerName?: string) {
        const $heading = $("#loadGame-heading");
        if (playerName && $heading.length) {
            $heading.text("Load Game: " + playerName);
        } else if ($heading.length) {
            $heading.text("Load Game");
        }

        const $grid = $("#loadGame-slotsGrid");
        $grid.empty();

        const manualSlots = slots.filter((s) => !s.isAutoSave);
        const activeSlotKey = state.activeSlotKey;
        const autoSaves = activeSlotKey
            ? slots.filter((s) => s.isAutoSave && s.parentSlotKey === activeSlotKey)
            : [];
        const hasAutoSaves = autoSaves.length > 0;

        // Render clear-autosaves button if any autosaves exist for the active slot
        if (hasAutoSaves) {
            $grid.append(
                '<div class="loadgame-actions" style="margin-bottom: 8px;">' +
                '<button id="loadGame-clearAutoSaves" class="btn btn-xs btn-default">' +
                'Clear Autosaves (' + autoSaves.length + ')' +
                '</button>' +
                '</div>'
            );
            // Bind click handler right after creating the button
            $grid.find("#loadGame-clearAutoSaves").on("click", function(e) {
                e.preventDefault();
                loadGameController.clearAutoSaves();
            });
        }

        const displaySlots = [...manualSlots, ...autoSaves];

        if (displaySlots.length === 0) {
            $grid.append('<p class="text-muted"><i>' + translations.text("noSaveSlots") + "</i></p>");
            return;
        }

        const tableHtml = '<table class="table table-hover table-condensed loadgame-table">' +
            '<thead>' +
            '<tr>' +
            '<th>Name</th>' +
            '<th>Book</th>' +
            '<th>Section</th>' +
            '<th>CS</th>' +
            '<th>EP</th>' +
            '<th>Date</th>' +
            '<th></th>' +
            '</tr>' +
            '</thead>' +
            '<tbody></tbody>' +
            '</table>';
        $grid.append(tableHtml);
        const $tbody = $grid.find("tbody");

        for (const slot of displaySlots) {
            const date = new Date(slot.timestamp).toLocaleDateString();
            const time = new Date(slot.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const seriesClass = this.getSeriesClass(slot.bookNumber);
            const autoBadge = slot.isAutoSave ? ' <span class="label label-info" style="font-size:9px">AUTO</span>' : "";

            const rowHtml = '<tr class="' + seriesClass + '" data-id="' + slot.id + '">' +
                '<td class="lg-name">' + this.escapeHtml(slot.name) + autoBadge + "</td>" +
                '<td class="lg-book">Book ' + slot.bookNumber + "</td>" +
                '<td class="lg-section">' + this.formatSectionId(slot.sectionId) + "</td>" +
                '<td class="lg-stat">' + slot.combatSkill + "</td>" +
                '<td class="lg-stat">' + slot.endurance + "/" + slot.maxEndurance + "</td>" +
                '<td class="lg-date">' + date + " <small>" + time + "</small></td>" +
                '<td class="lg-action">' +
                '<button class="btn btn-xs btn-primary slot-load">Load</button>' +
                "</td>" +
                "</tr>";

            $tbody.append(rowHtml);
        }

        // Bind load events
        $tbody.find(".slot-load").on("click", function(e) {
            e.preventDefault();
            const id = $(this).closest("tr").data("id");
            loadGameController.loadSlot(id);
        });
    },


    getSeriesClass(bookNumber: number): string {
        if (bookNumber <= 5) { return "series-kai"; }
        if (bookNumber <= 12) { return "series-magnakai"; }
        if (bookNumber <= 20) { return "series-grandmaster"; }
        return "series-neworder";
    },

    formatSectionId(sectionId: string): string {
        if (!sectionId) { return ""; }
        if (sectionId.toLowerCase().startsWith("sect")) {
            return "Section " + sectionId.substring(4);
        }
        return "Section " + sectionId;
    },

    escapeHtml(text: string): string {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Show an error
     * @param errorMsg Message to show
     */
    showError(errorMsg: string) {
        $("#loadGame-errors").text(errorMsg);
        mechanicsEngine.debugWarning(errorMsg);
    }
};
