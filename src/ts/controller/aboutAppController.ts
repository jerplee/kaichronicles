import { views } from "..";

/**
 * Combined About / FAQ / Privacy / License controller
 */
export const aboutAppController = {

    index() {
        void views.loadPage("aboutApp.html", "app");
    },

    /** Return page */
    getBackController() { return "mainMenu"; }

};
