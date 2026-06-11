import * as fs from "fs-extra";
import { BookMetadata, projectAon } from "../model/projectAon";
import { downloadFile, downloadDirectory } from "./downloadFile";

/** Tool to download book data from the Project Aon SVN */
export class BookData {

    /** Base URL for XML text files (has all books including 29) */
    private static readonly XML_BASE_URL = "https://svn.projectaon.org/books/trunk";

    /** Base URL for image assets (covers, illustrations) */
    private static readonly IMG_BASE_URL = "https://www.projectaon.org/data/trunk";

    /**
     * The target directory root
     */
    public static readonly TARGET_ROOT = "www/data/projectAon";

    /** The book number 1-based index */
    private bookNumber: number;

    /** Metadata about the book */
    private bookMetadata: BookMetadata;

    /** The english book code */
    private code: string;

    /** Whether a cover exists for the book */
    private hasCover: boolean; 

    /** Array with illustrations authors directories names */
    private illAuthors: string[];

    /**
     * Constructor
     * @param bookNumber The book number (1-based index)
     */
    constructor(bookNumber: number) {
        this.bookNumber = bookNumber;
        this.bookMetadata = projectAon.supportedBooks[ bookNumber - 1 ];
        this.code = this.bookMetadata.code;
        this.illAuthors = this.bookMetadata.illustrators;
        this.hasCover = this.bookMetadata.hasCover === undefined ? true : this.bookMetadata.hasCover;
    }

    /**
     * Get the local relative path for the book data
     */
    private getBookDir(): string {
        return BookData.TARGET_ROOT + "/" + this.bookNumber.toFixed();
    }

    /**
     * Get the the book XML file book name
     * @returns The book XML file name
     */
    private getBookXmlName() {
        return this.code + ".xml";
    }

    /**
     * Get the HTTP source URL for the book XML
     */
    private getXmlUrl(): string {
        return BookData.XML_BASE_URL + "/en/xml/" + this.getBookXmlName();
    }

    /**
     * Download the book XML
     */
    private async downloadXml() {
        const url = this.getXmlUrl();
        const targetPath = this.getBookDir() + "/" + this.getBookXmlName();
        await downloadFile(url, targetPath);
    }

    /**
     * Download an author biography file
     */
    private async downloadAuthorBio(bioFileName: string) {
        const url = BookData.XML_BASE_URL + "/en/xml/" + bioFileName + ".inc";
        const targetPath = this.getBookDir() + "/" + bioFileName + ".inc";
        await downloadFile(url, targetPath);
    }

    /**
     * Get the HTTP URL for illustrations directory of a given author
     */
    private getIllustrationsUrl(author: string): string {
        return BookData.IMG_BASE_URL + "/en/png/lw/" + this.code + "/ill/" + author;
    }

    /**
     * Download illustrations
     */
    private async downloadIllustrations(author: string) {
        const url = this.getIllustrationsUrl(author);
        const targetDir = this.getBookDir() + "/ill";
        await downloadDirectory(url, targetDir);

        if ( this.bookNumber === 9) {
            await this.book9ObjectIllustrations();
        }
    }

    /**
     * Download extra book 9 object illustrations.
     * On book 9, there is a illustrator change (Brian Williams). He did illustrations for objects that
     * exists on previous books. So, include on this book all existing objects illustrations
     */
    private async book9ObjectIllustrations() {

        // Already included on book 9: dagger.png, sword.png, mace.png, bow.png, food.png, potion.png, quiver.png, rope.png

        const targetDir = this.getBookDir() + "/ill";

        // Not included on book 9, but in later books:
        const williamsIllustrations = {
            "axe.png" : "12tmod/ill/williams/axe.png",
            "spear.png" : "13tplor/ill/williams/spear.png",
            "bsword.png" : "17tdoi/ill/williams/bsword.png",
            "qstaff.png" : "12tmod/ill/williams/qurtstff.png",  // NAME CHANGED!!!,
            "ssword.png" : "08tjoh/ill/chalk/ssword.png",
            "warhammr.png" : "08tjoh/ill/chalk/warhammr.png"
        };
        for (const illName of Object.keys(williamsIllustrations) ) {
            const url = BookData.IMG_BASE_URL + "/en/png/lw/" + williamsIllustrations[illName];
            const targetPath = targetDir + "/" + illName;
            await downloadFile(url, targetPath, true);
        }
    }

    /**
     * Download the book cover
     */
    private async downloadCover() {
        if ( this.hasCover ) {
            const url = BookData.IMG_BASE_URL + "/en/jpeg/lw/" + this.code +
                "/skins/ebook/cover.jpg";
            const targetPath = this.getBookDir() + "/cover.jpg";
            await downloadFile(url, targetPath);
        }
    }

    public async downloadBookData() {
        const bookDir = BookData.TARGET_ROOT + "/" + this.bookNumber.toFixed();

        console.log("Re-creating directory " + bookDir);
        fs.removeSync( bookDir );
        fs.mkdirSync( bookDir );

        await this.downloadCover();

        // Download authors biographies
        for (const authorBio of this.bookMetadata.biographies) {
            await this.downloadAuthorBio(authorBio);
        }

        await this.downloadXml();

        for (const author of this.illAuthors) {
            await this.downloadIllustrations(author);
        }

        await this.downloadCombatTablesImages();
    }

    private async downloadCombatTablesImages() {
        const baseUrl = this.getIllustrationsUrl("blake");
        const targetDir = this.getBookDir() + "/ill";

        await downloadFile(baseUrl + "/crtneg.png", targetDir + "/crtneg.png", true);
        await downloadFile(baseUrl + "/crtpos.png", targetDir + "/crtpos.png", true);
    }
}
