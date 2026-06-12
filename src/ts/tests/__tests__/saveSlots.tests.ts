import { saveGameDb, SaveSlotRecord } from "../../model/saveGameDb";
import { state } from "../../state";

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

        const id = await saveGameDb.saveToSlot("slot-1", record);
        expect(id).toBeGreaterThan(0);

        const slot = await saveGameDb.getSlotByKey("slot-1");
        expect(slot).toBeDefined();
        expect(slot!.name).toBe("Test Save");
        expect(slot!.slotKey).toBe("slot-1");
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

        await saveGameDb.saveToSlot("slot-1", record1);

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

        await saveGameDb.saveToSlot("slot-1", record2);

        const slot = await saveGameDb.getSlotByKey("slot-1");
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

        await saveGameDb.saveToSlot("slot-1", { ...baseRecord, name: "Save 1", timestamp: 1000 });
        await saveGameDb.saveToSlot("slot-2", { ...baseRecord, name: "Save 2", timestamp: 2000 });
        await saveGameDb.saveToSlot("slot-3", { ...baseRecord, name: "Save 3", timestamp: 3000 });

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
        state.activeSlotKey = "slot-1";

        // Persist should write to the slot immediately
        state.persistState();

        // Give a small delay for the async IndexedDB write
        await new Promise((resolve) => setTimeout(resolve, 100));

        const slot = await saveGameDb.getSlotByKey("slot-1");
        expect(slot).toBeDefined();
        expect(slot!.kaiName).toBe("TestPlayer");
        expect(slot!.sectionId).toBe("sect5");
        expect(slot!.isAutoSave).toBe(false);
    });

});
