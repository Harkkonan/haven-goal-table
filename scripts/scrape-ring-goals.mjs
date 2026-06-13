import fs from "node:fs/promises";
import path from "node:path";

const API_URL = "https://ringofbrodgar.com/api.php";
const SOURCE = "Ring of Brodgar";
const OUTPUT_PATH = path.join("src", "data", "generated", "ringGoals.json");

const CATEGORY_SEEDS = [
  "Buildings",
  "Housing",
  "Shelter",
  "Special Structures",
  "Immobile Structures",
  "Liftable Structures",
  "Containers",
  "Furniture",
  "Light Sources",
  "Tools",
  "Crafting Tools",
  "Sharp Tools",
  "Mining Tools",
  "Fishing Equipment",
  "Equipment",
  "Armor",
  "Clothing",
  "Backpacks",
  "The Symbel",
  "Hearth Magics",
  "Skills",
  "Crops",
  "Farming",
  "Fishing",
  "Mining",
  "Foods",
  "Baked Goods",
  "Dairy",
  "Cheeses",
  "Sausages",
  "Meat Dishes",
  "Processed Foods",
];

const SKIP_CATEGORIES = new Set([
  "Content",
  "Objects",
  "Equipment",
  "Game",
  "GenericTypePage",
  "Legacy",
  "Localized Resource",
  "Objects Generic",
]);

const MATERIAL_ROUTES = new Map([
  [
    "board",
    {
      method: "Cut trees into logs, equip a Bone Saw or Metal Saw, right-click a log, then choose Make boards",
      details: "Boards require Carpentry, a log, and a saw. Metal saws make more boards per log than bone saws.",
    },
  ],
  [
    "block",
    {
      name: "Block of Wood",
      method: "Cut trees into logs, then use an axe on logs, bushes, or stumps",
      details: "A stone axe is enough to start; a metal axe gives more blocks from logs.",
    },
  ],
  [
    "block of wood",
    {
      method: "Cut trees into logs, then use an axe on logs, bushes, or stumps",
      details: "A stone axe is enough to start; a metal axe gives more blocks from logs.",
    },
  ],
  [
    "log",
    {
      method: "Buy Lumberjacking, craft or equip an axe, then chop trees",
      details: "Logs are the input for boards and blocks. Clear ground around the log before processing it.",
    },
  ],
  [
    "stone",
    {
      method: "Right-click boulders and chip stone, or mine stone underground",
      details: "Surface boulders are the early route. Mining is the scalable fallback when surface stone is scarce.",
    },
  ],
  [
    "thatching material",
    {
      method: "Gather accepted thatching objects such as boughs, straw, or tar",
      details: "Buildings that require thatching accept any combination of thatching-class materials.",
    },
  ],
  [
    "leather",
    {
      method: "Butcher hides, dry them on a Drying Frame, then tan them in a Tanning Tub with water and treebark",
      details: "Leather is time-gated: hides dry first, then tanning fluid converts dried hides into leather.",
    },
  ],
  [
    "hardened leather",
    {
      method: "Make leather first, then harden it with wax",
      details: "Hardened leather depends on the leather chain plus a wax source such as beeswax or candleberry wax.",
    },
  ],
  [
    "bone glue",
    {
      method: "Boil bones with water in a cauldron",
      details: "Bone glue sits behind the bone and cauldron/water chain and appears in many starter constructions.",
    },
  ],
  [
    "rope",
    {
      method: "Buy Rope Twining, build or use a Rope Walk, then craft rope from 10 strings",
      details: "Rope is a processed string product, not a raw forage item.",
    },
  ],
  [
    "string",
    {
      method: "Gather or process string-capable fibers such as plant fibre, flax, hemp, or similar inputs",
      details: "Many recipes accept generic string-class items.",
    },
  ],
  [
    "branch",
    {
      method: "Pick branches from trees or split blocks of wood",
      details: "Branches are common early fuel and tool inputs.",
    },
  ],
  [
    "tree bough",
    {
      method: "Pick boughs from valid trees by hand, or chop boughs when an axe is needed",
      details: "Tree boughs are used for early saws, bows, and thatching-style needs.",
    },
  ],
  [
    "bone material",
    {
      method: "Butcher small game or collect bones from skeletons",
      details: "Discover bone yourself before bone-tool recipes appear.",
    },
  ],
  [
    "bar of any metal",
    {
      method: "Trade for bars, or smelt 10 same-type metal nuggets into each bar",
      details: "Self-production requires the mining and smelting chain; trading is often simpler for early builds.",
    },
  ],
  [
    "bar of common metal",
    {
      method: "Trade for bars, or mine ore, smelt nuggets, then combine 10 same-type nuggets into each bar",
      details: "Common metal bars come from the metalworking chain.",
    },
  ],
  [
    "bar of hard metal",
    {
      method: "Trade for hard metal, or produce qualifying metal bars through mining and smelting",
      details: "Hard metal is a metal class; the exact metal type can vary by recipe.",
    },
  ],
  [
    "brick",
    {
      method: "Dig clay, make unfired bricks, then fire them in a kiln",
      details: "Bricks require the clay and kiln chain.",
    },
  ],
  [
    "clay",
    {
      method: "Dig clay from clay terrain, riverbeds, shallows, caves, or other clay sources",
      details: "The exact source depends on local terrain and discovered materials.",
    },
  ],
  [
    "water",
    {
      method: "Use a bucket, waterskin, or other container at water or a well",
      details: "Many production chains need water as a carried liquid.",
    },
  ],
  [
    "wax",
    {
      method: "Use beeswax or another accepted wax source",
      details: "Wax is commonly tied to beekeeping or candleberry routes.",
    },
  ],
]);

