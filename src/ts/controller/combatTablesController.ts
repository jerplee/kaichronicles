import { setupController, state, views, template, translations } from "..";

/**
 * Combat tables controller
 */
export const combatTablesController = {

    index() {

        if (!setupController.checkBook()) {
            return;
        }

        document.title = translations.text("combatTables");

        views.loadPage("combatTables.html", "book")
            .then(() => {
                const combatTablesUrls = state.book.getCombatTablesImagesUrls();
                $("#combatTables-image0").attr("src", combatTablesUrls[0]);
                $("#combatTables-image1").attr("src", combatTablesUrls[1]);
            }, null);
    }
};
