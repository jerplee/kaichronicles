/**
 * @jest-environment jsdom
 */

import $ from "jquery";
(globalThis as any).$ = $;
(globalThis as any).jQuery = $;

import { ActionChart } from "../../model/actionChart";
import { ActionChartItem } from "../../model/actionChartItem";
import { Item } from "../../model/item";
import { state } from "../../state";
import { App, DebugMode } from "../../app";
import { BookSeriesId } from "../../model/bookSeries";

describe("ActionChart.pick() contract", () => {
    let chart: ActionChart;

    beforeEach(() => {
        App.debugMode = DebugMode.NO_DEBUG;
        (state as any).book = {
            getBookSeries: () => ({ id: BookSeriesId.Kai }),
            getDisciplinesTable: () => ({}),
        };
        (state as any).mechanics = {
            getObject: (id: string|null) => {
                if (!id || id === "nonexistent") { return null; }
                return {
                    id,
                    name: id,
                    type: Item.OBJECT,
                    itemCount: 1,
                    incompatibleWith: [],
                    isArrow: false,
                    isWeapon: () => false,
                };
            },
        };
        chart = new ActionChart();
    });

    afterEach(() => {
        App.debugMode = DebugMode.NO_DEBUG;
    });

    test("throws when passed null", () => {
        expect(() => chart.pick(null as any)).toThrow("No object to pick");
    });

    test("throws when item is not found", () => {
        const item = new ActionChartItem("nonexistent");
        expect(() => chart.pick(item)).toThrow();
    });

    test("picks a valid object without returning a value", () => {
        const item = new ActionChartItem("meal");
        // pick() is void — it should complete without error
        expect(() => chart.pick(item)).not.toThrow();
        expect(chart.meals).toBe(1);
    });
});
