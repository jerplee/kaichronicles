import { routing, state, Item, translations, randomTable, mechanicsEngine, App, DebugMode, Color, TextSize, Font, BookSeriesId, KaiDiscipline, MgnDiscipline, GndDiscipline, NewOrderDiscipline, settingsController, ModalIds, voiceManager } from ".";
import { VOICE_FEATURE_ENABLED } from "./voice/voiceTypes";

/**
 * The HTML template API
 */
export const template = {

    /**
     * Set the navbar title and target URL
     * @param title The title to put on the navigation bar
     * @param url The target URL for the title on the nav. bar
     * @param showTitleOnSmallDevs True if the main title should be shown on
     * small devices.
     */
    setNavTitle(title: string, url: string, showTitleOnSmallDevs: boolean ) {
        // Update the title
        const $title = $("#template-title");
        
        $title.text(title);
        $title.attr("href", url);
        $("#template-img-logo").attr("href", url);

        if ( showTitleOnSmallDevs ) {
            $title.removeClass("hidden-xs hidden-sm");
        } else {
            $title.addClass("hidden-xs hidden-sm");
        }

    },

    /**
     * Hightlight the active navigation bar link
     */
    highlightActiveLink() {
        $("#template-header a, #template-header li").removeClass("active");
        const $actives = $('#template-header a[href="#' +
            routing.normalizeHash(location.hash) + '"]');
        $actives.each((index, link) => {
            const $link = $(link);
            // Bootstrap puts the class 'active' on the parent of the link
            // But I want to remark the "brand" link too, so put it on both
            $link.parent().filter("li").addClass("active");
            $link.addClass("active");
        });
    },

    /**
     * Setup navigation bar, sidebar, and footer
     */
    setup() {

        // Close sidebar when clicking outside of it (on the content area)
        $("#template-container").on("click", () => {
            template.closeSidebar();
        });

        // Sidebar hamburger toggle (mobile)
        $("#template-menubutton").on("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            $("#game-sidebar").toggleClass("open");
        });

        // Footer theme toggle
        $("#footer-themeToggle").on("click", (e) => {
            e.preventDefault();
            settingsController.changeColorTheme(state.color === Color.Light ? Color.Dark : Color.Light);
        });

        // Voice mode sidebar toggle (feature-gated)
        if (VOICE_FEATURE_ENABLED) {
            $("#sidebar-voiceMode").on("click", (e) => {
                // If clicking the help icon, show help instead of toggling
                const $target = $(e.target);
                if ($target.closest("#sidebar-voiceHelp").length > 0) {
                    e.preventDefault();
                    template.showVoiceHelp();
                    return;
                }
                e.preventDefault();
                voiceManager.toggle();
            });

            // Voice help icon separate handler
            $("#sidebar-voiceHelp").on("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                template.showVoiceHelp();
            });
        } else {
            $(".sidebar-nav-voice").hide();
        }

        // Sidebar nav items: close mobile drawer after click
        $("#game-sidebar a").on("click", () => {
            $("#game-sidebar").removeClass("open");
        });

        template.updateStatistics(true);
        template.translateMainMenu();
        template.changeColorTheme(state.color);
        template.changeTextSize(state.textSize);
        template.changeFont(state.font);
    },

    /**
     * Show / hide the in-game sidebar and footer
     */
    showStatistics(show: boolean) {
        template.showSidebar(show);
        if ( show ) {
            $("#template-menubutton").removeClass( "hideImportant" );
            template.updateStatistics();
        } else {
            $("#template-menubutton").addClass( "hideImportant" );
        }
    },

    /**
     * Show / hide Kai Name in sidebar
     */
    showKaiName(show: boolean) {
        if ( show ) {
            template.updateKaiName();
        } else {
            $("#sidebar-kaiName").hide();
        }
    },

    /**
     * Show / hide the character HUD section in the sidebar
     */
    showSidebarHud(show: boolean) {
        if (show) {
            $(".sidebar-hud").show();
        } else {
            $(".sidebar-hud").hide();
        }
    },

    /**
     * Update player statistics in sidebar
     */
    updateStatistics(doNotAnimate: boolean = false) {

        if ( !state.actionChart ||
            ( state.actionChart.combatSkill === 0 && state.actionChart.endurance === 0 ) ) {
            // Nothing to update
            return;
        }

        template.updateSidebarStats();

        // Update map link visibility in sidebar
        if ( state.actionChart.hasObject("map") ) {
            $("#sidebar-map").show();
        } else {
            $("#sidebar-map").hide();
        }

        // Update hunting indicator
        template.updateHuntingIndicator();
    },

    /**
     * Update the hunting availability indicator on the action chart
     */
    updateHuntingIndicator() {
        const $row = $("#achart-hunting-row");
        const $available = $("#achart-hunting-available");
        const $unavailable = $("#achart-hunting-unavailable");

        if (!state.sectionStates || !state.sectionStates.currentSection || !state.mechanics) {
            $row.hide();
            return;
        }

        // Check if current section has a meal rule
        const $section = state.mechanics.getSection(state.sectionStates.currentSection);
        if (!$section || $section.find("meal").length === 0) {
            $row.hide();
            return;
        }

        $row.show();

        // Check if player has hunting discipline
        const bookSeries = state.book.getBookSeries();
        let hasHunting = false;
        if (bookSeries.id === BookSeriesId.NewOrder) {
            hasHunting = state.actionChart.hasNewOrderDiscipline(NewOrderDiscipline.GrandHuntmastery) ||
                state.actionChart.hasKaiDiscipline(KaiDiscipline.Hunting) ||
                state.actionChart.hasMgnDiscipline(MgnDiscipline.Huntmastery);
        } else {
            hasHunting = state.actionChart.hasKaiDiscipline(KaiDiscipline.Hunting) ||
                state.actionChart.hasMgnDiscipline(MgnDiscipline.Huntmastery) ||
                state.actionChart.hasGndDiscipline(GndDiscipline.GrandHuntmastery);
        }

        const $mealRule = $section.find("meal").first();
        const huntDisabled = $mealRule.attr("huntDisabled") === "true";

        if (hasHunting && state.sectionStates.huntEnabled && !huntDisabled) {
            $available.show();
            $unavailable.hide();
        } else {
            $available.hide();
            $unavailable.show();
        }
    },

    /**
     * Update Kai Name in sidebar
     */
    updateKaiName(doNotAnimate: boolean = false) {
        if ( !state.actionChart || state.actionChart.kaiName === "" ) {
            $("#sidebar-kaiName").hide();
        } else {
            $("#sidebar-kaiName").show();
            $("#sidebar-kaiName").text( state.actionChart.kaiName );
        }
    },

    /**
     * Render a page view wrapped in the shared .page-card layout
     */
    renderPage(viewHtml: any, options: { card?: boolean; footer?: "book" | "app" | null } = {}) {
        const card = options.card !== false; // default true
        const footer = options.footer ?? null;

        if (card) {
            // viewHtml may be a jQuery object from translateView
            const $card = $('<div class="page-card"></div>');
            $card.append(viewHtml);
            template.setViewContent($card);
        } else {
            template.setViewContent(viewHtml);
        }

        template.updateFooter(footer);
        template.showSidebar(footer === "book");
        template.updateSidebarActive();
    },

    /**
     * Update the unified app footer content
     */
    updateFooter(type: "book" | "app" | null = null) {
        const $footer = $("#app-footer");
        const $content = $("#app-footer-content");

        if (!type || App.debugMode === DebugMode.TEST) {
            $footer.hide();
            return;
        }

        $footer.show();

        if (type === "book" && state.book) {
            const copyrightHtml = state.book.getCopyrightHtml().replace(/<br\s*\/?>/gi, "  -  ");
            $content.html(" - " + state.book.getBookTitle() + " - " + copyrightHtml);
        } else {
            $content.html('<a href="#aboutApp">About / FAQ / Privacy</a> — <a href="https://github.com/jerplee/kaichronicles" target="_blank">GitHub</a> — <a href="https://www.projectaon.org" target="_blank">Project Aon</a>');
        }
    },

    /**
     * Show / hide the game sidebar
     */
    showSidebar(show: boolean) {
        if (show) {
            $("body").addClass("sidebar-visible");
        } else {
            $("body").removeClass("sidebar-visible");
            $("#game-sidebar").removeClass("open");
        }
    },

    /**
     * Close the mobile sidebar drawer
     */
    closeSidebar() {
        $("#game-sidebar").removeClass("open");
    },

    /**
     * Update sidebar character stats (combat, endurance, rank)
     */
    updateSidebarStats() {
        if (!state.actionChart) {
            return;
        }

        const cs = state.actionChart.getCurrentCombatSkill();
        const currentEp = state.actionChart.currentEndurance;
        const maxEp = state.actionChart.endurance;

        // Combat bar (assume max ~30 for percentage)
        const csPercent = Math.min(100, Math.max(0, (cs / 30) * 100));
        $("#sidebar-combat-bar").css("width", csPercent + "%");
        $("#sidebar-combat-value").text(cs.toString());

        // Endurance bar
        const epPercent = maxEp > 0 ? (currentEp / maxEp) * 100 : 0;
        const $epBar = $("#sidebar-endurance-bar");
        $epBar.css("width", epPercent + "%");
        $("#sidebar-endurance-value").text(currentEp + " / " + maxEp);

        // Color endurance bar red when low
        if (currentEp <= 3) {
            $epBar.removeClass("progress-bar-success progress-bar-info").addClass("progress-bar-danger");
        } else if (currentEp <= maxEp * 0.3) {
            $epBar.removeClass("progress-bar-success progress-bar-danger").addClass("progress-bar-warning");
        } else {
            $epBar.removeClass("progress-bar-warning progress-bar-danger").addClass("progress-bar-success");
        }

        // Rank
        $("#sidebar-rank").text(template.getRankString());
    },

    /**
     * Return the current player rank string based on book series
     */
    getRankString(): string {
        if (!state.book || !state.actionChart) {
            return "-";
        }
        const series = state.book.getBookSeries();
        const names = ["Kai", "Magnakai", "Grand Master", "New Order"];
        return names[series.id] || "-";
    },

    /**
     * Highlight the active route in the sidebar
     */
    updateSidebarActive() {
        $("#game-sidebar .sidebar-nav-item").removeClass("active");
        const hash = routing.normalizeHash(location.hash);
        const $active = $('#game-sidebar a[href="#' + hash + '"]');
        $active.addClass("active");

        // Update "Book" label to "Resume Book" when not on game
        const $bookLink = $("#sidebar-book");
        if (hash !== "game" && state.book) {
            $bookLink.html('<span class="glyphicon glyphicon-book"></span> <span data-translation="resumeBook">Resume Book</span>');
        } else {
            $bookLink.html('<span class="glyphicon glyphicon-book"></span> <span data-translation="book">Book</span>');
        }
    },

    /**
     * Return true if the template menu is expanded
     */
    isMenuExpanded(): boolean {
        return $("#template-menubutton").attr("aria-expanded") === "true";
    },

    /**
     * Collapse the template menu and close sidebar
     */
    collapseMenu() {
        $("#navbar").collapse("hide");
        template.closeSidebar();
    },

    /**
     * Show an HTML view
     * @param {DOM} viewContent The view to show
     */
    setViewContent(viewContent: any) {
        $("#body").html(viewContent);
        // Scroll to top
        window.scrollTo(0, 0);
        template.highlightActiveLink();
    },

    /**
     * Display an error
     */
    setErrorMessage(msg: string) {
        mechanicsEngine.debugWarning(msg);

        const p = document.createElement('p');
        $(p).prop("style", "color: red");
        p.innerText = msg;

        template.setViewContent(p.outerHTML);
    },

    /**
     * Show dialog with object details
     * @param o The object to show
     */
    showObjectDetails(o: Item) {
        if ( !o ) {
            return;
        }

        // Translate the dialog
        translations.translateTags( $("#template-objectDetails") );

        $("#template-objectTitle").text( o.name );

        // Show / hide object image
        const imageUrl = o.getImageUrl();
        if ( !imageUrl ) {
            $("#template-objectImage").hide();
        } else {
            $("#template-objectImage").show();
            $("#template-objectImage img").attr("src" , imageUrl);
        }

        $("#template-objectDescription").text(o.description);
        $("#template-objectDescriptionExtra").text(o.extraDescription ?? "");

        $("#template-objectDetails").modal("show");
    },

    /**
     * Change a number value by other, with an animation.
     * @param {jQuery} $element Element selector to change
     * @param newValue The new value to set
     * @param doNotAnimate True if we should do not perform the animation
     * @param newColor The final HTML color of the element. If it's null, the default
     * color for the DOM element will be used
     */
    animateValueChange( $element: JQuery<HTMLElement> , newValue: number , doNotAnimate: boolean , newColor: string|null = null ) {

        // Clear previous animations
        $element.stop(true, true);

        // If the value is not going to change, do nothing
        const txtNewValue = newValue.toString();
        if ( $element.text() === txtNewValue ) {
            return;
        }

        if ( doNotAnimate ) {
            $element.text( txtNewValue );
            $element.css("color", newColor ? newColor : "" );
        } else {
            const miliseconds = 500;
            const currentValue = Number( $element.text() );
            $element.css("color", newValue < currentValue ? "red" : "green" );
            $element.fadeOut(miliseconds, function() {
                $(this).css("color", newColor ? newColor : "");
                $(this).text( txtNewValue ).fadeIn(miliseconds);
            });
        }
    },

    translateMainMenu() {
        translations.translateTags( $("#template-header") );
    },

    /**
     * @deprecated Combat tables are now a route. Kept for backward compat.
     */
    showCombatTables() {
        routing.redirect("combatTables");
    },

    /**
     * Show / hide the random table dialog
     * @param show Show/hide the dialog
     * @param subtitle Specify a subtitle shown in the dialog header
     */
    showRandomTable(show: boolean, subtitle = "") {
        const $randomModal = $("#template-randomtable");
        if ( show ) {
            // Hide toasts
            toastr.clear();
            // Translate the dialog
            translations.translateTags( $randomModal );
        }
        $randomModal.modal( show ? "show" : "hide" );
        $randomModal.find("#template-randomsubtitle").text(subtitle);
    },

    /**
     * Populate the random table values with the current book random table
     */
    fillRandomTableModal(numbers: number[]) {

        // Fill table
        let html = "";
        for (let row = 0; row < 10; row++) {
            html += "<tr>";
            for (let column = 0; column < 10; column++) {
                const num = numbers[ row * 10 + column ];
                html += '<td data-number="' + num.toFixed() + '">' + num.toFixed() + "</td>";
            }
            html += "</tr>";
        }
        $("#template-randomcontent").html( html );

        // Add click event handlers:
        $("#template-randomcontent td").on("mousedown", function(e) {
            e.preventDefault();
            randomTable.randomTableUIClicked( Number( $(this).attr("data-number") ) );
        });

        $("#template-randomtable").on('hidden.bs.modal', (e) => {
            e.preventDefault();
            randomTable.randomTableClosed();
        });
    },

    /**
     * Change the color theme of the templates
     * @param theme 'light' or 'dark'
     */
    changeColorTheme(theme: Color) {
        state.updateColorTheme( theme );

        switch (theme) {
            case Color.Dark:
                $("body").addClass("dark");
                break;
            default:
                // we will default to "light" theme, or no class
                $("body").removeClass("dark");
                break;
        }
    },

    /**
     * Change the text size of the templates
     * @param textSize 'normal' or 'large'
     */
    changeTextSize(textSize: TextSize) {
        state.updateTextSize( textSize );

        switch (textSize) {
            case TextSize.Large:
                $("body").addClass("largeText");
                break;
            default:
                // we will default to "normal" text size, or no class
                $("body").removeClass("largeText");
                break;
        }
    },

    /**
     * Change the font family of the templates
     * @param font 'sansSerif' or 'serif'
     */
    changeFont(font: Font) {
        state.updateFont( font );

        switch (font) {
            case Font.Serif:
                $("body").addClass("font-serif").removeClass("font-sans");
                break;
            default:
                $("body").addClass("font-sans").removeClass("font-serif");
                break;
        }
    },

    /**
     * Fixes the navbar to page top.
     *  Needed for testing with selenium (sometimes the navbar blocks clicks of some elements)
     */
    fixedNavbarTop() {
        $("#template-header").removeClass("navbar-fixed-top");
    },

    /**
     * Hides fixed footers.
     *  Needed for testing with selenium (the fixed footer blocks clicks on bottom elements)
     */
    hideCopyrightsForTests() {
        $("#game-copyrights-wrapper").hide();
        $("#app-footer").hide();
        // Prevent body.sidebar-visible CSS from re-showing the footer
        if ($("#test-hide-footer").length === 0) {
            $("head").append('<style id="test-hide-footer">body.sidebar-visible .app-footer { display: none !important; }</style>');
        }
    },

    addSectionReadyMarker() {
        if (App.debugMode === DebugMode.TEST) {
            // Append a "mark" to let the tests controller know the section is completly loaded
            if ($("#section-ready").length === 0) {
                $("body").append('<p id="section-ready">SECTION READY</p>');
            }
        }
    },

    removeSectionReadymarker() {
        if (App.debugMode === DebugMode.TEST) {
            $("#section-ready").remove();
        }
    },

    /**
     * Show illustration zoom modal
     * @param src Image source URL
     */
    showIllustrationZoom(src: string) {
        $("#game-illustration-img").attr("src", src);
        $("#game-illustration-zoom").modal("show");
    },

    /**
     * Show a Bootstrap confirm modal. Calls onConfirm(true) if OK is clicked.
     */
    showConfirm(message: string, onConfirm: (confirmed: boolean) => void) {
        const $modal = $("#" + ModalIds.CONFIRM_MODAL);
        $("#" + ModalIds.CONFIRM_MESSAGE).text(message);

        const $ok = $("#" + ModalIds.CONFIRM_OK);
        $ok.off("click").on("click", () => {
            $modal.modal("hide");
            onConfirm(true);
        });

        $modal.modal("show");
    },

    /**
     * Show a Bootstrap alert modal with a single OK button.
     */
    showAlert(message: string) {
        const $modal = $("#" + ModalIds.ALERT_MODAL);
        $("#" + ModalIds.ALERT_MESSAGE).text(message);
        $modal.modal("show");
    },

    /**
     * Show a Bootstrap alert modal with HTML content.
     */
    showAlertHtml(html: string, title?: string) {
        const $modal = $("#" + ModalIds.ALERT_MODAL);
        $("#" + ModalIds.ALERT_MESSAGE).html(html);
        if (title) {
            $("#template-alertTitle").text(title);
        }
        $modal.modal("show");
    },

    /**
     * Show the voice commands help alert.
     */
    showVoiceHelp() {
        const wakeWordHtml = state.voiceWakeWord
            ? '<p class="voice-help-note"><strong>Wake word required:</strong> Say <em>"Hey Kai"</em> before each command.</p>'
            : "";
        template.showAlertHtml(
            '<div class="voice-help-content">' +
            '<h5>Navigation</h5>' +
            '<ul><li><em>"Open map"</em> – Show map</li>' +
            '<li><em>"Open stats"</em> – Show action chart</li>' +
            '<li><em>"Go to book"</em> – Resume reading</li></ul>' +
            '<h5>Choices</h5>' +
            '<ul><li><em>"Choose 2"</em> – Select option 2</li>' +
            '<li><em>"Pick 1"</em> – Select option 1</li></ul>' +
            '<h5>Combat</h5>' +
            '<ul><li><em>"Play turn"</em> – Run combat turn</li>' +
            '<li><em>"Elude"</em> – Try to escape</li></ul>' +
            '<h5>Voice Control</h5>' +
            '<ul><li><em>"Read"</em> – Read current section</li>' +
            '<li><em>"Stop"</em> – Stop speaking</li>' +
            '<li><em>"Repeat"</em> – Repeat last text</li></ul>' +
            wakeWordHtml +
            '</div>',
            "Voice Commands"
        );
    },

    /**
     * Show a Bootstrap prompt modal. Calls onResult(value) if OK is clicked, or onResult(null) if cancelled.
     */
    showPrompt(message: string, defaultValue: string, onResult: (value: string | null) => void) {
        const $modal = $("#" + ModalIds.PROMPT_MODAL);
        const $input = $("#" + ModalIds.PROMPT_INPUT);
        $("#" + ModalIds.PROMPT_LABEL).text(message);
        $input.val(defaultValue);

        const $ok = $("#" + ModalIds.PROMPT_OK);
        $ok.off("click").on("click", () => {
            const value = $input.val() as string;
            $modal.modal("hide");
            onResult(value && value.trim() ? value.trim() : null);
        });

        // Allow Enter key to submit
        $input.off("keydown").on("keydown", (e) => {
            if (e.which === 13) {
                e.preventDefault();
                $ok.trigger("click");
            }
        });

        $modal.modal("show");
        setTimeout(() => { $input.focus(); }, 100);
    }
};
