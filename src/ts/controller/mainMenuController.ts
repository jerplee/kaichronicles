import { template, translations, views, mainMenuView, state, settingsController, Color, saveGameDb, routing, mechanicsEngine, SLOT_KEYS, SAVEGAME_EXTENSION } from "..";

/**
 * The application menu controller
 */
export const mainMenuController = {

    /**
     * The game menu
     */
    index() {
        template.setNavTitle( translations.text("kaiChronicles") , "#mainMenu", true);
        template.showStatistics(false);
        template.showKaiName(false);
        views.loadPage("mainMenu.html", "app").then(() => {
            mainMenuView.setup();
            this.bindModalEvents();
            this.bindUploadEvents();
            this.refreshSlots();
        }, null);
    },

    /**
     * Load the 3 fixed slots and render them.
     */
    refreshSlots() {
        if (saveGameDb.isAvailable()) {
            Promise.all(
                SLOT_KEYS.map((key) => saveGameDb.getSlotByKey(key).catch(() => undefined))
            ).then((slots) => {
                mainMenuView.renderSlots(slots);
            }).catch(() => {
                mainMenuView.renderSlots([undefined, undefined, undefined]);
            });
        } else {
            mainMenuView.renderSlots([undefined, undefined, undefined]);
        }
    },

    /**
     * Bind the New Game modal submit button.
     */
    bindModalEvents() {
        $("#menu-startNewGame").on("click", (e) => {
            e.preventDefault();
            const name = $("#menu-newGameName").val() as string;
            const slotNum = $("#menu-newGameSlot").val() as string;
            const bookNumber = parseInt($("#menu-newGameBook").val() as string, 10);
            if (!name || !name.trim() || !bookNumber) {
                return;
            }
            $("#menu-newGameModal").modal("hide");
            $("body").removeClass("modal-open");
            $(".modal-backdrop").remove();

            // Set the target slot for auto-save
            state.activeSlotKey = "slot-" + slotNum;

            // Start new game with the chosen name and book
            state.reset(true);
            state.setup(bookNumber, false);
            state.actionChart.kaiName = name.trim();
            state.persistState();

            routing.redirect("setup", { bookNumber });
        });
    },

    /**
     * Bind file upload inputs for each slot.
     */
    bindUploadEvents() {
        for (let i = 1; i <= 3; i++) {
            $("#menu-upload-slot" + i).on("change", (e) => {
                const target = e.target as HTMLInputElement;
                const file = target.files ? target.files[0] : null;
                if (!file) {
                    return;
                }
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const json = ev.target.result as string;
                        const saveObj = JSON.parse(json);
                        if (!saveObj || !saveObj.currentState) {
                            throw new Error("Invalid save file format");
                        }
                        const record = state.buildSaveSlotRecordFromObject(saveObj, file.name.replace(new RegExp("\\" + SAVEGAME_EXTENSION + "$", "i"), ""));
                        saveGameDb.saveToSlot("slot-" + i, record).then(() => {
                            this.refreshSlots();
                        }).catch((err) => {
                            mechanicsEngine.debugWarning("Failed to upload save: " + err);
                        });
                    } catch (err) {
                        mechanicsEngine.debugWarning("Failed to parse save file: " + err);
                    }
                    target.value = "";
                };
                reader.readAsText(file);
            });
        }
    },

    /**
     * Change the current color theme
     */
    changeColor() {
        settingsController.changeColorTheme(state.color === Color.Light ? Color.Dark : Color.Light);
    },

    /** Return page */
    getBackController() { return "exitApp"; }

};
