/**
 * Shared types and interfaces for the Voice Mode system.
 */

/** Feature flag: set to true to enable voice UI and functionality. */
export const VOICE_FEATURE_ENABLED = false;

export interface VoiceSettings {
    enabled: boolean;
    autoRead: boolean;
    wakeWord: boolean;
    /** Name of the preferred TTS voice (empty = auto-select). */
    voiceName?: string;
}

export type VoiceState = "idle" | "listening" | "speaking" | "processing" | "error" | "muted";

export interface VoiceCommand {
    type: string;
}

export interface ChoiceCommand extends VoiceCommand {
    type: "choice";
    index: number;
}

export interface CombatTurnCommand extends VoiceCommand {
    type: "combatTurn";
    combatIndex: number;
}

export interface CombatEludeCommand extends VoiceCommand {
    type: "combatElude";
    combatIndex: number;
}

export interface NavigateCommand extends VoiceCommand {
    type: "navigate";
    target: "actionChart" | "map" | "settings" | "game" | "combatTables" | "mainMenu";
}

export interface TtsControlCommand extends VoiceCommand {
    type: "ttsControl";
    action: "read" | "stop" | "repeat";
}

export type ParsedCommand = ChoiceCommand | CombatTurnCommand | CombatEludeCommand | NavigateCommand | TtsControlCommand;
