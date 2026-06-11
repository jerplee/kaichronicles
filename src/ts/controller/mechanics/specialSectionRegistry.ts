import { mechanicsEngine, state } from "../..";

export interface SpecialSectionHandler {
    run(rule: Element): void;
}

export class SpecialSectionRegistry {
    private static handlers: { [sectionId: string]: SpecialSectionHandler } = {};

    public static register(sectionId: string, handler: SpecialSectionHandler) {
        if (this.handlers[sectionId]) {
            console.warn(`Special section handler for ${sectionId} already registered. Overwriting.`);
        }
        this.handlers[sectionId] = handler;
    }

    public static run(sectionId: string, rule: Element): boolean {
        const handler = this.handlers[sectionId];
        if (!handler) {
            mechanicsEngine.debugWarning(`No special section handler registered for ${sectionId}`);
            return false;
        }
        handler.run(rule);
        return true;
    }
}

export class MiniGameState {
    public static get<T>(key: string, defaultValue: T): T {
        const value = state.sectionStates.otherStates[key];
        return value !== undefined && value !== null ? value : defaultValue;
    }
    public static set<T>(key: string, value: T) {
        state.sectionStates.otherStates[key] = value;
    }
}
