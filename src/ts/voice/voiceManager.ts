import { state, gameController, routing, CombatMechanics, template, mechanicsEngine, emit } from "..";
import { on } from "../aiNarrator";
import { parseCommand, isWakeWord } from "./commandParser";
import type { VoiceSettings, VoiceState, ParsedCommand } from "./voiceTypes";

/**
 * VoiceMode manager singleton.
 *
 * Orchestrates browser-native TTS (`speechSynthesis`) and STT (`SpeechRecognition`).
 * Subscribes to game events to auto-read sections and accepts spoken commands.
 */

// Web Speech API type shims for older TS lib versions
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
    readonly length: number;
    readonly isFinal: boolean;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
}
interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
}

interface SpeechRecognitionConstructor {
    new (): SpeechRecognition;
}
interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
    onend: ((this: SpeechRecognition, ev: Event) => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
}

declare global {
    interface Window {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
    }
}

const STORAGE_KEY = "voiceSettings";

/** Default voice settings. */
const DEFAULT_SETTINGS: VoiceSettings = {
    enabled: false,
    autoRead: true,
    wakeWord: false,
    voiceName: "",
};

class VoiceManager {

    private settings: VoiceSettings = { ...DEFAULT_SETTINGS };
    private state: VoiceState = "idle";
    private recognition: SpeechRecognition | null = null;
    private wakeWordActive = false;
    private currentSectionText = "";
    private lastChoices: Array<{ text: string; sectionId: string }> = [];
    private hasActiveCombat = false;
    private ttsSupported = false;
    private sttSupported = false;

    constructor() {
        this.ttsSupported = typeof window !== "undefined" && "speechSynthesis" in window;
        this.sttSupported = typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

        this.loadSettings();
        this.subscribeToGameEvents();
    }

