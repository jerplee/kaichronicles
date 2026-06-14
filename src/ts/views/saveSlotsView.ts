import { translations, settingsController, template } from "..";
import { SaveSlotRecord } from "../model/saveGameDb";

/**
 * View for rendering and interacting with save slots.
 */
export const saveSlotsView = {

    /**
     * Render save slot cards into the settings panel.
     */
    renderSlots(slots: SaveSlotRecord[]) {
        const $grid = $("#settings-saveSlotsGrid");
        $grid.empty();

        if (slots.length === 0) {
            $grid.html('<p class="text-muted"><i>' + translations.text("noSaveSlots") + "</i></p>");
            return;
        }

        for (const slot of slots) {
            const cardHtml = this.buildSlotCard(slot);
            $grid.append(cardHtml);
        }

        this.bindSlotEvents();
    },

    /**
     * Build HTML for a single save slot card.
     */
    buildSlotCard(slot: SaveSlotRecord): string {
        const date = new Date(slot.timestamp).toLocaleString();
        const seriesClass = this.getSeriesClass(slot.bookNumber);

        return '<div class="save-slot-card ' + seriesClass + '" data-id="' + slot.id + '">' +
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
            '<button class="btn btn-xs btn-default slot-load">Load</button>' +
            '<button class="btn btn-xs btn-default slot-overwrite">Overwrite</button>' +
            '<button class="btn btn-xs btn-default slot-rename">Rename</button>' +
            '<button class="btn btn-xs btn-danger slot-delete">Delete</button>' +
            "</div>" +
            "</div>";
    },

    /**
     * Bind click events for slot card actions.
     */
    bindSlotEvents() {
        $("#settings-saveSlotsGrid").off("click").on("click", ".slot-load", function(e) {
            e.preventDefault();
            const id = $(this).closest(".save-slot-card").data("id");
            settingsController.loadSlot(id);
        });

        $("#settings-saveSlotsGrid").on("click", ".slot-overwrite", function(e) {
            e.preventDefault();
            const id = $(this).closest(".save-slot-card").data("id");
            settingsController.overwriteSlot(id);
        });

        $("#settings-saveSlotsGrid").on("click", ".slot-rename", function(e) {
            e.preventDefault();
            const id = $(this).closest(".save-slot-card").data("id");
            const name = $(this).closest(".save-slot-card").find(".save-slot-name").text();
            template.showPrompt(
                translations.text("renameSave") || "Rename save:",
                name,
                (newName) => {
                    if (newName) {
                        settingsController.renameSlot(id, newName);
                    }
                }
            );
        });

        $("#settings-saveSlotsGrid").on("click", ".slot-delete", function(e) {
            e.preventDefault();
            const id = $(this).closest(".save-slot-card").data("id");
            const name = $(this).closest(".save-slot-card").find(".save-slot-name").text();
            template.showConfirm(
                translations.text("deleteSaveConfirm", [name]),
                (confirmed) => {
                    if (confirmed) {
                        settingsController.deleteSlot(id);
                    }
                }
            );
        });
    },

    /**
     * Get CSS class for book series color coding.
     */
    getSeriesClass(bookNumber: number): string {
        if (bookNumber <= 5) { return "series-kai"; }
        if (bookNumber <= 12) { return "series-magnakai"; }
        if (bookNumber <= 20) { return "series-grandmaster"; }
        return "series-neworder";
    },

    /**
     * Escape HTML entities to prevent XSS in slot names.
     */
    escapeHtml(text: string): string {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }
};
