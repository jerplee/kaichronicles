/**
 * Centralized constants for Kai Chronicles.
 * All hardcoded literals that appear in multiple files should live here.
 */

/** Maximum book number in the Lone Wolf series (books 1–30). */
export const MAX_BOOK_NUMBER = 30;

/** Number of sections per book (default upper bound). */
export const DEFAULT_SECTION_COUNT = 350;

/** localStorage key names. */
export const StorageKeys = {
    /** Legacy full-state blob (pre-IndexedDB). */
    STATE: "state",
    /** Prefix for per-book state snapshots. */
    STATE_BOOK_PREFIX: "state-book-",
    /** Action chart at section 1 (restart-from-beginning checkpoint). */
    ACTION_CHART_SECT1: "actionChartSect1",
} as const;

/** IndexedDB configuration for save slots. */
export const IndexedDbConfig = {
    DB_NAME: "kaiChroniclesSaveSlots",
    DB_VERSION: 1,
    STORE_NAME: "saveSlots",
} as const;

/** Fixed slot keys for manual saves. */
export const SLOT_KEYS = ["slot-1", "slot-2", "slot-3"] as const;

/** Save-game file extension. */
export const SAVEGAME_EXTENSION = ".json";

/** Maximum length of a user-defined save slot name. */
export const MAX_SAVE_NAME_LENGTH = 40;

/** Bootstrap modal element IDs used by template.ts. */
export const ModalIds = {
    ALERT_MODAL: "template-alertModal",
    ALERT_MESSAGE: "template-alertMessage",
    CONFIRM_MODAL: "template-confirmModal",
    CONFIRM_MESSAGE: "template-confirmMessage",
    CONFIRM_OK: "template-confirmOk",
    PROMPT_MODAL: "template-promptModal",
    PROMPT_INPUT: "template-promptInput",
    PROMPT_LABEL: "template-promptLabel",
    PROMPT_OK: "template-promptOk",
} as const;

/** DOM ID prefixes used throughout the mechanics engine. */
export const DOM_PREFIXES = {
    MECHANICS: "mechanics-",
} as const;
