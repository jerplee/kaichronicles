## Kai Chronicles

[Kai Chronicles](https://kaichronicles.projectaon.org) is a game player for Lone Wolf game books. Books 1 - 29 are playable. The game player can run as a website.

This fork builds on the work of [cracrayol](https://github.com/cracrayol/kaichronicles), who continued the [original Kai Chronicles](https://github.com/tonib/kaichronicles) by tonib after development ended in 2021.

I played Book 8 when I was a kid, but I could never afford to get the rest of the books and when I stumbled upon Project Aon, it was a gift to my old child self. I was amazed by the generosity of Joe Dever to make this series available to his fans and just as amazed by the community that build tools like Kai Chronicles to make it even more accessible. 

When I first downloaded this project, it needed a little TLC to run cleanly. I fixed the outstanding bugs, polished the UI, and added a few quality-of-life improvements — all without touching the core game logic, which is faithfully preserved. Game logic changes were only made where a bug had already been documented. If something feels unfair, it is probably the books, not the code.

This repository does not contain game books data. Data must be downloaded from the [Project Aon web site](https://www.projectaon.org).

**REMEMBER** that game books data is under the [Project Aon license](https://www.projectaon.org/en/Main/License), so:

* You cannot put this application on a **public web server** or redistribute it. The only place where this game can be published publicly is on the Project Aon web site: https://kaichronicles.projectaon.org. Running it locally on your machine or a private local network for personal use is fine.
* You cannot redistribute the game books data in any way.

## Setup

Download dependencies
```bash
npm install
```

Download the Project Aon game data:
```bash
npm run downloaddata
```

This will require Node.js (any recent version).

### Setup web site

```bash
npm run serve
```
Open your browser on http://localhost:3000.

### Setup a Docker image
Optional method for running a local website only to play the game
 * Download and install [Docker](https://docs.docker.com/install/) and make sure it's is in your PATH environment variable
 * Using a terminal (Linux or iOS) or PowerShell (Windows 10) navigate to the project's directory
 * Type `docker build -t kai:1.18 .`
 * Type `docker run -p 8080:8080 kai:1.18`
 * Open http://localhost:8080
 
More information about this method [here](./doc/README-docker.md)

### Save System

The game uses **IndexedDB** for local save storage. Up to three fixed save slots are available on the main menu. Each slot can be:

- **Continued** — resume an existing save
- **Renamed** — change the display name
- **Deleted** — clear the slot
- **Uploaded** — import a previously exported `.json` save file
- **New Game** — start a fresh game in an empty slot (with a character name prompt)

As you play, the active slot is saved automatically on every section change and significant game event. An additional auto-save slot is maintained as a fallback. All save data stays in your browser; no server is involved.

Saved games can also be exported to `.json` files and imported later, or shared between devices.

### Developing 

Game rules for each book are located at [www/data](www/data). "mechanics-X" are the game rules for the book X. "objects.xml" are the game objects

There is (unfinished) documentation for [rules](doc/README-mechanics.md), [object formats](doc/README-objects.md) and [save game file format](doc/README-savegames.md) (note: this describes the legacy JSON export format; the internal IndexedDB storage uses the same underlying structure).

The game rules implementation are at src/ts/controller/mechanics and www/controller/mechanics.

If you add "?debug=true" to the game URL, some debug tools will appear.
You also can use the browser Developer Tools to prepare the Action Chart to test individual sections.
For example, in the console you can execute things like:
```javascript
kai.actionChartController.pick('axe')
kai.actionChartController.increaseMoney(-10)
```

You can run ESLint with this command:

```bash
npm run lint
```

A "guide" to develop new books can be found at [doc/README-developing.md](doc/README-developing.md)

### Progressive Web App (PWA) Development

Kai Chronicles has been extended to act as a PWA.  It can be added to the home screen of a mobile phone, or as an app in Windows.  The app will continue to function offline due to caching of assets, though the books are not predownloaded, so starting a New Game will fail unless you have already started the book before.

Of course, asset caching complicates development, not least because webpack-dev-server doesn't play nice with the precaching mechanism (https://github.com/GoogleChrome/workbox/issues/1790).  Therefore, the caching and PWA functionality should be disabled while developing.  

If you want to specifically develop PWA features:
1) Comment out:
        `if (environment !== EnvironmentType.Development)`
  in app.ts
2) Make your changes to the app
3) Run:
      `npm run predist`
   to regenerate the service worker code
4) Run a dedicated http server other than webpack-dev-server:
      `npx http-server ./www`
5) Open the app at:
      `http://localhost:8080`

After finishing, be sure to reverse the change from step 1 before committing changes.  Hopefully this process can be improved in the future, but there shouldn't be frequent changes to the PWA functionality.

### Tests

Tests are run with Selenium Web Driver and Jest. Currently tests will run only with Chrome, and Selenium will need a "browser driver". See https://www.selenium.dev/documentation/en/webdriver/driver_requirements for installation instructions. Tests are located at src/ts/tests. Be sure Typescript for node.js is compiled before running tests:

```bash
npm run test
```

### Create a distribution

```bash
npm run dist
```

This will create a dist folder ready to be published on a web server.

### License

GPLv3 (see LICENSE file). This application uses the following third-party code / resources:

* The HTML rendering, books XML processing and Project Aon license HTML contains code
  taken from Lone Wolf Adventures, by Liquid State Limited
* The Lone Wolf logo and splashes are taken directly, or adapted, from the 
  [Spanish Project Aon](https://projectaon.org/es)
* Button icons are create by [Delapouite](http://delapouite.com/), 
  [Lorc](http://lorcblog.blogspot.com/) and [Willdabeast](http://wjbstories.blogspot.com/),
  and distributed from [http://game-icons.net/](http://game-icons.net/) 
  ([CC License](https://creativecommons.org/licenses/by/3.0/))
* [Bootstrap](http://getbootstrap.com/) (MIT)
* [Toastr](https://github.com/CodeSeven/toastr) (MIT)
* [FileSaver.js](https://github.com/eligrey/FileSaver.js/) (MIT)
* [jQuery](https://jquery.com/) (jQuery license)
* [xml.js](https://github.com/kripken/xml.js/), code taken from 
  [http://syssgx.github.io/xml.js/](http://syssgx.github.io/xml.js/) ([CC License](https://creativecommons.org/licenses/by/3.0/))