const CATEGORY_ALIASES = new Map([
  ["Housing", ["house", "home", "base", "indoor storage"]],
  ["Buildings", ["build", "construction", "structure"]],
  ["Containers", ["storage", "store items", "container"]],
  ["Furniture", ["furniture", "decorate", "indoor"]],
  ["Light Sources", ["light", "fire", "cook"]],
  ["Tools", ["tool", "equipment", "craft"]],
  ["Crafting Tools", ["tool", "crafting"]],
  ["Sharp Tools", ["cut", "chop", "tool"]],
  ["Mining Tools", ["mine", "ore", "stone"]],
  ["Fishing Equipment", ["fish", "fishing"]],
  ["Armor", ["armor", "protect"]],
  ["Clothing", ["clothes", "wear"]],
  ["Skills", ["skill", "learn", "unlock"]],
  ["Crops", ["farm", "crop", "seed"]],
  ["Foods", ["food", "cook", "eat"]],
  ["Baked Goods", ["bake", "oven", "food"]],
  ["Cheeses", ["cheese", "dairy"]],
  ["Sausages", ["sausage", "food"]],
]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function wikiUrl(title) {
  return `https://ringofbrodgar.com/wiki/${encodeURIComponent(title.replaceAll(" ", "_"))}`;
}

function cleanTitle(title) {
  return title.replace(/^Category:/, "").trim();
}

function canonicalName(title) {
  const route = MATERIAL_ROUTES.get(title.toLowerCase());
  return route?.name ?? cleanTitle(title);
}

function normalizeMaterialKey(title) {
  return cleanTitle(title)
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchJson(params) {
  const url = new URL(API_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": "HavenGoalTable/0.1 local companion app data refresh",
    },
  });

  if (!response.ok) {
    throw new Error(`Ring of Brodgar API failed ${response.status} for ${url}`);
  }

  return response.json();
}

async function getCategoryPages(category) {
  const titles = [];
  let cmcontinue;

  do {
    const json = await fetchJson({
      action: "query",
      list: "categorymembers",
      cmtitle: `Category:${category}`,
      cmlimit: "500",
      cmnamespace: "0",
      format: "json",
      ...(cmcontinue ? { cmcontinue } : {}),
    });

    titles.push(...(json.query?.categorymembers ?? []).map((page) => page.title));
    cmcontinue = json.continue?.cmcontinue;
    await sleep(80);
  } while (cmcontinue);

  return titles;
}

async function getPages(titles) {
  const pages = [];

  for (let index = 0; index < titles.length; index += 50) {
    const batch = titles.slice(index, index + 50);
    const json = await fetchJson({
      action: "query",
      prop: "revisions",
      rvprop: "content",
      rvslots: "main",
      titles: batch.join("|"),
      format: "json",
    });

    pages.push(...Object.values(json.query?.pages ?? {}));
    await sleep(120);
  }

  return pages
    .filter((page) => !page.missing)
    .map((page) => ({
      title: page.title,
      content: page.revisions?.[0]?.slots?.main?.["*"] ?? "",
    }))
    .filter((page) => page.content && !page.content.trim().startsWith("#REDIRECT"));
}

