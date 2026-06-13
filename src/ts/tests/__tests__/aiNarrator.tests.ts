import { on, emit, clearAllSubscriptions, subscriberCount } from "../../aiNarrator";

describe("AI Narrator Event Bus", () => {

    beforeEach(() => {
        clearAllSubscriptions();
    });

    afterEach(() => {
        clearAllSubscriptions();
    });

    test("on() returns an unsubscribe function", () => {
        const unsubscribe = on("sectionLoaded", () => { /* noop */ });
        expect(typeof unsubscribe).toBe("function");
    });

    test("subscriberCount increases when subscribing", () => {
        expect(subscriberCount()).toBe(0);
        on("sectionLoaded", () => { /* noop */ });
        expect(subscriberCount()).toBe(1);
    });

    test("subscriberCount decreases when unsubscribing", () => {
        const unsub = on("sectionLoaded", () => { /* noop */ });
        expect(subscriberCount()).toBe(1);
        unsub();
        expect(subscriberCount()).toBe(0);
    });

    test("emit() calls matching subscribers with payload", () => {
        const handler = jest.fn();
        on("sectionLoaded", handler);

        emit("sectionLoaded", {
            bookNumber: 1,
            sectionId: "sect5",
            html: "<p>Test</p>",
            plainText: "Test"
        });

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith({
            bookNumber: 1,
            sectionId: "sect5",
            html: "<p>Test</p>",
            plainText: "Test"
        });
    });

    test("emit() does not call subscribers for other events", () => {
        const sectionHandler = jest.fn();
        const combatHandler = jest.fn();
        on("sectionLoaded", sectionHandler);
        on("combatStarted", combatHandler);

        emit("sectionLoaded", {
            bookNumber: 1,
            sectionId: "sect5",
            html: "<p>Test</p>",
            plainText: "Test"
        });

        expect(sectionHandler).toHaveBeenCalledTimes(1);
        expect(combatHandler).not.toHaveBeenCalled();
    });

    test("multiple subscribers receive the same event", () => {
        const handler1 = jest.fn();
        const handler2 = jest.fn();
        on("choicesAvailable", handler1);
        on("choicesAvailable", handler2);

        emit("choicesAvailable", {
            bookNumber: 1,
            sectionId: "sect5",
            choices: []
        });

        expect(handler1).toHaveBeenCalledTimes(1);
        expect(handler2).toHaveBeenCalledTimes(1);
    });

    test("emit() isolates subscriber exceptions", () => {
        const badHandler = jest.fn(() => { throw new Error("boom"); });
        const goodHandler = jest.fn();
        on("combatStarted", badHandler);
        on("combatStarted", goodHandler);

        emit("combatStarted", {
            bookNumber: 1,
            sectionId: "sect5",
            enemyName: "Vordak",
            enemyCombatSkill: 15,
            enemyEndurance: 30
        });

        expect(badHandler).toHaveBeenCalledTimes(1);
        expect(goodHandler).toHaveBeenCalledTimes(1);
    });

    test("clearAllSubscriptions removes all subscribers", () => {
        on("gameOver", () => { /* noop */ });
        on("stateRestored", () => { /* noop */ });
        expect(subscriberCount()).toBe(2);
        clearAllSubscriptions();
        expect(subscriberCount()).toBe(0);
    });

});
