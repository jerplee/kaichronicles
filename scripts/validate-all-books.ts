/**
 * Standalone script to validate mechanics for all 29 books.
 * Run with: npx ts-node scripts/validate-all-books.ts
 */

import { BookValidator } from "../src/ts/model/bookValidator";
import { Book } from "../src/ts/model/book";
import { Mechanics } from "../src/ts/model/mechanics";
import { state } from "../src/ts/state";
import { declareCommonHelpers } from "../src/ts/common";
declareCommonHelpers(false);

import * as fs from "fs";
import * as path from "path";

// Set up jsdom so jQuery's parseXML works in Node
import { JSDOM } from "jsdom";
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
(globalThis as any).DOMParser = dom.window.DOMParser;
(globalThis as any).XMLSerializer = dom.window.XMLSerializer;

// Book / Mechanics XML parsing relies on global jQuery ($)
import $ from "jquery";
(globalThis as any).$ = $;
(globalThis as any).jQuery = $;

const DATA_ROOT = path.resolve(__dirname, "../www/data");

function setupState(bookNumber: number) {
    state.setup(bookNumber, false);
}

function loadBookXml(bookNumber: number): string {
    const book = new Book(bookNumber);
    const code = book.getProjectAonBookCode();
    const filePath = path.join(DATA_ROOT, "projectAon", bookNumber.toString(), `${code}.xml`);
    if (!fs.existsSync(filePath)) {
        throw new Error(`Book XML not found: ${filePath}`);
    }
    return fs.readFileSync(filePath, "utf-8");
}

function loadMechanicsXml(bookNumber: number): string {
    const filePath = path.join(DATA_ROOT, `mechanics-${bookNumber}.xml`);
    if (!fs.existsSync(filePath)) {
        throw new Error(`Mechanics XML not found: ${filePath}`);
    }
    return fs.readFileSync(filePath, "utf-8");
}

function loadObjectsXml(): string {
    const filePath = path.join(DATA_ROOT, "objects.xml");
    return fs.readFileSync(filePath, "utf-8");
}

function createValidator(bookNumber: number): BookValidator {
    setupState(bookNumber);

    const book = new Book(bookNumber);
    const mechanics = new Mechanics(book);

    book.setXml(loadBookXml(bookNumber));
    mechanics.setXml(loadMechanicsXml(bookNumber));
    mechanics.setObjectsXml(loadObjectsXml());

    return new BookValidator(mechanics, book);
}

const results: { book: number; errors: string[] }[] = [];

for (let bookNumber = 1; bookNumber <= 29; bookNumber++) {
    try {
        const validator = createValidator(bookNumber);
        validator.validateBook();
        results.push({ book: bookNumber, errors: validator.errors });
        console.log(`Book ${bookNumber}: ${validator.errors.length} error(s)`);
    } catch (e: any) {
        results.push({ book: bookNumber, errors: [`FATAL: ${e.message}`] });
        console.error(`Book ${bookNumber}: FATAL - ${e.message}`);
    }
}

// Summary report
console.log("\n========== VALIDATION SUMMARY ==========");
const booksWithErrors = results.filter(r => r.errors.length > 0);
console.log(`Total books checked: 29`);
console.log(`Books with errors: ${booksWithErrors.length}`);
console.log(`Books clean: ${29 - booksWithErrors.length}`);

if (booksWithErrors.length > 0) {
    console.log("\n--- DETAILED ERRORS ---");
    for (const r of booksWithErrors) {
        console.log(`\nBook ${r.book} (${r.errors.length} errors):`);
        for (const err of r.errors.slice(0, 20)) {
            console.log(`  - ${err}`);
        }
        if (r.errors.length > 20) {
            console.log(`  ... and ${r.errors.length - 20} more`);
        }
    }
}

// Write report to file
const reportPath = path.resolve(__dirname, "../validation-report.json");
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
console.log(`\nFull report written to: ${reportPath}`);
