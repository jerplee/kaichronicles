import { mechanicsEngine } from "..";

/**
 * IndexedDB wrapper for Kai Chronicles save game slots.
 */

const DB_NAME = "kaiChroniclesSaveSlots";
const DB_VERSION = 1;
const STORE_NAME = "saveSlots";
const MAX_AUTOSAVES = 3;

export interface SaveSlotRecord {
    id?: number;
    slotKey?: string;
    /** For auto-saves: the manual slot key that owns this auto-save (e.g. "slot-1"). */
    parentSlotKey?: string;
    name: string;
    timestamp: number;
    bookNumber: number;
    sectionId: string;
    kaiName: string;
    endurance: number;
    maxEndurance: number;
    combatSkill: number;
    currentState: object;
    previousBooksState: string[];
    isAutoSave: boolean;
}

export class SaveDbError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SaveDbError";
    }
}

export const saveGameDb = {

    /**
     * Open the IndexedDB database, creating/upgrading as needed.
     */
    openDb(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new SaveDbError("IndexedDB is not available in this browser"));
                return;
            }

            const request = window.indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                reject(new SaveDbError("Failed to open IndexedDB: " + request.error));
            };

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
                    store.createIndex("timestamp", "timestamp", { unique: false });
                    store.createIndex("isAutoSave", "isAutoSave", { unique: false });
                    store.createIndex("slotKey", "slotKey", { unique: true });
                }
            };
        });
    },

    /**
     * Create a new save slot.
     * @returns Promise resolving to the generated slot id.
     */
    async createSlot(record: SaveSlotRecord): Promise<number> {
        const db = await this.openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            const request = store.add(record);

            request.onsuccess = () => {
                resolve(request.result as number);
            };
            request.onerror = () => {
                reject(new SaveDbError("Failed to create slot: " + request.error));
            };
            tx.oncomplete = () => { db.close(); };
            tx.onerror = () => { db.close(); };
        });
    },

    /**
     * Update an existing save slot.
     */
    async updateSlot(id: number, record: Partial<SaveSlotRecord>): Promise<void> {
        const db = await this.openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            const getReq = store.get(id);

            getReq.onsuccess = () => {
                const existing = getReq.result as SaveSlotRecord | undefined;
                if (!existing) {
                    reject(new SaveDbError("Slot not found: " + id));
                    db.close();
                    return;
                }
                const updated: SaveSlotRecord = { ...existing, ...record, id };
                const putReq = store.put(updated);
                putReq.onsuccess = () => { resolve(); };
                putReq.onerror = () => {
                    reject(new SaveDbError("Failed to update slot: " + putReq.error));
                };
            };
            getReq.onerror = () => {
                reject(new SaveDbError("Failed to read slot: " + getReq.error));
            };
            tx.oncomplete = () => { db.close(); };
            tx.onerror = () => { db.close(); };
        });
    },

    /**
     * Delete a save slot.
     */
    async deleteSlot(id: number): Promise<void> {
        const db = await this.openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => { resolve(); };
            request.onerror = () => {
                reject(new SaveDbError("Failed to delete slot: " + request.error));
            };
            tx.oncomplete = () => { db.close(); };
            tx.onerror = () => { db.close(); };
        });
    },

    /**
     * Get a single save slot by id.
     */
    async getSlot(id: number): Promise<SaveSlotRecord | undefined> {
        const db = await this.openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(id);

            request.onsuccess = () => {
                resolve(request.result as SaveSlotRecord | undefined);
            };
            request.onerror = () => {
                reject(new SaveDbError("Failed to get slot: " + request.error));
            };
            tx.oncomplete = () => { db.close(); };
            tx.onerror = () => { db.close(); };
        });
    },

    /**
     * Get a save slot by its fixed slotKey (e.g. "slot-1", "slot-2", "slot-3").
     */
    async getSlotByKey(slotKey: string): Promise<SaveSlotRecord | undefined> {
        const db = await this.openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const index = store.index("slotKey");
            const request = index.get(slotKey);

            request.onsuccess = () => {
                resolve(request.result as SaveSlotRecord | undefined);
            };
            request.onerror = () => {
                reject(new SaveDbError("Failed to get slot by key: " + request.error));
            };
            tx.oncomplete = () => { db.close(); };
            tx.onerror = () => { db.close(); };
        });
    },

    /**
     * Save (create or overwrite) a record to a specific slot key.
     */
    async saveToSlot(slotKey: string, record: SaveSlotRecord): Promise<number> {
        const existing = await this.getSlotByKey(slotKey).catch(() => undefined);
        if (existing && existing.id) {
            await this.updateSlot(existing.id, { ...record, slotKey });
            return existing.id;
        } else {
            return await this.createSlot({ ...record, slotKey });
        }
    },

    /**
     * Get all save slots, ordered by timestamp descending (newest first).
     */
    async getAllSlots(): Promise<SaveSlotRecord[]> {
        const db = await this.openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const index = store.index("timestamp");
            const request = index.openCursor(null, "prev");
            const results: SaveSlotRecord[] = [];

            request.onsuccess = () => {
                const cursor = request.result;
                if (cursor) {
                    results.push(cursor.value as SaveSlotRecord);
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
            request.onerror = () => {
                reject(new SaveDbError("Failed to list slots: " + request.error));
            };
            tx.oncomplete = () => { db.close(); };
            tx.onerror = () => { db.close(); };
        });
    },

    /**
     * Get the most recent auto-save slot, or undefined if none exists.
     * @param parentSlotKey If provided, only consider auto-saves for this slot.
     */
    async getAutoSave(parentSlotKey?: string): Promise<SaveSlotRecord | undefined> {
        const db = await this.openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const index = store.index("timestamp");
            const request = index.openCursor(null, "prev");

            request.onsuccess = () => {
                const cursor = request.result;
                if (cursor) {
                    if (cursor.value.isAutoSave) {
                        const pk = cursor.value.parentSlotKey || "";
                        if (!parentSlotKey || pk === parentSlotKey) {
                            resolve(cursor.value as SaveSlotRecord);
                            return;
                        }
                    }
                    cursor.continue();
                } else {
                    resolve(undefined);
                }
            };
            request.onerror = () => {
                reject(new SaveDbError("Failed to get auto-save: " + request.error));
            };
            tx.oncomplete = () => { db.close(); };
            tx.onerror = () => { db.close(); };
        });
    },

    /**
     * Get all auto-save slots sorted by timestamp ascending (oldest first).
     * @param parentSlotKey If provided, only return auto-saves for this slot.
     */
    async getAutoSaves(parentSlotKey?: string): Promise<SaveSlotRecord[]> {
        const db = await this.openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const index = store.index("timestamp");
            const request = index.openCursor(null, "next");
            const results: SaveSlotRecord[] = [];

            request.onsuccess = () => {
                const cursor = request.result;
                if (cursor) {
                    if (cursor.value.isAutoSave) {
                        const pk = cursor.value.parentSlotKey || "";
                        if (!parentSlotKey || pk === parentSlotKey) {
                            results.push(cursor.value as SaveSlotRecord);
                        }
                    }
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
            request.onerror = () => {
                reject(new SaveDbError("Failed to get auto-saves: " + request.error));
            };
            tx.oncomplete = () => { db.close(); };
            tx.onerror = () => { db.close(); };
        });
    },

    /**
     * Clear all save slots.
     */
    async clearAll(): Promise<void> {
        const db = await this.openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => { resolve(); };
            request.onerror = () => {
                reject(new SaveDbError("Failed to clear slots: " + request.error));
            };
            tx.oncomplete = () => { db.close(); };
            tx.onerror = () => { db.close(); };
        });
    },

    /**
     * Delete auto-save slots.
     * @param parentSlotKey If provided, only delete auto-saves for this slot.
     * @returns Number of autosaves deleted.
     */
    async clearAutoSaves(parentSlotKey?: string): Promise<number> {
        const autoSaves = await this.getAutoSaves(parentSlotKey).catch(() => [] as SaveSlotRecord[]);
        for (const slot of autoSaves) {
            if (slot.id) {
                await this.deleteSlot(slot.id).catch(() => { /* ignore */ });
            }
        }
        return autoSaves.length;
    },

    /**
     * Prune auto-saves down to MAX_AUTOSAVES per parent slot by deleting the oldest excess.
     * @returns Number of autosaves deleted.
     */
    async pruneAutoSaves(): Promise<number> {
        const allAutoSaves = await this.getAutoSaves().catch(() => [] as SaveSlotRecord[]);
        // Group by parentSlotKey and prune each group independently
        const byParent: { [key: string]: SaveSlotRecord[] } = {};
        for (const s of allAutoSaves) {
            const pk = s.parentSlotKey || "";
            if (!byParent[pk]) {
                byParent[pk] = [];
            }
            byParent[pk].push(s);
        }
        let totalDeleted = 0;
        for (const pk of Object.keys(byParent)) {
            const group = byParent[pk];
            if (group.length > MAX_AUTOSAVES) {
                const toDelete = group.slice(0, group.length - MAX_AUTOSAVES);
                for (const slot of toDelete) {
                    if (slot.id) {
                        await this.deleteSlot(slot.id).catch(() => { /* ignore */ });
                        totalDeleted++;
                    }
                }
            }
        }
        return totalDeleted;
    },

    /**
     * Check if IndexedDB is available.
     */
    isAvailable(): boolean {
        return !!(window.indexedDB && window.IDBKeyRange);
    },

    /**
     * Upsert the auto-save slot.
     * Scoped to the record's parentSlotKey so each manual slot gets its own auto-save budget.
     * If an auto-save for the same sectionId already exists under this parent, update it in place.
     * Otherwise, create a new auto-save. If the parent is at capacity, delete its oldest slot first.
     */
    async upsertAutoSave(record: SaveSlotRecord): Promise<number> {
        const parentSlotKey = record.parentSlotKey || "";
        const autoSaves = await this.getAutoSaves(parentSlotKey).catch(() => [] as SaveSlotRecord[]);
        const existing = autoSaves.find((s) => s.sectionId === record.sectionId);
        if (existing && existing.id) {
            // Same section under same parent — update in place
            await this.updateSlot(existing.id, { ...record, isAutoSave: true });
            return existing.id;
        }
        if (autoSaves.length >= MAX_AUTOSAVES) {
            // New section for this parent — delete the oldest to make room
            const oldest = autoSaves[0];
            await this.deleteSlot(oldest.id!).catch(() => { /* ignore */ });
        }
        return await this.createSlot({ ...record, isAutoSave: true });
    }
};
