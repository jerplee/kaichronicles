import { BookValidator } from "../../model/bookValidator";
import { Book } from "../../model/book";
import { Mechanics } from "../../model/mechanics";
import { state } from "../../state";
import { declareCommonHelpers } from "../../common";
declareCommonHelpers(false);
import * as fs from "fs";
import * as path from "path";

// Book / Mechanics XML parsing relies on global jQuery ($)
import $ from "jquery";
(globalThis as any).$ = $;
(globalThis as any).jQuery = $;

const DATA_ROOT = path.resolve(__dirname, "../../../../www/data");

function setupState(bookNumber: number) {
    state.setup(bookNumber, false);
}

function loadBookXml(bookNumber: number): string {
    const book = new Book(bookNumber);
    const code = book.getProjectAonBookCode();
    const filePath = path.join(DATA_ROOT, "projectAon", bookNumber.toString(), `${code}.xml`);
    return fs.readFileSync(filePath, "utf-8");
}

function loadMechanicsXml(bookNumber: number): string {
    const filePath = path.join(DATA_ROOT, `mechanics-${bookNumber}.xml`);
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

describe("Book mechanics validation", () => {

    for (let bookNumber = 1; bookNumber <= 29; bookNumber++) {
        test(`book ${bookNumber} mechanics have no semantic errors`, () => {
            const validator = createValidator(bookNumber);
            validator.validateBook();

            if (validator.errors.length > 0) {
                console.error(`Book ${bookNumber} validation errors:\n` + validator.errors.join("\n"));
            }
            expect(validator.errors).toHaveLength(0);
        }, 60000);
    }

});
