import { setupController, translations, views, settingsView, state, template, mechanicsEngine, Color, TextSize, saveGameDb, routing, mainMenuController } from "..";
import { saveSlotsView } from "../views/saveSlotsView";
import { mainMenuView } from "../views/mainMenuView";

/**
 * Game settings controller
 */
export const settingsController = {

    index() {

        if ( !setupController.checkBook() ) {
            return;
        }

        document.title = translations.text("settings");

        views.loadView("settings.html")
        .then(() => {
            settingsView.setup();
        }, null);

    },

    /**
     * Change the current color theme
     * @param color 'light' or 'dark'
     */
    changeColorTheme(color: Color): void {
        template.changeColorTheme( color );
    },

    /**
     * Change the current color theme
     * @param color 'light' or 'dark'
     */
    changeTextSize(textSize: TextSize): void {
        template.changeTextSize( textSize );
    },

    /**
     * Show the save game dialog
     */
    saveGameDialog() {
        $("#settings-saveDialog").modal("show");
    },

    /** Return a string to put on saved games files */
    getDateForFileNames(): string {
        const now = new Date();
        return now.getFullYear().toFixed() + "_" +
            ( now.getMonth() + 1 ).toString().padStart( 2 , "0" ) + "_" +
            now.getDate().toString().padStart( 2 , "0" ) + "_" +
            now.getHours().toString().padStart( 2 , "0" ) + "_" +
            now.getMinutes().toString().padStart( 2 , "0" ) + "_" +
            now.getSeconds().toString().padStart( 2 , "0" );
    },

    /**
     * Return a default save game file name
     */
    defaultSaveGameName() {
        return settingsController.getDateForFileNames() + "-book-" + state.book.bookNumber.toFixed() + "-savegame.json";
    },

    /**
     * Save the current game
     * @param fileName File name to save
     */
    saveGame(fileName: string) {
        try {
            const stateJson = state.getSaveGameJson();
            const blob = new Blob( [ stateJson ], {type: "application/json;charset=utf-8"});

            // Check file name
            fileName = fileName.trim();
            if ( !fileName ) {
                fileName = settingsController.defaultSaveGameName();
            }
            if ( !fileName.toLowerCase().endsWith(".json") ) {
                fileName += ".json";
            }

            // Check for invalid character names
            if ( !fileName.isValidFileName() ) {
                alert("The file name contains invalid characters");
                return false;
            }

            saveAs(blob, fileName);
            return true;
        } catch (e) {
            mechanicsEngine.debugWarning(e);
            alert("Your browser version does not support save file with javascript. " +
                "Try a newer browser version. Error: " + e);
            return false;
        }
    },

    /**
     * Refresh the save slots grid from IndexedDB.
     */
    refreshSlots() {
        if ($("#menu-saveSlotsGrid").length) {
            // Main menu has its own 3-slot grid; delegate there
            mainMenuController.refreshSlots();
            return;
        }
        if (!saveGameDb.isAvailable()) {
            saveSlotsView.renderSlots([]);
            return;
        }
        saveGameDb.getAllSlots().then((slots) => {
            saveSlotsView.renderSlots(slots);
        }).catch((e) => {
            mechanicsEngine.debugWarning("Failed to load save slots: " + e);
            saveSlotsView.renderSlots([]);
        });
    },

    /**
     * Create a new manual save slot.
     */
    saveSlot(name: string) {
        if (!name || !name.trim()) {
            alert(translations.text("invalidSaveName"));
            return;
        }
        if (name.length > 40) {
            alert(translations.text("saveNameTooLong"));
            return;
        }
        const record = state["buildAutoSaveRecord"] ? (state as any).buildAutoSaveRecord() : {
            name: name.trim(),
            timestamp: Date.now(),
            bookNumber: state.book ? state.book.bookNumber : 0,
            sectionId: state.sectionStates ? state.sectionStates.currentSection || "" : "",
            kaiName: state.actionChart ? state.actionChart.kaiName || "" : "",
            endurance: state.actionChart ? state.actionChart.currentEndurance || 0 : 0,
            maxEndurance: state.actionChart ? state.actionChart.endurance || 0 : 0,
            combatSkill: state.actionChart ? state.actionChart.combatSkill || 0 : 0,
            currentState: JSON.parse(localStorage.getItem("state") || "{}"),
            previousBooksState: [],
            isAutoSave: false
        };
        record.name = name.trim();
        record.isAutoSave = false;

        saveGameDb.createSlot(record).then(() => {
            settingsController.refreshSlots();
        }).catch((e) => {
            mechanicsEngine.debugWarning("Failed to create save slot: " + e);
            alert(translations.text("saveSlotFailed"));
        });
    },

    /**
     * Overwrite an existing save slot with current state.
     */
    overwriteSlot(id: number) {
        const record = state["buildAutoSaveRecord"] ? (state as any).buildAutoSaveRecord() : {
            name: "",
            timestamp: Date.now(),
            bookNumber: state.book ? state.book.bookNumber : 0,
            sectionId: state.sectionStates ? state.sectionStates.currentSection || "" : "",
            kaiName: state.actionChart ? state.actionChart.kaiName || "" : "",
            endurance: state.actionChart ? state.actionChart.currentEndurance || 0 : 0,
            maxEndurance: state.actionChart ? state.actionChart.endurance || 0 : 0,
            combatSkill: state.actionChart ? state.actionChart.combatSkill || 0 : 0,
            currentState: JSON.parse(localStorage.getItem("state") || "{}"),
            previousBooksState: [],
            isAutoSave: false
        };
        record.timestamp = Date.now();
        record.isAutoSave = false;

        saveGameDb.updateSlot(id, record).then(() => {
            settingsController.refreshSlots();
        }).catch((e) => {
            mechanicsEngine.debugWarning("Failed to overwrite save slot: " + e);
            alert(translations.text("overwriteSlotFailed"));
        });
    },

    /**
     * Rename a save slot.
     */
    renameSlot(id: number, newName: string) {
        if (!newName || !newName.trim()) {
            alert(translations.text("invalidSaveName"));
            return;
        }
        saveGameDb.updateSlot(id, { name: newName.trim() }).then(() => {
            settingsController.refreshSlots();
        }).catch((e) => {
            mechanicsEngine.debugWarning("Failed to rename save slot: " + e);
            alert(translations.text("renameSlotFailed"));
        });
    },

    /**
     * Delete a save slot.
     */
    deleteSlot(id: number) {
        saveGameDb.deleteSlot(id).then(() => {
            settingsController.refreshSlots();
        }).catch((e) => {
            mechanicsEngine.debugWarning("Failed to delete save slot: " + e);
            alert(translations.text("deleteSlotFailed"));
        });
    },

    /**
     * Load a save slot and redirect to the game.
     */
    loadSlot(id: number) {
        saveGameDb.getSlot(id).then((slot) => {
            if (!slot) {
                alert(translations.text("slotNotFound"));
                return;
            }
            const json = JSON.stringify({
                currentState: slot.currentState,
                previousBooksState: slot.previousBooksState
            });
            state.loadSaveGameJson(json);
            routing.redirect("setup");
        }).catch((e) => {
            mechanicsEngine.debugWarning("Failed to load save slot: " + e);
            alert(translations.text("loadSlotFailed"));
        });
    },

    /** Return page */
    getBackController() { return "game"; }

};
