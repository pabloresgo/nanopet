# Nanopet

A Tamagotchi-style virtual pet that runs in the browser. Adopt a cat or a dog, give it a name, and keep it fed, happy, clean, rested and healthy as it grows from a baby into an adult.

Play it at https://pabloresgo.github.io/nanopet/

## How to play

- **Feed** opens a food menu: a free **Meal**, or a **Snack** or **Treat** that cost coins and make your pet happier.
- **Play** offers a quick game of ball, or **Catch the treats**, a 20-second mini-game that earns coins (⭐ is worth 3).
- **Clean** removes poop and gives a bath.
- **Medicine** cures sickness and restores health.
- **Sleep / Wake** turns the lights off and on. Pets rest faster in the dark, and fall asleep on their own when exhausted.
- Five meters show **Hunger, Happy, Energy, Clean and Health**. If health runs out, your pet passes away.
- Your pet grows from **baby** to **child** (1 hour) to **adult** (4 hours). A well-cared-for adult wears a bow or bandana.
- Time keeps passing while the page is closed. Progress is saved in your browser.
- Add `?fast` to the URL to make one game minute pass every second, which is handy for testing.

## Run it locally

No build step is needed. Serve the folder and open it in a browser:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000.

## Tests

Requires Node.js 20 or later.

```bash
npm test
```

The tests cover the game rules, the pet art, saving, the mini-game, and a check that every file the page loads exists.

## Deployment

Pushes to `main` deploy the site to GitHub Pages through `.github/workflows/pages.yml`.

## Project layout

```
index.html          screens, dialogs and meters
css/style.css       theme, layout, room scene, dialogs
css/pet.css         pet animations (moods, actions, effects)
js/pet.js           game rules (no DOM)
js/pet-art.js       builds the cat and dog SVG for each stage and mood
js/minigame.js      "Catch the treats" rules and canvas runner
js/sound.js         sound effects (Web Audio, no files)
js/storage.js       save/load in localStorage
js/ui.js            rendering, effects, menus, toasts
js/main.js          entry point, clock and wiring
tests/              unit and site checks
.github/workflows   CI and Pages deployment
```

## License

Released under the [MIT License](LICENSE).

## Disclaimer

Nanopet is an independent fan project. It is not affiliated with, endorsed by, or sponsored by Bandai. Tamagotchi is a trademark of Bandai Co., Ltd., used here only to describe the style of game.
