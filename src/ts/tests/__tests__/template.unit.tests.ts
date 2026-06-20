/**
 * @jest-environment jsdom
 */

import $ from "jquery";
(globalThis as any).$ = $;
(globalThis as any).jQuery = $;

import { template } from "../../template";
import { Color, TextSize, Font } from "../../state";

describe("Template UI manipulation", () => {
    beforeEach(() => {
        document.body.className = "";
        document.body.innerHTML = `
            <div id="body"></div>
            <div id="game-sidebar">
                <div class="sidebar-hud" style="display:none"></div>
                <nav class="sidebar-nav">
                    <a href="#mainMenu" class="sidebar-nav-item">Main</a>
                    <a href="#settings" class="sidebar-nav-item">Settings</a>
                </nav>
                <div class="sidebar-copyright" id="sidebar-copyright" style="display:none"></div>
            </div>
        `;
        // jsdom does not implement scrollTo
        window.scrollTo = jest.fn();
    });

    describe("changeFont", () => {
        test("adds sans class for SansSerif", () => {
            template.changeFont(Font.SansSerif);
            expect(document.body.classList.contains("font-sans")).toBe(true);
            expect(document.body.classList.contains("font-serif")).toBe(false);
        });

        test("adds serif class for Serif", () => {
            template.changeFont(Font.Serif);
            expect(document.body.classList.contains("font-serif")).toBe(true);
            expect(document.body.classList.contains("font-sans")).toBe(false);
        });

        test("switches between fonts cleanly", () => {
            template.changeFont(Font.SansSerif);
            template.changeFont(Font.Serif);
            expect(document.body.classList.contains("font-serif")).toBe(true);
            expect(document.body.classList.contains("font-sans")).toBe(false);
        });
    });

    describe("changeTextSize", () => {
        test("adds large class", () => {
            template.changeTextSize(TextSize.Large);
            expect(document.body.classList.contains("largeText")).toBe(true);
        });

        test("removes large class for Normal", () => {
            document.body.classList.add("largeText");
            template.changeTextSize(TextSize.Normal);
            expect(document.body.classList.contains("largeText")).toBe(false);
        });
    });

    describe("changeColorTheme", () => {
        test("adds dark class", () => {
            template.changeColorTheme(Color.Dark);
            expect(document.body.classList.contains("dark")).toBe(true);
        });

        test("removes dark class for Light", () => {
            document.body.classList.add("dark");
            template.changeColorTheme(Color.Light);
            expect(document.body.classList.contains("dark")).toBe(false);
        });
    });

    describe("showSidebar / showSidebarHud", () => {
        test("showSidebar adds sidebar-visible class", () => {
            template.showSidebar(true);
            expect(document.body.classList.contains("sidebar-visible")).toBe(true);
        });

        test("showSidebar removes sidebar-visible class", () => {
            document.body.classList.add("sidebar-visible");
            template.showSidebar(false);
            expect(document.body.classList.contains("sidebar-visible")).toBe(false);
        });

        test("showSidebarHud shows HUD element", () => {
            template.showSidebarHud(true);
            const hud = document.querySelector(".sidebar-hud") as HTMLElement;
            expect(hud.style.display).not.toBe("none");
        });

        test("showSidebarHud hides HUD element", () => {
            const hud = document.querySelector(".sidebar-hud") as HTMLElement;
            hud.style.display = "block";
            template.showSidebarHud(false);
            expect(hud.style.display).toBe("none");
        });
    });

    describe("updateFooter", () => {
        test("hides copyright when type is null", () => {
            template.updateFooter(null);
            const copyright = document.getElementById("sidebar-copyright");
            expect(copyright!.style.display).toBe("none");
        });

        test("shows copyright with app links for app type", () => {
            template.updateFooter("app");
            const copyright = document.getElementById("sidebar-copyright");
            expect(copyright!.innerHTML).toContain("About / FAQ / Privacy");
            expect(copyright!.innerHTML).toContain("GitHub");
            expect(copyright!.innerHTML).toContain("Project Aon");
        });
    });

    describe("renderPage", () => {
        test("wraps content in card div by default", () => {
            const content = document.createElement("div");
            content.id = "test-content";
            content.innerHTML = "<p>Hello</p>";

            template.renderPage(content, { card: true });

            const body = document.getElementById("body");
            const card = body!.querySelector(".page-card");
            expect(card).not.toBeNull();
            expect(card!.contains(content)).toBe(true);
        });

        test("does not wrap when card is false", () => {
            const html = "<p>Direct content</p>";
            template.renderPage(html, { card: false });

            const body = document.getElementById("body");
            expect(body!.querySelector(".page-card")).toBeNull();
            expect(body!.innerHTML).toContain("Direct content");
        });
    });
});
