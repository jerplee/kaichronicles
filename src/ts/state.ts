import { Book, Mechanics, BookSectionStates, ActionChart, projectAon, mechanicsEngine, saveGameDb, MAX_BOOK_NUMBER, StorageKeys, emit } from ".";

// Variabe "state" is declared at bottom of this file

interface CurrentState {
    actionChart: ActionChart,
    actionChartSect1: string;
    bookNumber: number,
    sectionStates: BookSectionStates
}

interface SaveGameObject {
    currentState: CurrentState,
    previousBooksState: string[]
}

export enum Color {
    Light,
    Dark,
    Paper,
    Ember,
    Moss
}

export enum TextSize {
    Normal,
    Large
}

export enum Font {
    SansSerif,
    Serif
}

/**
 * The application state.
 */
export class State {

    /**
     * The current book
     */
    public book = null as Book;

    /**
     * The current book mechanics
     */
    public mechanics = null as Mechanics;

    /**
     * The current book section states
     */
    public sectionStates = null as BookSectionStates;

    /**
     * The current action chart
     */
    public actionChart = null as ActionChart;

    /**
     * The action chart at the first section
     */
    public actionChartSect1 = null as string;

    /**
     * Color Theme ( 'light' or 'dark' ).
     * This is stored at localStorage['color'], not with the game state
     */
    public color = Color.Light;

    /**
     * Random table type for new game.
     */
    public manualRandomTable = false;

    /**
     * Text Size ( 'normal' or 'large' ).
     * This is stored at localStorage['textSize'], not with the game state
     */
    public textSize = TextSize.Normal;

    /**
     * Font family ( 'sansSerif' or 'serif' ).
     * This is stored at localStorage['font'], not with the game state
     */
    public font = Font.SansSerif;

    /**
     * Debounce timer for IndexedDB auto-save writes.
     */
    private saveDebounceTimer: number | null = null;

    /**
     * Active manual slot key to auto-save into (e.g. "slot-1"). null = auto-save only.
     */
    public activeSlotKey: string | null = null;

    constructor() {
        try {
            const saved = localStorage.getItem("kaiActiveSlotKey");
            if (saved) {
                this.activeSlotKey = saved;
            }
        } catch (e) {
            // ignore
        }
    }

    /**
     * Voice Mode enabled.
     * Stored at localStorage['voiceSettings'], not with the game state.
     */
    public voiceEnabled = false;

    /**
     * Auto-read sections when voice mode is on.
     * Stored at localStorage['voiceSettings'].
     */
    public voiceAutoRead = true;

    /**
     * Use wake word "Hey Kai" for voice commands.
     * Stored at localStorage['voiceSettings'].
     */
    public voiceWakeWord = false;

    /**
     * Preferred TTS voice name (empty = auto-select).
     * Stored at localStorage['voiceSettings'].
     */
    public voiceName = "";

