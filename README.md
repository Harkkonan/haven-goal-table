# Haven Task Table

A local companion calculator for Haven & Hearth task planning.

The first task graph is `Wilderness Beacon`, the friend-spawn structure. The app shows the skill order, materials, tools, dependencies, ready/blocked state, and material summary in a logic-table layout.

Search is intent-aware for the seeded plans. For example, `friend spawn totem` maps to `Wilderness Beacon`, `cut 100 trees down` maps to `Tree Felling Run`, and `build tier 3 home` maps to `Great Hall`.

The catalog also includes source-backed starter outlines for common early goals such as claiming land, building a palisade, crossing rivers, starting mining, making leather, farming crops, building a cabin, adding cupboards, hauling with carts, cooking at a fireplace, and planning a Stonestead.

## Run

```powershell
npm install
npm run dev
```

Then open the local URL printed by Vite.

## Notes

This first slice is a standalone companion app, not a patch to the Steam launcher. The installed Steam folder exposes a launcher JAR and local map/collision databases, but not a recipe/mod plugin folder.
