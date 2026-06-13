import { template, translations, views, loadGameView, state, routing, mechanicsEngine, saveGameDb } from "..";

/**
 * Load stored game controller
 */

// tslint:disable-next-line: class-name
export class loadGameController {

    /**
     * The load game page
     */
    public static index() {
        template.setNavTitle( translations.text("kaiChronicles"), "#mainMenu", true);
        template.showStatistics(false);
        template.showKaiName(false);
        views.loadView("loadGame.html").then(() => {
            // Prune excess autosaves, then render
            loadGameController.refreshSlots();
            // Web page environment:
            loadGameView.bindFileUploaderEvents();
        }, null);
    }

    /**
     * Refresh the save slots grid, pruning excess autosaves first.
     */
    private static refreshSlots() {
        if (!saveGameDb.isAvailable()) {
            return;
        }
        saveGameDb.pruneAutoSaves().then((prunedCount) => {
            if (prunedCount > 0) {
                console.log("Pruned " + prunedCount + " old auto-save(s)");
            }
            return saveGameDb.getAllSlots();
        }).then((slots) => {
            loadGameView.renderSlots(slots);
        }).catch((e) => {
            mechanicsEngine.debugWarning("Failed to load save slots: " + e);
        });
    }

    /**
     * Clear all auto-saves and refresh the view.
     */
    public static clearAutoSaves() {
        if (!saveGameDb.isAvailable()) {
            return;
        }
        saveGameDb.clearAutoSaves().then((deleted) => {
            if (deleted > 0) {
                console.log("Cleared " + deleted + " auto-save(s)");
            }
            loadGameController.refreshSlots();
        }).catch((e) => {
            mechanicsEngine.debugWarning("Failed to clear auto-saves: " + e);
        });
    }

    /**
     * Called when the selected file changes (only web)
     * @param fileToUpload The selected file
     */
    public static fileUploaderChanged(fileToUpload: Blob) {
        try {
            const reader = new FileReader();
            reader.onload = (e) => {
                loadGameController.loadGame( <string>e.target.result );
            };
            reader.readAsText(fileToUpload);
        } catch (e) {
            mechanicsEngine.debugWarning(e);
            loadGameView.showError( e.toString() );
        }
    }

    /**
     * Load saved game and start to play it
     * @param jsonState The saved game file content
     */
    private static loadGame(jsonState: string) {
        try {
            state.loadSaveGameJson( jsonState );
            routing.redirect("setup");
        } catch (e) {
            mechanicsEngine.debugWarning(e);
            loadGameView.showError( e.toString() );
        }
    }

    /**
     * Load a save slot from IndexedDB.
     * @param id The slot id
     */
    public static loadSlot(id: number) {
        saveGameDb.getSlot(id).then((slot) => {
            if (!slot) {
                loadGameView.showError(translations.text("slotNotFound"));
                return;
            }
            // Remember which slot we're playing so auto-save writes back to it
            if (slot.slotKey) {
                state.activeSlotKey = slot.slotKey;
            }
            const json = JSON.stringify({
                currentState: slot.currentState,
                previousBooksState: slot.previousBooksState
            });
            loadGameController.loadGame(json);
        }).catch((e) => {
            mechanicsEngine.debugWarning("Failed to load save slot: " + e);
            loadGameView.showError(translations.text("loadSlotFailed"));
        });
    }

    /** Return page */
    public static getBackController() { return "mainMenu"; }

}