    /**
     * Setup the default color or persist from local storage
     */
    public setupDefaultColorTheme() {
        try {
            const savedColor = localStorage.getItem("color");
            if (savedColor && Color[savedColor] !== undefined) {
                this.color = Color[savedColor];
            } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
                this.color = Color.Dark;
            } else {
                this.color = Color.Light;
            }
        } catch (e) {
            this.color = Color.Light;
            mechanicsEngine.debugWarning(e);
        }
    }

    /**
     * Setup the default text size or persist from local storage
     */
    public setupDefaultTextSize() {
        try {
            this.textSize = TextSize[localStorage.getItem("textSize")];
            if (!this.textSize) {
                this.textSize = TextSize.Normal;
            }
        } catch (e) {
            this.textSize = TextSize.Normal;
            mechanicsEngine.debugWarning(e);
        }
    }

    /**
     * Setup the default font or persist from local storage
     */
    public setupDefaultFont() {
        try {
            this.font = Font[localStorage.getItem("font")];
            if (this.font === undefined) {
                this.font = Font.SansSerif;
            }
        } catch (e) {
            this.font = Font.SansSerif;
            mechanicsEngine.debugWarning(e);
        }
    }

    /**
     * Setup voice settings or persist from local storage
     */
    public setupDefaultVoiceSettings() {
        try {
            const raw = localStorage.getItem("voiceSettings");
            if (raw) {
                const parsed = JSON.parse(raw);
                this.voiceEnabled = !!parsed.enabled;
                this.voiceAutoRead = parsed.autoRead !== undefined ? !!parsed.autoRead : true;
                this.voiceWakeWord = !!parsed.wakeWord;
                this.voiceName = typeof parsed.voiceName === "string" ? parsed.voiceName : "";
            }
        } catch (e) {
            this.voiceEnabled = false;
            this.voiceAutoRead = true;
            this.voiceWakeWord = false;
            this.voiceName = "";
            mechanicsEngine.debugWarning(e);
        }
    }

    /**
     * Persist voice settings to localStorage.
     */
    public persistVoiceSettings() {
        try {
            localStorage.setItem("voiceSettings", JSON.stringify({
                enabled: this.voiceEnabled,
                autoRead: this.voiceAutoRead,
                wakeWord: this.voiceWakeWord,
                voiceName: this.voiceName,
            }));
        } catch (e) {
            mechanicsEngine.debugWarning(e);
        }
    }

    /**
     * Setup the state for a book number
     */
    public setup(bookNumber: number, keepActionChart: boolean) {

        if (!bookNumber) {
            bookNumber = 1;
        }

        this.sectionStates = new BookSectionStates();
        this.book = new Book(bookNumber);

        // Action chart
        this.actionChart = null;
        this.actionChartSect1 = null;
        if (keepActionChart) {
            // Try to get the previous book action chart, and set it as the current
            this.actionChart = this.getPreviousBookActionChart(bookNumber - 1);

            // Restore Kai monastery objects
            this.restoreKaiMonasterySectionObjects();
        }

        this.mechanics = new Mechanics(this.book);

        if (!this.actionChart) {
            this.actionChart = new ActionChart();
            this.actionChart.manualRandomTable = this.manualRandomTable;
        }
    }

    public removeCachedState() {
        this.book = null;
        this.mechanics = null;
        this.sectionStates = null;
        this.actionChart = null;
        this.actionChartSect1 = null;
    }

    /**
     * Reset the current state
     */
    public reset(deleteBooksHistory: boolean) {

        this.removeCachedState();

        // Remove current game state
        localStorage.removeItem(StorageKeys.STATE);

        if (deleteBooksHistory) {
            // Remove action charts from previous books
            for (let i = 1; i <= projectAon.getLastSupportedBook(); i++) {
                localStorage.removeItem(StorageKeys.STATE_BOOK_PREFIX + i.toString());
            }
        }
    }

    /**
     * Returns the current state object
     */
    private getCurrentState(): CurrentState {
        return {
            actionChart: this.actionChart,
            actionChartSect1: this.actionChartSect1,
            bookNumber: this.book ? this.book.bookNumber : 0,
            sectionStates: this.sectionStates
        };
    }

    /**
     * Store the current state. Writes to localStorage synchronously,
     * and schedules an IndexedDB auto-save (debounced).
     * If activeSlotKey is set, the slot is saved immediately.
     */
    public persistState() {
        // Always write to localStorage as reliable synchronous backup
        try {
            const json = JSON.stringify(this.getCurrentState());
            localStorage.setItem("state", json);
        } catch (e) {
            mechanicsEngine.debugWarning(e);
        }

        // Persist active slot key so it survives page reloads
        try {
            if (this.activeSlotKey) {
                localStorage.setItem("kaiActiveSlotKey", this.activeSlotKey);
            } else {
                localStorage.removeItem("kaiActiveSlotKey");
            }
        } catch (e) {
            mechanicsEngine.debugWarning(e);
        }

        // Save active slot immediately (not debounced)
        if (saveGameDb.isAvailable() && this.activeSlotKey) {
            const slotRecord = this.buildSlotSaveRecord();
            saveGameDb.saveToSlot(this.activeSlotKey, slotRecord).catch((e) => {
                mechanicsEngine.debugWarning("IndexedDB slot save failed: " + e);
            });
        }

        // Also schedule auto-save (debounced)
        if (saveGameDb.isAvailable()) {
            this.scheduleIndexedDbSave();
        }
    }

    /**
     * Schedule an IndexedDB auto-save with debounce.
     */
    private scheduleIndexedDbSave() {
        if (this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer);
        }
        this.saveDebounceTimer = window.setTimeout(() => {
            this.saveDebounceTimer = null;
            const record = this.buildAutoSaveRecord();
            saveGameDb.upsertAutoSave(record).catch((e) => {
                mechanicsEngine.debugWarning("IndexedDB auto-save failed: " + e);
            });
        }, 500);
    }

    /**
     * Build a SaveSlotRecord from the current state for IndexedDB storage.
     */
    private buildAutoSaveRecord(): import("./model/saveGameDb").SaveSlotRecord {
        // IndexedDB structured clone cannot serialize functions (e.g. Combat.prototype.nextTurnAsync).
        // Round-trip through JSON to strip prototype methods and produce plain objects.
        const plainState = JSON.parse(JSON.stringify(this.getCurrentState()));
        return {
            name: "Auto-Save",
            timestamp: Date.now(),
            bookNumber: this.book ? this.book.bookNumber : 0,
            sectionId: this.sectionStates ? this.sectionStates.currentSection || "" : "",
            kaiName: this.actionChart ? this.actionChart.kaiName || "" : "",
            endurance: this.actionChart ? this.actionChart.currentEndurance || 0 : 0,
            maxEndurance: this.actionChart ? this.actionChart.getMaxEndurance() || 0 : 0,
            combatSkill: this.actionChart ? this.actionChart.combatSkill || 0 : 0,
            currentState: plainState,
            previousBooksState: this.getPreviousBooksState(),
            isAutoSave: true,
            parentSlotKey: this.activeSlotKey || ""
        };
    }

    /**
     * Build a SaveSlotRecord for the active manual slot.
     */
    private buildSlotSaveRecord(): import("./model/saveGameDb").SaveSlotRecord {
        // IndexedDB structured clone cannot serialize functions (e.g. Combat.prototype.nextTurnAsync).
        // Round-trip through JSON to strip prototype methods and produce plain objects.
        const plainState = JSON.parse(JSON.stringify(this.getCurrentState()));
        return {
            name: this.actionChart && this.actionChart.kaiName ? this.actionChart.kaiName : "Save",
            timestamp: Date.now(),
            bookNumber: this.book ? this.book.bookNumber : 0,
            sectionId: this.sectionStates ? this.sectionStates.currentSection || "" : "",
            kaiName: this.actionChart ? this.actionChart.kaiName || "" : "",
            endurance: this.actionChart ? this.actionChart.currentEndurance || 0 : 0,
            maxEndurance: this.actionChart ? this.actionChart.getMaxEndurance() || 0 : 0,
            combatSkill: this.actionChart ? this.actionChart.combatSkill || 0 : 0,
            currentState: plainState,
            previousBooksState: this.getPreviousBooksState(),
            isAutoSave: false
        };
    }

    /**
     * Collect previous book action charts from localStorage.
     */
    private getPreviousBooksState(): string[] {
        const states: string[] = [];
        for (let i = 1; i <= MAX_BOOK_NUMBER; i++) {
            const key = StorageKeys.STATE_BOOK_PREFIX + i;
            const value = localStorage.getItem(key);
            if (value) {
                states[i] = value;
            }
        }
        return states;
    }

    /**
     * Return true if there is a stored persisted state (localStorage or IndexedDB).
     */
    public existsPersistedState() {
        if (localStorage.getItem(StorageKeys.STATE)) {
            return true;
        }
        return false;
    }

    /**
     * Restore the state from local storage (primary) or IndexedDB auto-save (fallback).
     */
    public restoreState() {
        try {
            const json = localStorage.getItem(StorageKeys.STATE);
            if (json) {
                const stateKeys = JSON.parse(json);
                if (stateKeys) {
                    this.restoreStateFromObject(stateKeys);
                    return;
                }
            }
            throw new Error("No state to restore found");
        } catch (e) {
            mechanicsEngine.debugWarning(e);
            this.setup(1, false);
        }
    }

    /**
     * Async restore from IndexedDB auto-save slot.
     * Falls back to localStorage if IndexedDB fails or has no auto-save.
     */
    public async restoreFromIndexedDb(): Promise<boolean> {
        try {
            if (!saveGameDb.isAvailable()) {
                return false;
            }
            const slot = await saveGameDb.getAutoSave();
            if (slot && slot.currentState) {
                this.restoreStateFromObject(slot.currentState);
                // Also restore previous books state into localStorage for compatibility
                if (slot.previousBooksState) {
                    for (let i = 1; i < slot.previousBooksState.length; i++) {
                        if (slot.previousBooksState[i]) {
                            localStorage.setItem(StorageKeys.STATE_BOOK_PREFIX + i, slot.previousBooksState[i]);
                        }
                    }
                }
                // Write back to localStorage so subsequent restores work
                localStorage.setItem(StorageKeys.STATE, JSON.stringify(slot.currentState));
                return true;
            }
            return false;
        } catch (e) {
            mechanicsEngine.debugWarning("Failed to restore from IndexedDB: " + e);
            return false;
        }
    }

    /**
     * Restore the state from an object
     */
    private restoreStateFromObject(stateKeys: any) {
        this.book = new Book(stateKeys.bookNumber);
        this.mechanics = new Mechanics(this.book);
        this.actionChart = ActionChart.fromObject(stateKeys.actionChart, stateKeys.bookNumber);
        this.actionChartSect1 = stateKeys.actionChartSect1;
        this.sectionStates = new BookSectionStates();
        this.sectionStates.fromStateObject(stateKeys.sectionStates);
        emit("stateRestored", {
            bookNumber: this.book.bookNumber,
            sectionId: this.sectionStates.currentSection || ""
        });
    }

    /**
     * Update state to change the site color
     * @param color 'light' or 'dark'
     */
    public updateColorTheme(color: Color) {
        this.color = color;
        localStorage.setItem("color", Color[this.color]);
    }

    /**
     * Update state to change the text size
     * @param textSize 'normal' or 'large'
     */
    public updateTextSize(textSize: TextSize) {
        this.textSize = textSize;
        localStorage.setItem("textSize", TextSize[this.textSize]);
    }

    /**
     * Update state to change the font family
     * @param font 'sansSerif' or 'serif'
     */
    public updateFont(font: Font) {
        this.font = font;
        localStorage.setItem("font", Font[this.font]);
    }

    /**
     * Restore objects on the Kai Monastery section from the Action Chart
     */
    private restoreKaiMonasterySectionObjects() {
        const kaiMonasterySection = this.sectionStates.getSectionState(Book.KAIMONASTERY_SECTION);
        kaiMonasterySection.objects = this.actionChart ? this.actionChart.kaiMonasterySafekeeping : [];
    }

    /**
     * Update state to start the next book
     */
    public nextBook() {

        // Save the action chart state on the current book ending
        const key = `${StorageKeys.STATE_BOOK_PREFIX}${this.book.bookNumber}`;
        localStorage.setItem(key, JSON.stringify(this.actionChart));

        // Move to the next book
        this.book = new Book(this.book.bookNumber + 1);
        this.mechanics = new Mechanics(this.book);
        this.sectionStates = new BookSectionStates();
        this.actionChartSect1 = null;

        if (this.book.bookNumber !== 21) {
            // Restore Kai monastery objects
            this.restoreKaiMonasterySectionObjects();

            // Reset per-book counters and flags
            if (this.actionChart) {
                this.actionChart.reset20EPRestoreUsed();
                this.actionChart.resetNewOrderCuringEPRestoredUsed();
                this.actionChart.resetDisabledDisciplines();
            }

            this.persistState();
        } else {
            // Start a new character for the New Order series
            this.setup(this.book.bookNumber, false);
        }
    }

    /**
     * Get the action chart on the ending of the previous book
     * @param bookNumber Book which get the action chart
     * @returns The action chart. null if it was not found or it cannot be loaded.
     */
    public getPreviousBookActionChart(bookNumber: number): ActionChart {
        try {
            const key = `${StorageKeys.STATE_BOOK_PREFIX}${bookNumber}`;
            const json = localStorage.getItem(key);
            if (!json) {
                return null;
            }
            return ActionChart.fromObject(JSON.parse(json), bookNumber);
        } catch (e) {
            mechanicsEngine.debugWarning(e);
            return null;
        }
    }

    /**
     * Returns the object to save the game state
     */
    public getSaveGameJson(): string {

        // Get the current state
        const saveGameObject: SaveGameObject = {
            currentState: this.getCurrentState(),
            previousBooksState: []
        };

        // Get the action charts at the end of each book
        for (let i = 1; i <= MAX_BOOK_NUMBER; i++) {
            const key = `${StorageKeys.STATE_BOOK_PREFIX}${i}`;
            const previousBookState = localStorage.getItem(key);
            if (previousBookState) {
                saveGameObject.previousBooksState[i] = previousBookState;
            }
        }
        return JSON.stringify(saveGameObject);
    }

    /**
     * Build a SaveSlotRecord from a parsed save game object.
     */
    public buildSaveSlotRecordFromObject(saveObj: any, name: string): import("./model/saveGameDb").SaveSlotRecord {
        const currentState = saveObj.currentState;
        const ac = currentState ? currentState.actionChart : null;
        return {
            name: name || "Imported Save",
            timestamp: Date.now(),
            bookNumber: currentState ? currentState.bookNumber : 0,
            sectionId: currentState && currentState.sectionStates ? currentState.sectionStates.currentSection || "" : "",
            kaiName: ac ? ac.kaiName || "" : "",
            endurance: ac ? ac.currentEndurance || 0 : 0,
            maxEndurance: ac ? ac.endurance || 0 : 0,
            combatSkill: ac ? ac.combatSkill || 0 : 0,
            currentState: currentState,
            previousBooksState: saveObj.previousBooksState || [],
            isAutoSave: false
        };
    }

    /**
     * Restore the game from a save game file
     */
    public loadSaveGameJson(json: string) {

        // replace BOM Character (https://en.wikipedia.org/wiki/Byte_order_mark). Otherwise call to JSON.parse will fail
        json = json.replace(/\ufeff/g, "");

        const saveGameObject: SaveGameObject = <SaveGameObject>JSON.parse(json);

        // Check errors
        if (!saveGameObject || !saveGameObject.currentState) {
            throw new Error("Wrong format");
        }

        // Restore previous books action chart
        for (let i = 1; i <= MAX_BOOK_NUMBER; i++) {
            const key = `${StorageKeys.STATE_BOOK_PREFIX}${i}`;
            if (saveGameObject.previousBooksState[i]) {
                localStorage.setItem(key, saveGameObject.previousBooksState[i]);
            } else {
                localStorage.removeItem(key);
            }
        }

        // Restore current state
        this.restoreStateFromObject(saveGameObject.currentState);

        this.persistState();
    }
}

/** Application model state */
export const state = new State();
