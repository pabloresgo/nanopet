# Nanopet

A small Tamagotchi-style virtual pet that runs in the browser. Choose a cat or a dog, then keep it fed, happy, clean and healthy as it grows up.

## How to play

- **Feed** lowers hunger (the Fullness bar).
- **Play** raises happiness.
- **Clean** removes poop. Poop left too long can make your pet sick.
- **Medicine** cures sickness.
- Your pet keeps aging while the page is closed. Progress is saved in your browser's localStorage.
- If your pet stays starving or sick for too long, it dies. Press **Start over** to begin again.

## Run it locally

No build step is needed. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000.

## Tests

Requires Node.js 20 or later.

```bash
npm test
```

The tests cover the game logic (`tests/pet.test.js`) and check that the page's files and imports exist (`tests/site.test.js`).

## Deployment

Pushes to `main` deploy the site to GitHub Pages through `.github/workflows/pages.yml`. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.

## Project layout

```
index.html        page layout
css/style.css     styling
js/pet.js         game logic (no DOM)
js/sprites.js     pixel-art sprites for cat and dog
js/storage.js     localStorage save/load
js/ui.js          drawing and status display
js/main.js        entry point, clock and buttons
tests/            unit and site checks
.github/workflows CI and Pages deployment
```

## License

Released under the [MIT License](LICENSE).

## Disclaimer

Nanopet is an independent fan project. It is not affiliated with, endorsed by, or sponsored by Bandai. Tamagotchi is a trademark of Bandai Co., Ltd., used here only to describe the style of game.
