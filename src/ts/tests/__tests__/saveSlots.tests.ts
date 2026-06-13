import { saveGameDb, SaveSlotRecord } from "../../model/saveGameDb";
import { state } from "../../state";
import { SLOT_KEYS } from "../../constants";

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

    test("SaveDbError carries message", () => {
        const { SaveDbError } = require("../../model/saveGameDb");
        const err = new SaveDbError("test failure");
        expect(err.message).toBe("test failure");
        expect(err.name).toBe("SaveDbError");
    });

});