    /** Load persisted voice settings from localStorage. */
    private loadSettings() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                this.settings = {
                    enabled: !!parsed.enabled,
                    autoRead: parsed.autoRead !== undefined ? !!parsed.autoRead : true,
                    wakeWord: !!parsed.wakeWord,
                    voiceName: typeof parsed.voiceName === "string" ? parsed.voiceName : "",
                };
            }
        } catch (e) {
            this.settings = { ...DEFAULT_SETTINGS };
        }
    }

    /** Persist voice settings to localStorage. */
    private saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
        } catch (e) {
            // ignore
        }
    }

    /** Return whether voice mode is currently enabled. */
    public isEnabled(): boolean {
        return this.settings.enabled;
    }

    /** Return whether TTS is natively supported. */
    public isTtsSupported(): boolean {
        return this.ttsSupported;
    }

    /** Return whether STT is natively supported. */
    public isSttSupported(): boolean {
        return this.sttSupported;
    }

    /** Return current settings (read-only copy). */
    public getSettings(): VoiceSettings {
        return { ...this.settings };
    }

    /** Update settings and react to changes. */
    public updateSettings(partial: Partial<VoiceSettings>) {
        const wasEnabled = this.settings.enabled;
        Object.assign(this.settings, partial);
        this.saveSettings();

        // Sync with global state
        state.voiceEnabled = this.settings.enabled;
        state.voiceAutoRead = this.settings.autoRead;
        state.voiceWakeWord = this.settings.wakeWord;
        state.persistVoiceSettings();

        if (this.settings.enabled && !wasEnabled) {
            this.enable();
        } else if (!this.settings.enabled && wasEnabled) {
            this.disable();
        }

        this.updateSidebarIcon();
        this.updateIndicator();
    }

    /** Toggle voice mode on/off. */
    public toggle(): boolean {
        this.updateSettings({ enabled: !this.settings.enabled });
        return this.settings.enabled;
    }

    /** Enable voice services. */
    public enable() {
        if (!this.ttsSupported && !this.sttSupported) {
            template.showAlert("Voice mode is not supported in this browser. Please use Chrome or Edge.");
            this.settings.enabled = false;
            this.saveSettings();
            return;
        }

        this.settings.enabled = true;
        this.saveSettings();
        this.updateSidebarIcon();
        this.updateIndicator();

        if (this.sttSupported) {
            this.startRecognition();
        }
    }

    /** Disable voice services. */
    public disable() {
        this.settings.enabled = false;
        this.saveSettings();
        this.stopRecognition();
        this.stopSpeaking();
        this.setState("idle");
        this.updateSidebarIcon();
        this.updateIndicator();
    }

    /** Speak text using the OS-native speech synthesis voice. */
    public speak(text: string) {
        if (!this.ttsSupported || !this.settings.enabled) {
            return;
        }
        this.stopSpeaking();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";

        const voices = window.speechSynthesis.getVoices();
        let preferred: SpeechSynthesisVoice | null = null;

        if (this.settings.voiceName) {
            preferred = voices.find((v) => v.name === this.settings.voiceName) || null;
        }
        if (!preferred) {
            preferred = voices.find((v) => v.lang.startsWith("en") && v.name.includes("Google")) ||
                        voices.find((v) => v.lang.startsWith("en")) ||
                        voices[0] || null;
        }
        if (preferred) {
            utterance.voice = preferred;
        }

        utterance.onstart = () => this.setState("speaking");
        utterance.onend = () => {
            this.setState(this.settings.enabled ? "listening" : "idle");
        };
        utterance.onerror = () => {
            this.setState(this.settings.enabled ? "listening" : "idle");
        };

        window.speechSynthesis.speak(utterance);
    }

    /** Return available offline/local TTS voices filtered to English. */
    public getAvailableVoices(): SpeechSynthesisVoice[] {
        if (!this.ttsSupported) {
            return [];
        }
        const voices = window.speechSynthesis.getVoices();
        return voices.filter((v) => v.lang.startsWith("en") && v.localService);
    }

    /** Populate a select element with available voices. */
    public populateVoiceSelect($select: JQuery<HTMLElement>) {
        const voices = this.getAvailableVoices();
        const current = this.settings.voiceName || "";
        $select.empty();
        $select.append('<option value="">Auto-select</option>');
        voices.forEach((v) => {
            const selected = v.name === current ? ' selected="selected"' : "";
            $select.append(`<option value="${v.name}"${selected}>${v.name}</option>`);
        });
    }

    /** Stop any ongoing speech. */
    public stopSpeaking() {
        if (this.ttsSupported) {
            window.speechSynthesis.cancel();
        }
    }

    /** Re-read the current section text. */
    public repeat() {
        if (this.currentSectionText) {
            this.speak(this.currentSectionText);
        }
    }

    /** Check if there is an active, unresolved combat on the current section. */
    private checkActiveCombat(): boolean {
        if (!state.sectionStates || !state.sectionStates.currentSection) {
            return false;
        }
        const sectionState = state.sectionStates.getSectionState();
        if (!sectionState || !sectionState.combats || sectionState.combats.length === 0) {
            return false;
        }
        return sectionState.combats.some((c) => !c.isFinished() && !sectionState.combatEluded && !c.disabled);
    }

    /** Subscribe to game events for auto-read and state tracking. */
    private subscribeToGameEvents() {
        on("sectionLoaded", (payload) => {
            this.currentSectionText = payload.plainText || "";
            if (this.settings.enabled && this.settings.autoRead && this.currentSectionText) {
                this.speak(this.currentSectionText);
            }
        });

        on("choicesAvailable", (payload) => {
            this.lastChoices = payload.choices || [];
            if (this.settings.enabled && this.settings.autoRead && this.lastChoices.length > 0) {
                const choiceSummary = this.lastChoices
                    .map((c, i) => `${i + 1}: ${c.text}`)
                    .join(". ");
                this.speak("You have " + this.lastChoices.length + " choices. " + choiceSummary);
            }
        });

        on("combatStarted", (payload) => {
            if (this.settings.enabled) {
                this.speak("Combat started against " + payload.enemyName);
            }
        });

        on("combatEnded", (payload) => {
            if (this.settings.enabled) {
                this.speak(payload.playerWon ? "Victory!" : "Defeat.");
            }
        });
    }

    /** Start the speech-recognition engine. */
    private startRecognition() {
        if (!this.sttSupported || this.recognition) {
            return;
        }

        const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Ctor) {
            return;
        }

        try {
            this.recognition = new Ctor();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = "en-US";
            this.recognition.maxAlternatives = 1;

            this.recognition.onresult = (event) => {
                this.handleRecognitionResult(event);
            };

            this.recognition.onerror = (event) => {
                // "aborted" and "no-speech" are benign; restart automatically
                if (event.error === "aborted" || event.error === "no-speech") {
                    return;
                }
                console.warn("[VoiceManager] SpeechRecognition error:", event.error, event.message);
                if (event.error === "not-allowed") {
                    this.setState("error");
                    toastr.warning("Microphone permission denied. Voice commands disabled.");
                }
            };

            this.recognition.onend = () => {
                // Auto-restart if still enabled and not deliberately stopped
                if (this.settings.enabled && this.recognition) {
                    try {
                        this.recognition.start();
                    } catch (e) {
                        // May already be starting
                    }
                }
            };

            this.recognition.start();
            this.setState("listening");
        } catch (e) {
            console.error("[VoiceManager] Failed to start SpeechRecognition:", e);
        }
    }

    /** Stop the speech-recognition engine. */
    private stopRecognition() {
        if (this.recognition) {
            try {
                this.recognition.abort();
            } catch (e) {
                // ignore
            }
            this.recognition = null;
        }
    }

    /** Process a SpeechRecognition result event. */
    private handleRecognitionResult(event: SpeechRecognitionEvent) {
        const result = event.results[event.results.length - 1];
        if (!result || !result[0]) {
            return;
        }

        const transcript = result[0].transcript.trim();

        if (!result.isFinal) {
            // Interim results can be used for visual feedback later
            return;
        }

        console.log("[VoiceManager] Heard:", transcript);

        // Wake-word gate
        if (this.settings.wakeWord) {
            if (!this.wakeWordActive) {
                if (isWakeWord(transcript)) {
                    this.wakeWordActive = true;
                    this.setState("processing");
                    this.speak("Yes?");
                    // Auto-reset wake-word gate after 5 seconds of silence
                    window.setTimeout(() => { this.wakeWordActive = false; }, 5000);
                }
                return;
            }
            // Once wake word is active, process the current utterance then close the gate
            this.wakeWordActive = false;
        }

        const cmd = parseCommand(
            transcript,
            this.lastChoices.length > 0,
            this.checkActiveCombat()
        );

        if (cmd) {
            this.executeCommand(cmd, transcript);
        }
    }

    /** Execute a parsed voice command. */
    private executeCommand(cmd: ParsedCommand, rawText: string) {
        this.setState("processing");

        switch (cmd.type) {
            case "ttsControl": {
                if (cmd.action === "read") {
                    this.repeat();
                } else if (cmd.action === "stop") {
                    this.stopSpeaking();
                    this.setState("listening");
                } else if (cmd.action === "repeat") {
                    this.repeat();
                }
                break;
            }
            case "navigate": {
                this.speak("Opening " + cmd.target.replace(/([A-Z])/g, " $1").toLowerCase());
                routing.redirect(cmd.target);
                break;
            }
            case "choice": {
                const choice = this.lastChoices[cmd.index - 1];
                if (choice) {
                    this.speak("Choosing option " + cmd.index);
                    gameController.loadSection(choice.sectionId, true);
                } else {
                    this.speak("That choice is not available.");
                }
                break;
            }
            case "combatTurn": {
                if (this.checkActiveCombat()) {
                    const $btn = $(CombatMechanics.PLAY_TURN_BTN_SELECTOR).first();
                    if ($btn.length > 0 && $btn.is(":visible")) {
                        this.speak("Playing combat turn.");
                        $btn.trigger("click");
                    } else {
                        this.speak("No active combat turn available.");
                    }
                }
                break;
            }
            case "combatElude": {
                if (this.checkActiveCombat()) {
                    const $btn = $(CombatMechanics.ELUDE_BTN_SELECTOR).first();
                    if ($btn.length > 0 && $btn.is(":visible")) {
                        this.speak("Eluding combat.");
                        $btn.trigger("click");
                    } else {
                        this.speak("Cannot elude right now.");
                    }
                }
                break;
            }
            default:
                break;
        }

        // Return to listening after a short delay (unless we just started speaking)
        if (this.state !== "speaking") {
            window.setTimeout(() => this.setState("listening"), 600);
        }
    }

    /** Update the internal state and refresh the in-game indicator. */
    private setState(newState: VoiceState) {
        this.state = newState;
        this.updateIndicator();
    }

    /** Update the sidebar voice icon to reflect on/off state. */
    public updateSidebarIcon() {
        const $icon = $("#sidebar-voiceIcon");
        const $label = $("#sidebar-voiceLabel");
        if ($icon.length === 0) {
            return;
        }
        if (this.settings.enabled) {
            $icon.removeClass("glyphicon-volume-off").addClass("glyphicon-volume-up");
            $label.text("Voice: On");
            $("#sidebar-voiceMode").addClass("voice-active");
        } else {
            $icon.removeClass("glyphicon-volume-up").addClass("glyphicon-volume-off");
            $label.text("Voice: Off");
            $("#sidebar-voiceMode").removeClass("voice-active");
        }
    }

    /** Update the floating in-game voice indicator. */
    public updateIndicator() {
        const $indicator = $("#voice-indicator");
        if ($indicator.length === 0) {
            return;
        }
        if (!this.settings.enabled) {
            $indicator.hide();
            return;
        }
        $indicator.show();
        $indicator.removeClass("voice-idle voice-listening voice-speaking voice-processing voice-error");

        switch (this.state) {
            case "idle":
                $indicator.addClass("voice-idle");
                $indicator.find(".voice-text").text("Voice ready");
                break;
            case "listening":
                $indicator.addClass("voice-listening");
                $indicator.find(".voice-text").text("Listening...");
                break;
            case "speaking":
                $indicator.addClass("voice-speaking");
                $indicator.find(".voice-text").text("Speaking...");
                break;
            case "processing":
                $indicator.addClass("voice-processing");
                $indicator.find(".voice-text").text("Processing...");
                break;
            case "error":
                $indicator.addClass("voice-error");
                $indicator.find(".voice-text").text("Mic error");
                break;
            default:
                $indicator.addClass("voice-idle");
                break;
        }
    }
}

/** Global voice manager instance. */
export const voiceManager = new VoiceManager();
