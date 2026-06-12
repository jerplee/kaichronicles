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
     * Render save slot cards in the load game view.
     */
    renderSlots(slots: SaveSlotRecord[]) {
        const $grid = $("#loadGame-slotsGrid");
        $grid.empty();

        if (slots.length === 0) {
            $grid.html('<p class="text-muted"><i>' + translations.text("noSaveSlots") + "</i></p>");
            return;
        }

        for (const slot of slots) {
            const date = new Date(slot.timestamp).toLocaleString();
            const seriesClass = this.getSeriesClass(slot.bookNumber);

            const cardHtml = '<div class="save-slot-card ' + seriesClass + '" data-id="' + slot.id + '">' +
                '<div class="save-slot-header">' +
                '<span class="save-slot-name">' + this.escapeHtml(slot.name) + "</span>" +
                '<span class="save-slot-book">Book ' + slot.bookNumber + "</span>" +
                "</div>" +
                '<div class="save-slot-meta">' +
                '<span class="save-slot-section">Section ' + slot.sectionId + "</span>" +
                '<span class="save-slot-date">' + date + "</span>" +
                "</div>" +
                '<div class="save-slot-stats">' +
                "<span>CS: " + slot.combatSkill + "</span>" +
                "<span>EP: " + slot.endurance + "/" + slot.maxEndurance + "</span>" +
                "</div>" +
                '<div class="save-slot-actions">' +
                '<button class="btn btn-sm btn-primary slot-load">Load Game</button>' +
                "</div>" +
                "</div>";

            $grid.append(cardHtml);
        }

        // Bind load events
        $grid.find(".slot-load").on("click", function(e) {
            e.preventDefault();
            const id = $(this).closest(".save-slot-card").data("id");
            loadGameController.loadSlot(id);
        });
    },

    getSeriesClass(bookNumber: number): string {
        if (bookNumber <= 5) { return "series-kai"; }
        if (bookNumber <= 12) { return "series-magnakai"; }
        if (bookNumber <= 20) { return "series-grandmaster"; }
        return "series-neworder";
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
