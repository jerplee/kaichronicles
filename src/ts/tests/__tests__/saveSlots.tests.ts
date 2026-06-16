import { saveGameDb, SaveSlotRecord } from "../../model/saveGameDb";
import { state } from "../../state";
import { SLOT_KEYS } from "../../constants";
import { Combat } from "../../model/combat";

describe("Save Slot System", () => {

    beforeEach(async () => {
        // Clear all slots before each test
        if (saveGameDb.isAvailable()) {
            await saveGameDb.clearAll().catch(() => { /* ignore */ });
        }
        // Reset state
        state.activeSlotKey = null;
    });

    test("saveToSlot creates a slot by key", async () => {
        if (!saveGameDb.isAvailable()) {
            console.log("IndexedDB not available, skipping test");
            return;
        }

        const record: SaveSlotRecord = {
            name: "Test Save",
            timestamp: Date.now(),
            bookNumber: 1,
            sectionId: "sect1",
            kaiName: "TestKai",
            endurance: 20,
            maxEndurance: 20,
            combatSkill: 15,
            currentState: {},
            previousBooksState: [],
            isAutoSave: false
        };

        const id = await saveGameDb.saveToSlot(SLOT_KEYS[0], record);
        expect(id).toBeGreaterThan(0);

        const slot = await saveGameDb.getSlotByKey(SLOT_KEYS[0]);
        expect(slot).toBeDefined();
        expect(slot!.name).toBe("Test Save");
        expect(slot!.slotKey).toBe(SLOT_KEYS[0]);
    });

    test("saveToSlot overwrites existing slot by key", async () => {
        if (!saveGameDb.isAvailable()) {
            console.log("IndexedDB not available, skipping test");
            return;
        }

        const record1: SaveSlotRecord = {
            name: "First Save",
            timestamp: Date.now(),
            bookNumber: 1,
            sectionId: "sect1",
            kaiName: "Kai1",
            endurance: 20,
            maxEndurance: 20,
            combatSkill: 15,
            currentState: {},
            previousBooksState: [],
            isAutoSave: false
        };

        await saveGameDb.saveToSlot(SLOT_KEYS[0], record1);

        const record2: SaveSlotRecord = {
            name: "Second Save",
            timestamp: Date.now(),
            bookNumber: 1,
            sectionId: "sect2",
            kaiName: "Kai2",
            endurance: 18,
            maxEndurance: 20,
            combatSkill: 16,
            currentState: {},
            previousBooksState: [],
            isAutoSave: false
        };

        await saveGameDb.saveToSlot(SLOT_KEYS[0], record2);

        const slot = await saveGameDb.getSlotByKey(SLOT_KEYS[0]);
        expect(slot).toBeDefined();
        expect(slot!.name).toBe("Second Save");
        expect(slot!.sectionId).toBe("sect2");
    });

    test("getAllSlots returns slots ordered by timestamp", async () => {
        if (!saveGameDb.isAvailable()) {
            console.log("IndexedDB not available, skipping test");
            return;
        }

        const baseRecord: SaveSlotRecord = {
            name: "Save",
            timestamp: Date.now(),
            bookNumber: 1,
            sectionId: "sect1",
            kaiName: "Kai",
            endurance: 20,
            maxEndurance: 20,
            combatSkill: 15,
            currentState: {},
            previousBooksState: [],
            isAutoSave: false
        };

        await saveGameDb.saveToSlot(SLOT_KEYS[0], { ...baseRecord, name: "Save 1", timestamp: 1000 });
        await saveGameDb.saveToSlot(SLOT_KEYS[1], { ...baseRecord, name: "Save 2", timestamp: 2000 });
        await saveGameDb.saveToSlot(SLOT_KEYS[2], { ...baseRecord, name: "Save 3", timestamp: 3000 });

        const slots = await saveGameDb.getAllSlots();
        expect(slots.length).toBe(3);
        expect(slots[0].name).toBe("Save 3"); // newest first
        expect(slots[1].name).toBe("Save 2");
        expect(slots[2].name).toBe("Save 1");
    });

    test("state persistState writes to active slot immediately", async () => {
        if (!saveGameDb.isAvailable()) {
            console.log("IndexedDB not available, skipping test");
            return;
        }

        // Setup a minimal game state
        state.setup(1, false);
        state.actionChart.kaiName = "TestPlayer";
        state.sectionStates.currentSection = "sect5";
        state.activeSlotKey = SLOT_KEYS[0];

        // Persist should write to the slot immediately
        state.persistState();

        // Give a small delay for the async IndexedDB write
        await new Promise((resolve) => setTimeout(resolve, 100));

        const slot = await saveGameDb.getSlotByKey(SLOT_KEYS[0]);
        expect(slot).toBeDefined();
        expect(slot!.kaiName).toBe("TestPlayer");
        expect(slot!.sectionId).toBe("sect5");
        expect(slot!.isAutoSave).toBe(false);
    });

    test("persistState with active slot and combat objects does not throw DataCloneError", async () => {
        if (!saveGameDb.isAvailable()) {
            console.log("IndexedDB not available, skipping test");
            return;
        }

        // Setup state with a combat in sectionStates (Combat has prototype methods like nextTurnAsync)
        state.setup(1, false);
        state.actionChart.kaiName = "CombatPlayer";
        state.actionChart.combatSkill = 15;
        state.actionChart.endurance = 25;
        state.actionChart.currentEndurance = 20;
        state.sectionStates.currentSection = "sect100";

        const sectionState = state.sectionStates.getSectionState();
        sectionState.combats.push(new Combat("Test Enemy", 10, 20, 20));

        state.activeSlotKey = SLOT_KEYS[0];

        // This should not throw DataCloneError when IndexedDB tries to clone the state
        state.persistState();

        // Give a small delay for the async IndexedDB write
        await new Promise((resolve) => setTimeout(resolve, 100));

        const slot = await saveGameDb.getSlotByKey(SLOT_KEYS[0]);
        expect(slot).toBeDefined();
        expect(slot!.kaiName).toBe("CombatPlayer");
        expect(slot!.sectionId).toBe("sect100");
        expect(slot!.isAutoSave).toBe(false);
        // Verify combat objects were stripped of methods and serialized as plain objects
        const savedState = slot!.currentState as any;
        expect(savedState.sectionStates.sectionStates.sect100.combats.length).toBe(1);
        expect(savedState.sectionStates.sectionStates.sect100.combats[0].enemy).toBe("Test Enemy");
    });

    test("persistState without activeSlotKey does not write to slot", async () => {
        if (!saveGameDb.isAvailable()) {
            console.log("IndexedDB not available, skipping test");
            return;
        }

        state.setup(1, false);
        state.actionChart.kaiName = "Orphan";
        state.activeSlotKey = null;

        state.persistState();
        await new Promise((resolve) => setTimeout(resolve, 100));

        // No slot should exist
        const slots = await saveGameDb.getAllSlots();
        expect(slots.length).toBe(0);
    });

    test("auto-save is created and retrieved separately", async () => {
        if (!saveGameDb.isAvailable()) {
            console.log("IndexedDB not available, skipping test");
            return;
        }

        const record: SaveSlotRecord = {
            name: "Auto-Save",
            timestamp: Date.now(),
            bookNumber: 1,
            sectionId: "sect10",
            kaiName: "AutoKai",
            endurance: 25,
            maxEndurance: 25,
            combatSkill: 18,
            currentState: {},
            previousBooksState: [],
            isAutoSave: true
        };

        await saveGameDb.upsertAutoSave(record);
        const autoSave = await saveGameDb.getAutoSave();
        expect(autoSave).toBeDefined();
        expect(autoSave!.kaiName).toBe("AutoKai");
        expect(autoSave!.isAutoSave).toBe(true);
    });

    test("deleteSlot removes a slot by key", async () => {
        if (!saveGameDb.isAvailable()) {
            console.log("IndexedDB not available, skipping test");
            return;
        }

        const record: SaveSlotRecord = {
            name: "ToDelete",
            timestamp: Date.now(),
            bookNumber: 1,
            sectionId: "sect1",
            kaiName: "DeleteMe",
            endurance: 20,
            maxEndurance: 20,
            combatSkill: 15,
            currentState: {},
            previousBooksState: [],
            isAutoSave: false
        };

        const id = await saveGameDb.saveToSlot(SLOT_KEYS[0], record);
        let slot = await saveGameDb.getSlotByKey(SLOT_KEYS[0]);
        expect(slot).toBeDefined();

        await saveGameDb.deleteSlot(id);
        slot = await saveGameDb.getSlotByKey(SLOT_KEYS[0]);
        expect(slot).toBeUndefined();
    });

    test("clearAll removes every slot", async () => {
        if (!saveGameDb.isAvailable()) {
            console.log("IndexedDB not available, skipping test");
            return;
        }

        const record: SaveSlotRecord = {
            name: "Filler",
            timestamp: Date.now(),
            bookNumber: 1,
            sectionId: "sect1",
            kaiName: "Filler",
            endurance: 20,
            maxEndurance: 20,
            combatSkill: 15,
            currentState: {},
            previousBooksState: [],
            isAutoSave: false
        };

        await saveGameDb.saveToSlot(SLOT_KEYS[0], record);
        await saveGameDb.saveToSlot(SLOT_KEYS[1], record);
        await saveGameDb.upsertAutoSave({ ...record, isAutoSave: true });

        await saveGameDb.clearAll();
        const slots = await saveGameDb.getAllSlots();
        expect(slots.length).toBe(0);
    });

    test("multiple slots can share the same name (no unique constraint)", async () => {
        if (!saveGameDb.isAvailable()) {
            console.log("IndexedDB not available, skipping test");
            return;
        }

        const record: SaveSlotRecord = {
            name: "Same Name",
            timestamp: Date.now(),
            bookNumber: 1,
            sectionId: "sect1",
            kaiName: "Kai",
            endurance: 20,
            maxEndurance: 20,
            combatSkill: 15,
            currentState: {},
            previousBooksState: [],
            isAutoSave: false
        };

        // Should not throw ConstraintError
        await saveGameDb.saveToSlot(SLOT_KEYS[0], record);
        await saveGameDb.saveToSlot(SLOT_KEYS[1], { ...record, timestamp: Date.now() + 1 });

        const slot1 = await saveGameDb.getSlotByKey(SLOT_KEYS[0]);
        const slot2 = await saveGameDb.getSlotByKey(SLOT_KEYS[1]);
        expect(slot1).toBeDefined();
        expect(slot2).toBeDefined();
    });

    test("upsertAutoSave creates up to 3 auto-saves then overwrites oldest", async () => {
        if (!saveGameDb.isAvailable()) {
            console.log("IndexedDB not available, skipping test");
            return;
        }

        const makeRecord = (timestamp: number, kaiName: string, sectionId: string): SaveSlotRecord => ({
            name: "Auto-Save",
            timestamp,
            bookNumber: 1,
            sectionId,
            kaiName,
            endurance: 20,
            maxEndurance: 20,
            combatSkill: 15,
            currentState: {},
            previousBooksState: [],
            isAutoSave: true
        });

        // Create 3 auto-saves
        await saveGameDb.upsertAutoSave(makeRecord(1000, "First", "sect1"));
        await saveGameDb.upsertAutoSave(makeRecord(2000, "Second", "sect2"));
        await saveGameDb.upsertAutoSave(makeRecord(3000, "Third", "sect3"));

        let autoSaves = await (saveGameDb as any).getAutoSaves();
        expect(autoSaves.length).toBe(3);
        expect(autoSaves[0].kaiName).toBe("First");
        expect(autoSaves[2].kaiName).toBe("Third");

        // 4th auto-save should overwrite the oldest (First)
        await saveGameDb.upsertAutoSave(makeRecord(4000, "Fourth", "sect4"));

        autoSaves = await (saveGameDb as any).getAutoSaves();
        expect(autoSaves.length).toBe(3);
        expect(autoSaves[0].kaiName).toBe("Second"); // oldest now
        expect(autoSaves[1].kaiName).toBe("Third");
        expect(autoSaves[2].kaiName).toBe("Fourth"); // newest

        // getAutoSave should return the most recent
        const mostRecent = await saveGameDb.getAutoSave();
        expect(mostRecent).toBeDefined();
        expect(mostRecent!.kaiName).toBe("Fourth");
    });

    test("upsertAutoSave updates in place for same sectionId, preserving distinct visits", async () => {
        if (!saveGameDb.isAvailable()) {
            console.log("IndexedDB not available, skipping test");
            return;
        }

        const makeRecord = (timestamp: number, kaiName: string, sectionId: string): SaveSlotRecord => ({
            name: "Auto-Save",
            timestamp,
            bookNumber: 1,
            sectionId,
            kaiName,
            endurance: 20,
            maxEndurance: 20,
            combatSkill: 15,
            currentState: {},
            previousBooksState: [],
            isAutoSave: true
        });

        // Create auto-saves for 3 distinct sections
        await saveGameDb.upsertAutoSave(makeRecord(1000, "PageA", "sectA"));
        await saveGameDb.upsertAutoSave(makeRecord(2000, "PageB", "sectB"));
        await saveGameDb.upsertAutoSave(makeRecord(3000, "PageC", "sectC"));

        let autoSaves = await (saveGameDb as any).getAutoSaves();
        expect(autoSaves.length).toBe(3);
        expect(autoSaves[0].kaiName).toBe("PageA");
        expect(autoSaves[1].kaiName).toBe("PageB");
        expect(autoSaves[2].kaiName).toBe("PageC");

        // Re-visiting sectB should update the existing slot, not consume a new one
        await saveGameDb.upsertAutoSave(makeRecord(4000, "PageB-Updated", "sectB"));

        autoSaves = await (saveGameDb as any).getAutoSaves();
        expect(autoSaves.length).toBe(3);
        // Updated record gets new timestamp (4000) and moves to end of ascending list
        expect(autoSaves[0].kaiName).toBe("PageA");   // oldest, still present
        expect(autoSaves[1].kaiName).toBe("PageC");
        expect(autoSaves[2].kaiName).toBe("PageB-Updated"); // newest after update

        // Now visit a brand new section D — should evict the oldest (PageA)
        await saveGameDb.upsertAutoSave(makeRecord(5000, "PageD", "sectD"));

        autoSaves = await (saveGameDb as any).getAutoSaves();
        expect(autoSaves.length).toBe(3);
        expect(autoSaves[0].kaiName).toBe("PageB-Updated"); // oldest now
        expect(autoSaves[1].kaiName).toBe("PageC");
        expect(autoSaves[2].kaiName).toBe("PageD");         // newest
    });

    test("upsertAutoSave isolates auto-saves per parentSlotKey", async () => {
        if (!saveGameDb.isAvailable()) {
            console.log("IndexedDB not available, skipping test");
            return;
        }

        const makeRecord = (timestamp: number, sectionId: string, parentSlotKey: string): SaveSlotRecord => ({
            name: "Auto-Save",
            timestamp,
            bookNumber: 1,
            sectionId,
            kaiName: parentSlotKey + "-" + sectionId,
            endurance: 20,
            maxEndurance: 20,
            combatSkill: 15,
            currentState: {},
            previousBooksState: [],
            isAutoSave: true,
            parentSlotKey
        });

        // Fill slot-1 with 3 distinct sections
        await saveGameDb.upsertAutoSave(makeRecord(1000, "s1", "slot-1"));
        await saveGameDb.upsertAutoSave(makeRecord(2000, "s2", "slot-1"));
        await saveGameDb.upsertAutoSave(makeRecord(3000, "s3", "slot-1"));

        // Fill slot-2 with 3 distinct sections
        await saveGameDb.upsertAutoSave(makeRecord(1000, "s4", "slot-2"));
        await saveGameDb.upsertAutoSave(makeRecord(2000, "s5", "slot-2"));
        await saveGameDb.upsertAutoSave(makeRecord(3000, "s6", "slot-2"));

        // slot-1 gets a 4th section — should evict its own oldest, not slot-2's
        await saveGameDb.upsertAutoSave(makeRecord(4000, "s7", "slot-1"));

        const slot1Autos = await (saveGameDb as any).getAutoSaves("slot-1");
        expect(slot1Autos.length).toBe(3);
        expect(slot1Autos[0].sectionId).toBe("s2"); // oldest after s1 evicted
        expect(slot1Autos[2].sectionId).toBe("s7");

        const slot2Autos = await (saveGameDb as any).getAutoSaves("slot-2");
        expect(slot2Autos.length).toBe(3);
        expect(slot2Autos[0].sectionId).toBe("s4");
        expect(slot2Autos[2].sectionId).toBe("s6"); // untouched
    });

    test("pruneAutoSaves removes excess old autosaves", async () => {
        if (!saveGameDb.isAvailable()) {
            console.log("IndexedDB not available, skipping test");
            return;
        }

        const makeRecord = (timestamp: number, sectionId: string): SaveSlotRecord => ({
            name: "Auto",
            timestamp,
            bookNumber: 1,
            sectionId,
            kaiName: "Kai",
            endurance: 20,
            maxEndurance: 20,
            combatSkill: 15,
            currentState: {},
            previousBooksState: [],
            isAutoSave: true
        });

        // Create 5 autosaves for distinct sections
        await saveGameDb.upsertAutoSave(makeRecord(1000, "s1"));
        await saveGameDb.upsertAutoSave(makeRecord(2000, "s2"));
        await saveGameDb.upsertAutoSave(makeRecord(3000, "s3"));
        await saveGameDb.upsertAutoSave(makeRecord(4000, "s4"));
        await saveGameDb.upsertAutoSave(makeRecord(5000, "s5"));

        const pruned = await (saveGameDb as any).pruneAutoSaves();
        expect(pruned).toBe(2);

        const autoSaves = await (saveGameDb as any).getAutoSaves();
        expect(autoSaves.length).toBe(3);
        expect(autoSaves[0].timestamp).toBe(3000);
        expect(autoSaves[2].timestamp).toBe(5000);
    });

    test("clearAutoSaves removes all autosaves but leaves manual slots", async () => {
        if (!saveGameDb.isAvailable()) {
            console.log("IndexedDB not available, skipping test");
            return;
        }

        const autoRecord: SaveSlotRecord = {
            name: "Auto",
            timestamp: Date.now(),
            bookNumber: 1,
            sectionId: "sect1",
            kaiName: "AutoKai",
            endurance: 20,
            maxEndurance: 20,
            combatSkill: 15,
            currentState: {},
            previousBooksState: [],
            isAutoSave: true
        };
        const manualRecord: SaveSlotRecord = {
            name: "Manual",
            timestamp: Date.now(),
            bookNumber: 1,
            sectionId: "sect2",
            kaiName: "ManualKai",
            endurance: 25,
            maxEndurance: 25,
            combatSkill: 18,
            currentState: {},
            previousBooksState: [],
            isAutoSave: false
        };

        await saveGameDb.upsertAutoSave(autoRecord);
        await saveGameDb.saveToSlot(SLOT_KEYS[0], manualRecord);

        const deleted = await (saveGameDb as any).clearAutoSaves();
        expect(deleted).toBeGreaterThanOrEqual(1);

        const autoSaves = await (saveGameDb as any).getAutoSaves();
        expect(autoSaves.length).toBe(0);

        const manual = await saveGameDb.getSlotByKey(SLOT_KEYS[0]);
        expect(manual).toBeDefined();
        expect(manual!.name).toBe("Manual");
    });

    test("getAutoSave filters by parentSlotKey", async () => {
        if (!saveGameDb.isAvailable()) {
            console.log("IndexedDB not available, skipping test");
            return;
        }

        const makeRecord = (timestamp: number, sectionId: string, parentSlotKey: string): SaveSlotRecord => ({
            name: "Auto", timestamp, bookNumber: 1, sectionId,
            kaiName: parentSlotKey, endurance: 20, maxEndurance: 20, combatSkill: 15,
            currentState: {}, previousBooksState: [], isAutoSave: true, parentSlotKey
        });

        await saveGameDb.upsertAutoSave(makeRecord(1000, "s1", "slot-1"));
        await saveGameDb.upsertAutoSave(makeRecord(2000, "s2", "slot-2"));

        const slot1Auto = await saveGameDb.getAutoSave("slot-1");
        expect(slot1Auto).toBeDefined();
        expect(slot1Auto!.sectionId).toBe("s1");

        const slot2Auto = await saveGameDb.getAutoSave("slot-2");
        expect(slot2Auto).toBeDefined();
        expect(slot2Auto!.sectionId).toBe("s2");

        const missing = await saveGameDb.getAutoSave("slot-3");
        expect(missing).toBeUndefined();
    });

    test("getAutoSaves filters by parentSlotKey", async () => {
        if (!saveGameDb.isAvailable()) {
            console.log("IndexedDB not available, skipping test");
            return;
        }

        const makeRecord = (timestamp: number, sectionId: string, parentSlotKey: string): SaveSlotRecord => ({
            name: "Auto", timestamp, bookNumber: 1, sectionId,
            kaiName: parentSlotKey, endurance: 20, maxEndurance: 20, combatSkill: 15,
            currentState: {}, previousBooksState: [], isAutoSave: true, parentSlotKey
        });

        await saveGameDb.upsertAutoSave(makeRecord(1000, "s1", "slot-1"));
        await saveGameDb.upsertAutoSave(makeRecord(2000, "s2", "slot-1"));
        await saveGameDb.upsertAutoSave(makeRecord(3000, "s3", "slot-2"));

        const slot1Autos = await saveGameDb.getAutoSaves("slot-1");
        expect(slot1Autos.length).toBe(2);

        const slot2Autos = await saveGameDb.getAutoSaves("slot-2");
        expect(slot2Autos.length).toBe(1);
        expect(slot2Autos[0].sectionId).toBe("s3");

        const slot3Autos = await saveGameDb.getAutoSaves("slot-3");
        expect(slot3Autos.length).toBe(0);
    });

    test("clearAutoSaves scoped to parentSlotKey only clears that slot", async () => {
        if (!saveGameDb.isAvailable()) {
            console.log("IndexedDB not available, skipping test");
            return;
        }

        const makeRecord = (timestamp: number, sectionId: string, parentSlotKey: string): SaveSlotRecord => ({
            name: "Auto", timestamp, bookNumber: 1, sectionId,
            kaiName: parentSlotKey, endurance: 20, maxEndurance: 20, combatSkill: 15,
            currentState: {}, previousBooksState: [], isAutoSave: true, parentSlotKey
        });

        await saveGameDb.upsertAutoSave(makeRecord(1000, "s1", "slot-1"));
        await saveGameDb.upsertAutoSave(makeRecord(2000, "s2", "slot-1"));
        await saveGameDb.upsertAutoSave(makeRecord(3000, "s3", "slot-2"));

        const deleted = await saveGameDb.clearAutoSaves("slot-1");
        expect(deleted).toBe(2);

        const slot1Autos = await saveGameDb.getAutoSaves("slot-1");
        expect(slot1Autos.length).toBe(0);

        const slot2Autos = await saveGameDb.getAutoSaves("slot-2");
        expect(slot2Autos.length).toBe(1);
    });

    test("pruneAutoSaves prunes independently per parentSlotKey", async () => {
        if (!saveGameDb.isAvailable()) {
            console.log("IndexedDB not available, skipping test");
            return;
        }

        const makeRecord = (timestamp: number, sectionId: string, parentSlotKey: string): SaveSlotRecord => ({
            name: "Auto", timestamp, bookNumber: 1, sectionId,
            kaiName: parentSlotKey, endurance: 20, maxEndurance: 20, combatSkill: 15,
            currentState: {}, previousBooksState: [], isAutoSave: true, parentSlotKey
        });

        // slot-1: 4 autosaves (1 should be pruned)
        await saveGameDb.upsertAutoSave(makeRecord(1000, "s1", "slot-1"));
        await saveGameDb.upsertAutoSave(makeRecord(2000, "s2", "slot-1"));
        await saveGameDb.upsertAutoSave(makeRecord(3000, "s3", "slot-1"));
        await saveGameDb.upsertAutoSave(makeRecord(4000, "s4", "slot-1"));

        // slot-2: 5 autosaves (2 should be pruned)
        await saveGameDb.upsertAutoSave(makeRecord(1000, "s5", "slot-2"));
        await saveGameDb.upsertAutoSave(makeRecord(2000, "s6", "slot-2"));
        await saveGameDb.upsertAutoSave(makeRecord(3000, "s7", "slot-2"));
        await saveGameDb.upsertAutoSave(makeRecord(4000, "s8", "slot-2"));
        await saveGameDb.upsertAutoSave(makeRecord(5000, "s9", "slot-2"));

        const pruned = await saveGameDb.pruneAutoSaves();
        expect(pruned).toBe(3); // 1 from slot-1 + 2 from slot-2

        const slot1Autos = await saveGameDb.getAutoSaves("slot-1");
        expect(slot1Autos.length).toBe(3);

        const slot2Autos = await saveGameDb.getAutoSaves("slot-2");
        expect(slot2Autos.length).toBe(3);
    });

    test("buildAutoSaveRecord sets parentSlotKey from activeSlotKey", async () => {
        if (!saveGameDb.isAvailable()) {
            console.log("IndexedDB not available, skipping test");
            return;
        }

        state.setup(1, false);
        state.actionChart.kaiName = "ParentTest";
        state.activeSlotKey = "slot-1";
        state.sectionStates.currentSection = "sect99";

        // Trigger persistState which calls buildAutoSaveRecord internally
        state.persistState();
        await new Promise((resolve) => setTimeout(resolve, 600)); // wait for debounce + buffer

        const autoSave = await saveGameDb.getAutoSave("slot-1");
        expect(autoSave).toBeDefined();
        expect(autoSave!.parentSlotKey).toBe("slot-1");
        expect(autoSave!.sectionId).toBe("sect99");
    });

    test("SaveDbError carries message", () => {
        const { SaveDbError } = require("../../model/saveGameDb");
        const err = new SaveDbError("test failure");
        expect(err.message).toBe("test failure");
        expect(err.name).toBe("SaveDbError");
    });

    test("debounced auto-save coalesces rapid persistState calls into one record", async () => {
        if (!saveGameDb.isAvailable()) {
            console.log("IndexedDB not available, skipping test");
            return;
        }

        state.setup(1, false);
        state.actionChart.kaiName = "DebounceTest";
        state.activeSlotKey = SLOT_KEYS[0];
        state.sectionStates.currentSection = "sect1";

        // Fire persistState 5 times rapidly
        for (let i = 0; i < 5; i++) {
            state.persistState();
        }

        // Wait for the debounce window (500ms in scheduleIndexedDbSave) plus buffer
        await new Promise((resolve) => setTimeout(resolve, 700));

        const autoSaves = await (saveGameDb as any).getAutoSaves(SLOT_KEYS[0]);
        expect(autoSaves.length).toBe(1);
        expect(autoSaves[0].kaiName).toBe("DebounceTest");
    });

    test("restoreFromIndexedDb restores game state from auto-save", async () => {
        if (!saveGameDb.isAvailable()) {
            console.log("IndexedDB not available, skipping test");
            return;
        }

        // Setup and save
        state.setup(1, false);
        state.actionChart.kaiName = "RestoreMe";
        state.actionChart.combatSkill = 12;
        state.actionChart.currentEndurance = 18;
        state.sectionStates.currentSection = "sect42";
        state.activeSlotKey = SLOT_KEYS[0];
        state.persistState();

        await new Promise((resolve) => setTimeout(resolve, 700));

        // Reset state
        state.setup(1, false);
        expect(state.actionChart.kaiName).toBe("");

        // Restore
        const restored = await state.restoreFromIndexedDb();
        expect(restored).toBe(true);
        expect(state.actionChart.kaiName).toBe("RestoreMe");
        expect(state.actionChart.combatSkill).toBe(12);
        expect(state.actionChart.currentEndurance).toBe(18);
        expect(state.sectionStates.currentSection).toBe("sect42");
    });

    test("restoreFromIndexedDb returns false when no auto-save exists", async () => {
        if (!saveGameDb.isAvailable()) {
            console.log("IndexedDB not available, skipping test");
            return;
        }

        await saveGameDb.clearAll();
        const restored = await state.restoreFromIndexedDb();
        expect(restored).toBe(false);
    });

    test("auto-save record contains meaningful serialized state", async () => {
        if (!saveGameDb.isAvailable()) {
            console.log("IndexedDB not available, skipping test");
            return;
        }

        state.setup(1, false);
        state.actionChart.kaiName = "DeepState";
        state.actionChart.combatSkill = 14;
        state.actionChart.endurance = 25;
        state.actionChart.currentEndurance = 20;
        state.sectionStates.currentSection = "sect77";
        state.activeSlotKey = SLOT_KEYS[0];
        state.persistState();

        await new Promise((resolve) => setTimeout(resolve, 700));

        const autoSave = await saveGameDb.getAutoSave(SLOT_KEYS[0]);
        expect(autoSave).toBeDefined();

        const savedState = autoSave!.currentState as any;
        expect(savedState).toBeDefined();
        expect(savedState.bookNumber).toBe(1);
        expect(savedState.actionChart).toBeDefined();
        expect(savedState.actionChart.kaiName).toBe("DeepState");
        expect(savedState.actionChart.combatSkill).toBe(14);
        expect(savedState.sectionStates).toBeDefined();
        expect(savedState.sectionStates.currentSection).toBe("sect77");
    });

    test("auto-save with null activeSlotKey uses empty parentSlotKey", async () => {
        if (!saveGameDb.isAvailable()) {
            console.log("IndexedDB not available, skipping test");
            return;
        }

        state.setup(1, false);
        state.actionChart.kaiName = "OrphanAuto";
        state.activeSlotKey = null;
        state.sectionStates.currentSection = "sect1";
        state.persistState();

        await new Promise((resolve) => setTimeout(resolve, 700));

        // Should still create an auto-save but with empty parentSlotKey
        const allAutos = await (saveGameDb as any).getAutoSaves();
        const orphan = allAutos.find((a: SaveSlotRecord) => a.kaiName === "OrphanAuto");
        expect(orphan).toBeDefined();
        expect(orphan.parentSlotKey).toBe("");
    });

    test("getSlotByKey returns undefined for missing key", async () => {
        if (!saveGameDb.isAvailable()) {
            console.log("IndexedDB not available, skipping test");
            return;
        }

        const slot = await saveGameDb.getSlotByKey("nonexistent-slot-key");
        expect(slot).toBeUndefined();
    });

});
