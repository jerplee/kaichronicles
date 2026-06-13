/**
 * Event bus for AI narrator integration.
 * Provides typed game events that external AI systems can subscribe to
 * for observing state changes, narration, and player choices.
 */

export interface GameEventMap {
    /** A new book section has been loaded */
    sectionLoaded: {
        bookNumber: number;
        sectionId: string;
        html: string;
        plainText: string;
    };

    /** Player is presented with a set of choices */
    choicesAvailable: {
        bookNumber: number;
        sectionId: string;
        choices: Array<{ text: string; sectionId: string }>;
    };

    /** A combat has started */
    combatStarted: {
        bookNumber: number;
        sectionId: string;
        enemyName: string;
        enemyCombatSkill: number;
        enemyEndurance: number;
    };

    /** A combat turn has been resolved */
    combatRound: {
        bookNumber: number;
        sectionId: string;
        turnNumber: number;
        playerEndurance: number;
        enemyEndurance: number;
    };

    /** A combat has ended */
    combatEnded: {
        bookNumber: number;
        sectionId: string;
        playerWon: boolean;
        playerEndurance: number;
    };

    /** Player inventory has changed */
    inventoryChanged: {
        bookNumber: number;
        sectionId: string;
        added?: string[];
        removed?: string[];
    };

    /** Game over (death or book completion) */
    gameOver: {
        bookNumber: number;
        sectionId: string;
        reason: "death" | "bookComplete";
    };

    /** State was restored from a save */
    stateRestored: {
        bookNumber: number;
        sectionId: string;
    };

    /** A random table result was generated */
    randomTableResult: {
        bookNumber: number;
        sectionId: string;
        index: number;
        value: number;
    };
}

export type GameEventType = keyof GameEventMap;

/** Generic event handler */
export type GameEventHandler<T extends GameEventType> = (payload: GameEventMap[T]) => void;

/** Internal subscription record */
interface Subscription<T extends GameEventType> {
    id: number;
    event: T;
    handler: GameEventHandler<T>;
}

let nextId = 1;

const subscriptions: Subscription<any>[] = [];

/** Subscribe to a game event. Returns an unsubscribe function. */
export function on<T extends GameEventType>(
    event: T,
    handler: GameEventHandler<T>
): () => void {
    const id = nextId++;
    subscriptions.push({ id, event, handler });
    return () => {
        const idx = subscriptions.findIndex((s) => s.id === id);
        if (idx >= 0) {
            subscriptions.splice(idx, 1);
        }
    };
}

/** Emit a game event to all subscribers. */
export function emit<T extends GameEventType>(event: T, payload: GameEventMap[T]): void {
    for (const sub of subscriptions) {
        if (sub.event === event) {
            try {
                sub.handler(payload);
            } catch (e) {
                // Subscribers must not throw — isolate failures
                console.error(`[aiNarrator] Handler for "${event}" threw:`, e);
            }
        }
    }
}

/** Remove all subscriptions. Useful for testing. */
export function clearAllSubscriptions(): void {
    subscriptions.length = 0;
}

/** Current subscriber count (for debugging / tests). */
export function subscriberCount(): number {
    return subscriptions.length;
}