function extractTemplate(content, prefix) {
  const start = content.toLowerCase().indexOf(`{{${prefix.toLowerCase()}`);
  if (start === -1) {
    return "";
  }

  let depth = 0;
  for (let index = start; index < content.length - 1; index += 1) {
    const pair = content.slice(index, index + 2);
    if (pair === "{{") {
      depth += 1;
      index += 1;
    } else if (pair === "}}") {
      depth -= 1;
      index += 1;
      if (depth === 0) {
        return content.slice(start, index + 1);
      }
    }
  }

  return "";
}

function parseTemplateFields(template) {
  const fields = {};
  const lines = template.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(1, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim();
    fields[key] = value;
  }

  return fields;
}

function extractCategories(content) {
  const categories = [];
  const regex = /\[\[Category:([^\]|]+)(?:\|[^\]]*)?\]\]/g;
  let match;

  while ((match = regex.exec(content))) {
    const category = match[1].trim();
    if (!SKIP_CATEGORIES.has(category)) {
      categories.push(category);
    }
  }

  return [...new Set(categories)];
}

function splitTopLevelPipes(value) {
  const parts = [];
  let current = "";
  let bracketDepth = 0;
  let braceDepth = 0;

  for (let index = 0; index < value.length; index += 1) {
    const pair = value.slice(index, index + 2);
    if (pair === "[[") {
      bracketDepth += 1;
      current += pair;
      index += 1;
      continue;
    }
    if (pair === "]]") {
      bracketDepth -= 1;
      current += pair;
      index += 1;
      continue;
    }
    if (pair === "{{") {
      braceDepth += 1;
      current += pair;
      index += 1;
      continue;
    }
    if (pair === "}}") {
      braceDepth -= 1;
      current += pair;
      index += 1;
      continue;
    }
    if (value[index] === "|" && bracketDepth === 0 && braceDepth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += value[index];
  }

  parts.push(current);
  return parts;
}

function extractGameMenu(content) {
  const template = extractTemplate(content, "GM");
  if (!template) {
    return "";
  }

  const inner = template.slice(2, -2);
  return splitTopLevelPipes(inner)
    .slice(1)
    .map((part) => cleanText(part.replaceAll("$", "")))
    .filter(Boolean)
    .join(" > ");
}

function cleanText(value) {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<ref[^>]*>.*?<\/ref>/gis, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[\[(?:requires::)?([^|\]]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[(?:requires::)?([^\]]+)\]\]/g, "$1")
    .replace(/\{\{[^{}]*\}\}/g, " ")
    .replace(/'''/g, "")
    .replace(/''/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractRequirements(value) {
  const requirements = [];
  if (!value || /^(none|no)$/i.test(cleanText(value))) {
    return requirements;
  }

  const regex = /\[\[(?:requires::)?([^|\]]+)(?:\|[^\]]+)?\]\]\s*(?:x\s*([0-9.]+))?/g;
  let match;

  while ((match = regex.exec(value))) {
    const rawTitle = cleanTitle(match[1]);
    if (!rawTitle || rawTitle.startsWith("#")) {
      continue;
    }

    requirements.push({
      title: canonicalName(rawTitle),
      sourceTitle: rawTitle,
      quantity: match[2] ? match[2] : "",
    });
  }

  return dedupeRequirements(requirements);
}

function dedupeRequirements(requirements) {
  const byTitle = new Map();

  for (const requirement of requirements) {
    const key = normalizeMaterialKey(requirement.title);
    if (!byTitle.has(key)) {
      byTitle.set(key, requirement);
    }
  }

  return [...byTitle.values()];
}

function parseSkillPrerequisites(value) {
  if (!value) {
    return [];
  }

  return value
    .split(/,|<br\s*\/?>|\band\b/gi)
    .map((skill) => cleanText(skill))
    .map((skill) => skill.replace(/\s*\([^)]*\)\s*/g, "").trim())
    .filter((skill) => skill && !/^(none|no)$/i.test(skill))
    .map((skill) => ({ title: skill, sourceTitle: skill, quantity: "" }));
}

function extractSectionSummary(content) {
  const sectionNames = [
    "How to Acquire",
    "How to Make",
    "How to",
    "How to Use",
    "Notes",
  ];

  for (const sectionName of sectionNames) {
    const regex = new RegExp(`==\\s*${sectionName}\\s*==([\\s\\S]*?)(?=\\n==[^=]|$)`, "i");
    const match = content.match(regex);
    if (!match) {
      continue;
    }

    const summary = cleanText(match[1].split("\n").filter((line) => !line.trim().startsWith("*")).join(" "));
    if (summary) {
      return summary.length > 280 ? `${summary.slice(0, 277)}...` : summary;
    }
  }

  const prose = cleanText(
    content
      .replace(extractTemplate(content, "infobox"), "")
      .split("\n")
      .filter((line) => !line.startsWith("[[Category:") && !line.startsWith("{{GM"))
      .join(" "),
  );

  return prose.length > 280 ? `${prose.slice(0, 277)}...` : prose;
}

function materialRoute(requirement) {
  const route = MATERIAL_ROUTES.get(normalizeMaterialKey(requirement.title));
  if (route) {
    return route;
  }

  return {
    method: `Gather, craft, or trade for ${requirement.title}`,
    details: `${requirement.title} is listed by Ring of Brodgar as an input for this goal. Follow its linked wiki page for the exact acquisition chain if it is not already in your base supply.`,
  };
}

function categoryForGoal(categories, fallback) {
  const useful = categories.find((category) => !SKIP_CATEGORIES.has(category));
  return useful ?? fallback;
}

function aliasesForGoal(title, categories, isSkill) {
  const aliases = new Set([
    title,
    `get ${title}`,
    `make ${title}`,
    `craft ${title}`,
    `build ${title}`,
  ].map((alias) => alias.toLowerCase()));

  if (isSkill) {
    aliases.add(`learn ${title.toLowerCase()}`);
    aliases.add(`unlock ${title.toLowerCase()}`);
    aliases.add(`buy ${title.toLowerCase()} skill`);
  }

  for (const category of categories) {
    for (const alias of CATEGORY_ALIASES.get(category) ?? []) {
      aliases.add(alias);
    }
  }

  return [...aliases].slice(0, 12);
}

function pageKind(fields, categories) {
  if ("skill_cost" in fields || "skills_required" in fields || categories.includes("Skills")) {
    return "skill";
  }
  if (categories.some((category) => category.includes("Building") || category === "Housing" || category === "Shelter")) {
    return "build";
  }
  return "craft";
}

function finalVerb(kind) {
  if (kind === "skill") {
    return "Unlock";
  }
  if (kind === "build") {
    return "Build";
  }
  return "Make";
}

function gerundForGoal(kind, title) {
  if (kind === "skill") {
    return `learning ${title}`;
  }
  if (kind === "build") {
    return `building ${title}`;
  }
  return `making ${title}`;
}

function rowId(prefix, title, index) {
  return `${prefix}-${slugify(title)}-${index}`;
}

function makeGoal(page) {
  const infobox = extractTemplate(page.content, "infobox");
  if (!infobox) {
    return null;
  }

  const fields = parseTemplateFields(infobox);
  const categories = extractCategories(page.content);
  const kind = pageKind(fields, categories);
  const isSkill = kind === "skill";
  const title = cleanTitle(page.title);
  const sourceUrl = wikiUrl(page.title);
  const menuPath = extractGameMenu(page.content);
  const acquisition = extractSectionSummary(page.content);

  const skillRequirements = isSkill
    ? parseSkillPrerequisites(fields.skills_required)
    : extractRequirements(fields.skillreq);
  const materialRequirements = extractRequirements(fields.objectsreq);
  const toolRequirements = extractRequirements(fields.producedby).filter((requirement) => requirement.title !== "Hand");
  const rows = [];

  for (const requirement of skillRequirements) {
    const id = rowId("skill", requirement.title, rows.length + 1);
    rows.push({
      id,
      kind: "skill",
      name: requirement.title,
      order: rows.length + 1,
      quantity: requirement.quantity || undefined,
      required: true,
      dependsOn: [],
      source: SOURCE,
      sourceUrl: wikiUrl(requirement.sourceTitle),
      method: `Unlock ${requirement.title} before ${gerundForGoal(kind, title)}`,
      details: `${requirement.title} is listed as a required skill for ${title}.`,
    });
  }

  for (const requirement of toolRequirements) {
    const id = rowId("tool", requirement.title, rows.length + 1);
    rows.push({
      id,
      kind: "tool",
      name: requirement.title,
      order: rows.length + 1,
      quantity: requirement.quantity || undefined,
      required: true,
      dependsOn: [],
      source: SOURCE,
      sourceUrl: wikiUrl(requirement.sourceTitle),
      method: `Use ${requirement.title} for production`,
      details: `${requirement.title} is listed as a required production tool, station, or producer for ${title}.`,
    });
  }

  for (const requirement of materialRequirements) {
    const route = materialRoute(requirement);
    const id = rowId("material", requirement.title, rows.length + 1);
    rows.push({
      id,
      kind: "material",
      name: requirement.title,
      order: rows.length + 1,
      quantity: requirement.quantity || undefined,
      required: true,
      dependsOn: [],
      source: SOURCE,
      sourceUrl: wikiUrl(requirement.sourceTitle),
      method: route.method,
      details: route.details,
    });
  }

  if (acquisition) {
    rows.push({
      id: "wiki-acquisition-note",
      kind: "note",
      name: "Wiki Acquisition Notes",
      order: rows.length + 1,
      quantity: "Ring of Brodgar source",
      required: false,
      dependsOn: [],
      source: SOURCE,
      sourceUrl,
      method: acquisition,
      details: `${acquisition} Source: ${sourceUrl}`,
    });
  }

  rows.push({
    id: "goal-complete",
    kind: isSkill ? "skill" : "action",
    name: `${finalVerb(kind)} ${title}`,
    order: rows.length + 1,
    quantity: fields.skill_cost ? `${fields.skill_cost} LP` : undefined,
    required: true,
    dependsOn: rows.filter((row) => row.required).map((row) => row.id),
    source: SOURCE,
    sourceUrl,
    method: menuPath || (isSkill ? `Spend ${fields.skill_cost ?? "required"} LP` : `${finalVerb(kind)} from the available recipe or build menu`),
    details: `${SOURCE} lists ${title}${fields.objectsreq ? ` with inputs: ${cleanText(fields.objectsreq)}.` : "."}`,
  });

  if (rows.length <= 1 && !fields.skill_cost) {
    return null;
  }

  return {
    id: `ring-${slugify(title)}`,
    name: title,
    category: categoryForGoal(categories, isSkill ? "Skill" : "Wiki goal"),
    purpose: isSkill
      ? `Unlock the ${title} skill and its related recipes.`
      : `${finalVerb(kind)} ${title} using Ring of Brodgar requirements and acquisition notes.`,
    aliases: aliasesForGoal(title, categories, isSkill),
    searchHints: [
      menuPath,
      cleanText(fields.skillreq ?? fields.skills_required ?? ""),
      cleanText(fields.objectsreq ?? ""),
      ...categories,
    ].filter(Boolean).slice(0, 8),
    rows,
  };
}

async function main() {
  const titlesByCategory = new Map();
  const allTitles = new Set();

  for (const category of CATEGORY_SEEDS) {
    const titles = await getCategoryPages(category);
    titlesByCategory.set(category, titles.length);
    for (const title of titles) {
      allTitles.add(title);
    }
  }

  const pages = await getPages([...allTitles].sort((a, b) => a.localeCompare(b)));
  const goals = pages
    .map(makeGoal)
    .filter(Boolean)
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  const output = {
    schemaVersion: 1,
    source: SOURCE,
    sourceUrl: "https://ringofbrodgar.com/",
    generatedAt: new Date().toISOString(),
    categories: CATEGORY_SEEDS,
    categoryCounts: Object.fromEntries(titlesByCategory),
    goalCount: goals.length,
    goals,
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(`${OUTPUT_PATH}.tmp`, `${JSON.stringify(output, null, 2)}\n`);
  await fs.rename(`${OUTPUT_PATH}.tmp`, OUTPUT_PATH);

  console.log(`Generated ${goals.length} Ring of Brodgar goals at ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
