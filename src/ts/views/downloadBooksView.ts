import { projectAon, Book, BookSeriesId, translations } from "..";

interface BookStatus {
    bookNumber: number;
    downloaded: boolean;
}

/**
 * Convert a book title to Project Aon CamelCase URL slug.
 * Example: "Flight from the Dark" -> "FlightFromTheDark"
 */
function toProjectAonSlug(title: string): string {
    return title
        .replace(/'/g, "")
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join("");
}

export const downloadBooksView = {

    setup() {
        this.loadStatus();
        this.bindEvents();
    },

    bindEvents() {
        $("#download-all-btn").on("click", (e) => {
            e.preventDefault();
            this.downloadAll();
        });

        $("#download-books-grid").on("click", ".book-download-btn", (e) => {
            e.preventDefault();
            const bookNumber = $(e.currentTarget).closest(".book-card").data("book-number");
            this.downloadBook(bookNumber);
        });
    },

    loadStatus() {
        $.ajax({
            url: "/api/book-status",
            dataType: "json"
        }).done((data: { books: BookStatus[] }) => {
            this.renderGrid(data.books);
        }).fail((xhr, textStatus, errorThrown) => {
            // Show actual error details
            const status = xhr.status ? `HTTP ${xhr.status}` : textStatus || errorThrown || "unknown";
            console.log(`[DownloadBooks] API /api/book-status failed: ${status}`, xhr.responseText);

            // Client-side fallback: probe cover images to detect downloaded books
            this.detectBooksClientSide().then((books) => {
                this.renderGrid(books);
                const $grid = $("#download-books-grid");
                $grid.prepend(
                    '<div class="alert alert-warning">' +
                    `<strong>Download API unavailable (${status}).</strong> ` +
                    'Book status was detected from existing files. ' +
                    'To enable downloads, restart the dev server with <code>npm run serve</code>. ' +
                    '</div>'
                );
            });
        });
    },

    /**
     * Detect which books are downloaded by probing known files (client-side fallback).
     */
    detectBooksClientSide(): JQueryPromise<BookStatus[]> {
        const deferred = $.Deferred<BookStatus[]>();
        const books: BookStatus[] = [];
        const total = projectAon.supportedBooks.length;
        let completed = 0;

        for (let i = 1; i <= total; i++) {
            const book = new Book(i);
            const xmlUrl = book.getBookXmlURL();

            $.ajax({
                url: xmlUrl,
                method: "HEAD",
                cache: false
            }).done(() => {
                books.push({ bookNumber: i, downloaded: true });
            }).fail(() => {
                books.push({ bookNumber: i, downloaded: false });
            }).always(() => {
                completed++;
                if (completed === total) {
                    // Sort by book number to maintain order
                    books.sort((a, b) => a.bookNumber - b.bookNumber);
                    deferred.resolve(books);
                }
            });
        }

        return deferred.promise();
    },

    renderGrid(books: BookStatus[]) {
        const $grid = $("#download-books-grid");
        $grid.empty();

        let series: BookSeriesId | null = null;
        for (const status of books) {
            const book = new Book(status.bookNumber);
            const seriesId = book.getBookSeries().id;

            if (seriesId !== series) {
                const seriesName = translations.text(BookSeriesId[seriesId]);
                $grid.append(`<h3 class="download-series-header">${seriesName}</h3>`);
                series = seriesId;
            }

            const coverUrl = book.getCoverURL() || "";
            const title = projectAon.getBookTitle(status.bookNumber);
            const projectAonUrl = "https://www.projectaon.org/en/Main/" + toProjectAonSlug(title);
            const statusClass = status.downloaded ? "book-downloaded" : "book-missing";
            const btnText = status.downloaded ? "Redownload" : "Download";
            const btnClass = status.downloaded ? "btn-success" : "btn-primary";

            const coverHtml = coverUrl
                ? `<img class="book-cover" src="${coverUrl}" alt="${title}" onerror="this.style.display='none'" />`
                : `<div class="book-cover-placeholder"><span class="glyphicon glyphicon-book"></span></div>`;

            const html =
                `<div class="book-card ${statusClass}" data-book-number="${status.bookNumber}">` +
                `<div class="book-cover-wrap">${coverHtml}</div>` +
                `<div class="book-info">` +
                `<div class="book-number">Book ${status.bookNumber}</div>` +
                `<div class="book-title"><a href="${projectAonUrl}" target="_blank" rel="noopener">${title}</a></div>` +
                `</div>` +
                `<div class="book-actions">` +
                `<button class="btn btn-sm ${btnClass} book-download-btn">` +
                `<span class="glyphicon glyphicon-cloud-download"></span> ${btnText}` +
                `</button>` +
                `</div>` +
                `</div>`;

            $grid.append(html);
        }

        // Update top button label based on overall status
        const allDownloaded = books.every((b) => b.downloaded);
        const $topLabel = $("#download-all-btn .download-all-label");
        $topLabel.text(allDownloaded ? "Redownload All" : "Download All");
    },

    /**
     * Re-evaluate the top button label based on current card states.
     */
    refreshTopButton() {
        const totalCards = $(".book-card").length;
        const downloadedCards = $(".book-card.book-downloaded").length;
        const allDownloaded = totalCards > 0 && totalCards === downloadedCards;
        $("#download-all-btn .download-all-label").text(allDownloaded ? "Redownload All" : "Download All");
    },

    downloadBook(bookNumber: number) {
        const $card = $(`.book-card[data-book-number="${bookNumber}"]`);
        const $btn = $card.find(".book-download-btn");
        $btn.prop("disabled", true).html('<span class="glyphicon glyphicon-refresh glyphicon-spin"></span> Downloading...');

        $.ajax({
            url: `/api/download-book/${bookNumber}`,
            method: "POST",
            dataType: "json"
        }).done(() => {
            $card.removeClass("book-missing").addClass("book-downloaded");
            $btn.removeClass("btn-primary").addClass("btn-success")
                .html('<span class="glyphicon glyphicon-cloud-download"></span> Redownload');
            toastr.success(`Book ${bookNumber} downloaded successfully.`, "Download Complete");
            // Refresh top button in case this was the last missing book
            this.refreshTopButton();
        }).fail((xhr) => {
            const error = xhr.responseJSON?.error || "Download failed";
            $btn.prop("disabled", false).html('<span class="glyphicon glyphicon-cloud-download"></span> Retry');
            toastr.error(`Failed to download Book ${bookNumber}: ${error}`, "Download Failed");
        });
    },

    downloadAll() {
        const $btn = $("#download-all-btn");
        $btn.prop("disabled", true).html('<span class="glyphicon glyphicon-refresh glyphicon-spin"></span> Downloading all...');

        $.ajax({
            url: "/api/download-all-books",
            method: "POST",
            dataType: "json"
        }).done(() => {
            $btn.html('<span class="glyphicon glyphicon-cloud-download"></span> Redownload All');
            toastr.success("All books downloaded successfully.", "Download Complete");
            this.loadStatus();
        }).fail((xhr) => {
            const error = xhr.responseJSON?.error || "Download failed";
            $btn.prop("disabled", false).html('<span class="glyphicon glyphicon-cloud-download"></span> Download All');
            toastr.error(`Failed to download all books: ${error}`, "Download Failed");
        });
    }
};
