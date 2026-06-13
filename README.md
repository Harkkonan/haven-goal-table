# Haven Goal Table

A local companion calculator for Haven & Hearth goal planning.

The curated goal graphs include `Wilderness Beacon`, the friend-spawn structure, and deeper starter paths like `Stonestead`. The app shows skill order, materials, tools, dependencies, ready/blocked state, and material summary in a logic-table layout.

Search is intent-aware for the seeded plans. For example, `friend spawn totem` maps to `Wilderness Beacon`, `cut 100 trees down` maps to `Tree Felling Run`, and `build tier 3 home` maps to `Great Hall`.

The catalog also includes source-backed starter outlines for common early goals such as claiming land, building a palisade, crossing rivers, starting mining, making leather, farming crops, building a cabin, adding cupboards, hauling with carts, cooking at a fireplace, and planning a Stonestead.

The broad catalog is generated from Ring of Brodgar through the MediaWiki API and committed as static JSON at `src/data/generated/ringGoals.json`. Curated goals are loaded first and generated wiki outlines are de-duplicated by goal name, so hand-authored dependency paths stay preferred while the app still has broad search coverage.

## Run

```powershell
npm install
npm run dev
```

Then open the local URL printed by Vite.

## Refresh Ring of Brodgar goals

```powershell
npm run scrape:goals
npm run test
npm run build
```

The scraper is intentionally separate from `npm run build` so published Docker/static builds do not depend on live wiki access.

## Docker

```powershell
docker build -t haven-goal-table .
docker run --rm -p 8080:80 haven-goal-table
```

Then open `http://127.0.0.1:8080/`.

## Notes

This first slice is a standalone companion app, not a patch to the Steam launcher. The installed Steam folder exposes a launcher JAR and local map/collision databases, but not a recipe/mod plugin folder.
