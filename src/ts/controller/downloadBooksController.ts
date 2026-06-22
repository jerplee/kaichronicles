import { template, views, downloadBooksView } from "..";

export const downloadBooksController = {

    index() {
        template.setNavTitle("Download Books", "#mainMenu", true);
        template.showStatistics(false);
        template.showKaiName(false);
        views.loadPage("downloadBooks.html", "app").then(() => {
            downloadBooksView.setup();
        }, null);
    },

    getBackController() { return "mainMenu"; }
};
