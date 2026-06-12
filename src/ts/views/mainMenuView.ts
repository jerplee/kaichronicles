import { translations, routing, settingsController, loadGameController, template, SLOT_KEYS } from "..";
import { SaveSlotRecord } from "../model/saveGameDb";

export const mainMenuView = {

    /**
     * Main menu view
     */
    setup() {
        document.title = translations.text("kaiChronicles");

        $("#menu-faq").on("click", (e) => {
            e.preventDefault();
            routing.redirect("faq");
        });
        $("#menu-privacy").on("click", (e) => {
            e.preventDefault();
            routing.redirect("privacy");
        });
    },

    /**
     * Hide web text info
     */
    hideWebInfo() {
        $("#menu-webinfo").hide();
    },

    /**
     * Render 3 fixed save-slot cards. Each slot may be filled or empty.
     */
    renderSlots(slots: (SaveSlotRecord | undefined)[]) {
        const $grid = $("#menu-saveSlotsGrid");
        $grid.empty();

        for (let i = 0; i < SLOT_KEYS.length; i++) {
            const slot = slots[i];
            const cardHtml = slot ? this.buildFilledCard(slot, i + 1) : this.buildEmptyCard(i + 1);
            $grid.append(cardHtml);
        }

        this.bindFilledEvents();
        this.bindEmptyEvents();
    },

    /**
     * Build HTML for a filled slot card.
     */
    buildFilledCard(slot: SaveSlotRecord, slotNum: number): string {
        const date = new Date(slot.timestamp).toLocaleString();
        const seriesClass = this.getSeriesClass(slot.bookNumber);
        const sectionLabel = this.formatSectionId(slot.sectionId);
        const slotKey = slot.slotKey || SLOT_KEYS[slotNum - 1];

        return '<div class="save-slot-card ' + seriesClass + '" data-id="' + slot.id + '" data-slot-key="' + slotKey + '">' +
            '<div class="save-slot-header">' +
            '<span class="save-slot-name">' + this.escapeHtml(slot.name) + "</span>" +
            '<span class="save-slot-book">Book ' + slot.bookNumber + "</span>" +
            "</div>" +
            '<div class="save-slot-meta">' +
            '<span class="save-slot-section">' + sectionLabel + "</span>" +
            '<span class="save-slot-date">' + date + "</span>" +
            "</div>" +
            '<div class="save-slot-stats">' +
            "<span>CS: " + slot.combatSkill + "</span>" +
            "<span>EP: " + slot.endurance + "/" + slot.maxEndurance + "</span>" +
            "</div>" +
            '<div class="save-slot-actions">' +
            '<button class="btn btn-xs btn-primary slot-continue">Continue</button>' +
            '<button class="btn btn-xs btn-default slot-upload">Upload</button>' +
            '<button class="btn btn-xs btn-default slot-rename">Rename</button>' +
            '<button class="btn btn-xs btn-danger slot-delete">Delete</button>' +
            "</div>" +
            "</div>";
    },

    /**
     * Build HTML for an empty slot card.
     */
    buildEmptyCard(slotNum: number): string {
        return '<div class="save-slot-card action-card" data-slot-num="' + slotNum + '">' +
            '<div class="save-slot-header">' +
            '<span class="save-slot-name">Slot ' + slotNum + "</span>" +
            "</div>" +
            '<div class="save-slot-meta">' +
            '<span>Empty</span>' +
            "</div>" +
            '<div class="save-slot-actions">' +
            '<button class="btn btn-sm btn-success slot-newGame">New Game</button>' +
            "</div>" +
            "</div>";
    },

    /**
     * Bind events for filled slot cards.
     */
    bindFilledEvents() {
        $("#menu-saveSlotsGrid").off("click").on("click", ".slot-continue", function(e) {
            e.preventDefault();
            const id = $(this).closest(".save-slot-card").data("id");
            loadGameController.loadSlot(id);
        });

        $("#menu-saveSlotsGrid").on("click", ".slot-upload", function(e) {
            e.preventDefault();
            const slotNum = $(this).closest(".save-slot-card").data("slot-key");
            $("#menu-upload-slot" + slotNum.replace("slot-", "")).trigger("click");
        });

        $("#menu-saveSlotsGrid").on("click", ".slot-rename", function(e) {
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

        $("#menu-saveSlotsGrid").on("click", ".slot-delete", function(e) {
            e.preventDefault();
            const id = $(this).closest(".save-slot-card").data("id");
            const name = $(this).closest(".save-slot-card").find(".save-slot-name").text();
            template.showConfirm(
                (translations.text("deleteSaveConfirm") || "Delete save?") + " " + name,
                (confirmed) => {
                    if (confirmed) {
                        settingsController.deleteSlot(id);
                    }
                }
            );
        });
    },

    /**
     * Bind events for empty slot cards.
     */
    bindEmptyEvents() {
        $("#menu-saveSlotsGrid").on("click", ".slot-newGame", function(e) {
            e.preventDefault();
            const slotNum = $(this).closest(".save-slot-card").data("slot-num");
            $("#menu-newGameSlot").val(slotNum);
            $("#menu-newGameName").val("");
            $("#menu-newGameModal").modal("show");
        });
    },

    /**
     * Hide the save slots section.
     */
    hideSaveSlots() {
        $("#menu-saveSlotsSection").hide();
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
     * Format a section id for display.
     */
    formatSectionId(sectionId: string): string {
        if (!sectionId) { return ""; }
        if (sectionId.toLowerCase().startsWith("sect")) {
            return "Section " + sectionId.substring(4);
        }
        return "Section " + sectionId;
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
