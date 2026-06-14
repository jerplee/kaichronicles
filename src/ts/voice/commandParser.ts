import type { ParsedCommand } from "./voiceTypes";

/**
 * Fuzzy-regex command parser for voice transcripts.
 * Normalizes input and maps utterances to typed game commands.
 */

const WAKE_WORD_PATTERN = /^(?:hey\s+kai|kai|okay\s+kai)$/i;

const CHOICE_PATTERNS = [
    /^(?:choose|pick|select|option|go to|turn to)\s+(\d+)$/i,
    /^(\d+)$/,
];

const COMBAT_TURN_PATTERNS = [
    /^(?:play\s+turn|attack|fight|next\s+turn|strike)$/i,
];

const COMBAT_ELUDE_PATTERNS = [
    /^(?:elude|run\s+away|flee|escape|retreat)$/i,
];

const NAV_PATTERNS: Array<{ pattern: RegExp; target: import("./voiceTypes").NavigateCommand["target"] }> = [
    { pattern: /^(?:open|show|go to)\s+(?:action\s+chart|stats|inventory)$/i, target: "actionChart" },
    { pattern: /^(?:open|show|go to)\s+(?:map)$/i, target: "map" },
    { pattern: /^(?:open|show|go to)\s+settings$/i, target: "settings" },
    { pattern: /^(?:go to|resume)\s+book$/i, target: "game" },
    { pattern: /^(?:go to|open)\s+combat\s+tables$/i, target: "combatTables" },
    { pattern: /^(?:go to|open)\s+main\s+menu$/i, target: "mainMenu" },
];

const TTS_PATTERNS: Array<{ pattern: RegExp; action: import("./voiceTypes").TtsControlCommand["action"] }> = [
    { pattern: /^(?:read\s+aloud|read|speak|narrate)$/i, action: "read" },
    { pattern: /^(?:stop|shut\s+up|quiet|pause)$/i, action: "stop" },
    { pattern: /^(?:repeat|again|say\s+that\s+again)$/i, action: "repeat" },
];

function normalize(text: string): string {
    return text
        .toLowerCase()
        .replace(/[.,!?;:'"]/g, "")
        .trim();
}

/**
 * Check if a transcript contains the wake word.
 */
export function isWakeWord(text: string): boolean {
    return WAKE_WORD_PATTERN.test(normalize(text));
}

/**
 * Parse a normalized voice transcript into a game command.
 * Returns null if no command is recognized.
 *
 * @param text Raw transcript from SpeechRecognition
 * @param hasChoices Whether the current section displays choice links
 * @param hasActiveCombat Whether there is an unresolved combat on the page
 */
export function parseCommand(
    text: string,
    hasChoices: boolean,
    hasActiveCombat: boolean
): ParsedCommand | null {
    const n = normalize(text);
    if (!n) {
        return null;
    }

    // 1. TTS control (highest priority — always available)
    for (const rule of TTS_PATTERNS) {
        if (rule.pattern.test(n)) {
            return { type: "ttsControl", action: rule.action };
        }
    }

    // 2. Navigation (always available)
    for (const rule of NAV_PATTERNS) {
        if (rule.pattern.test(n)) {
            return { type: "navigate", target: rule.target };
        }
    }

    // 3. Combat commands (only when combat is active)
    if (hasActiveCombat) {
        for (const pattern of COMBAT_TURN_PATTERNS) {
            if (pattern.test(n)) {
                return { type: "combatTurn", combatIndex: 0 };
            }
        }
        for (const pattern of COMBAT_ELUDE_PATTERNS) {
            if (pattern.test(n)) {
                return { type: "combatElude", combatIndex: 0 };
            }
        }
    }

    // 4. Choice commands (only when choices are visible)
    if (hasChoices) {
        for (const pattern of CHOICE_PATTERNS) {
            const match = n.match(pattern);
            if (match && match[1]) {
                const index = parseInt(match[1], 10);
                if (!isNaN(index) && index > 0) {
                    return { type: "choice", index: index };
                }
            }
        }
    }

    return null;
}
