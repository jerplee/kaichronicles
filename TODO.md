TODO
====

## Completed in this update

- ~~Unified About/FAQ/Privacy/License page into a single `aboutApp` page with full Project Aon license text~~
- ~~Added GitHub repository link to app footer alongside Project Aon link~~
- ~~Replaced main menu grid with a single-column stacked save-slot card layout~~
- ~~Added hero banner carousel with a random book cover on each visit; "Books 1–29" subtitle centered over it~~
- ~~Fixed delete save confirmation modal text to read "Confirm delete of save \"[name]\"?"~~
- ~~Added stats icon (`glyphicon-stats`) to sidebar Action Chart link~~
- ~~Added user-selectable font family (Noto Sans / Merriweather) via Settings; persisted to localStorage~~
- ~~Added text-size selector (Normal / Large) to Settings~~
- ~~Added hunting availability indicator to sidebar and Action Chart~~
- ~~Replaced/refactored modal dialog system (removed hardcoded "Alert" titles from message/confirm dialogs)~~
- ~~Reordered sidebar: Main Menu now appears above Settings~~
- ~~Added README disclaimer: "This software is provided as-is, without warranty or official support"~~
- ~~Added README note that Docker setup has not been tested after recent UI/build updates~~

## Gameplay

- Replace list of items with available object list ??
- Get Magnakai bonuses as specified in the handbook (See Healing for example)
- Get Kai/Magnakai bonuses as specified in the handbook (See Healing for example)
  * https://github.com/tonib/kaichronicles/issues/5
  * https://www.projectaon.org/es/foro3/viewtopic.php?p=27752#p27752
- Add a "random discipline" button that will randomly select the proper number of initial disciplines, as well as your bonus discipline each book from the choices remaining
- Add a Seventh-Sense-like achievement system

## Bugs

- You are erroneously allowed to apply multiple Alether effects per combat. You are always limited to one (the berries you can purchase in book 6 even explicitly say so).
- Action chart buttons don't work on iPad Safari
- ERROR: Book 8, sect139:
  ```actionChartController.pick('quiver'); actionChartController.pick('quiver'); actionChartController.increaseArrows(10);```
  Sell Quiver: OBJECTS TABLE TO SELL IS NOT UPDATED !!!!

## Development / refactorings (TO DO NOW)
- Test load previous savegame / state versions to v1.12 !!!
- In Grand Master books, if you have Psi-surge, check the bonus for Mindblast
- IMPROVE TESTING
- Change documentation about save games file format (changes in 1.12)
- Loyalty bonus for hunting should be applied to Grand Master too?

## Books erratas to report
- All book 13: Bow bonus should be +5 ???

## Other
- Allow to zoom illustrations?
- Add images to disciplines in Action Chart
- Add option to jump from one book to other (debugging, loyalty bonuses)
- FAQ: Add info about change the Random Table
- Add help for "LW club newsletter 29" setting
- Warn about permanent losses (toastr)
- Object images on book 9+: Use the current book image, if available
- Performance
- "Okay okay. Didn't know about the lone wolf series and went through the 10 programmed books in 2 days. Turns out the rest are online !!! 
   So it won't be as fast to play but I'm definitely continuing. One remark. I'd like to be able to know what was in the Kai monastery at 
   the end so I can continue with that too !"
- Suggestions and bugs on http://projectaon.proboards.com/post/43740
- Allow to select the current bow
- Toasts with images: align text when the text is multiline
- Combats should be sequential: First finish the first one, then the second, etc
- Common performance (web):
  * Rendering performance on book 2 / sect equimpnt
- Test all books / all sections rendering. It should be valid HTML5
  (https://validator.w3.org/docs/api.html)
- Test tags <ch.* /> replacements
- Dialogs with text input: Allow to confirm with the screen keyboard ("go" button)
- Add erratas section?
- Add illustrations index?
- Mechanics: Allow to declare a set of rules that can be runned on multiple sections. See book 12, references to sect208 
  ("Sommerswerd stuff", repeated rules)
- Allow to add a concept description for combat skill modifiers rules on combat ratio explanation
- Display concepts for objects usages (Adgana, etc) on combat ratio explanation
- Display book 11 map ("Northern magnamund") somewhere?
- Add music?


* Save tests results to file
No format:
npm run test -- --no-color 2> tests_log.txt

JSON:
npm run test -- --json --outputFile=output.json

* Debug Jest
node --inspect-brk node_modules/.bin/jest --runInBand [any other arguments here]
add "debugger" command to the test to debug
open chrome://inspect/ > Open dedicated DevTools for Node
F8 (resume execution)

