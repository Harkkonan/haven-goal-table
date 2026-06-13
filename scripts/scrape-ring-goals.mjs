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
  return `https://ringofbrodgar.com/wiki/${encodeURIComponent(cleanTitle(title).replaceAll(" ", "_"))}`;
}

function cleanTitle(title) {
  return title
    .replace(/^Category:/i, "")
    .replace(/^(?:requires|specific|seed[_ ]of|optional)::/i, "")
    .trim();
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
  const parts = splitTopLevelPipes(inner)
    .slice(1)
    .map((part) => cleanText(part.replaceAll("$", "")))
    .filter(Boolean);

  if (parts.length === 1 && /^copy=/i.test(parts[0])) {
    return "";
  }

  return parts
    .map((part) => part.replace(/^copy=/i, ""))
    .filter(Boolean)
    .join(" > ");
}

function cleanText(value) {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<ref[^>]*>.*?<\/ref>/gis, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, (_, title) => cleanTitle(title))
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

  const regex = /(?:(optional)\s*:)?\s*\[\[(?:requires::|specific::)?([^|\]]+)(?:\|[^\]]+)?\]\]\s*(?:x\s*([0-9.]+)|\(\s*([^)]+?)\s*\))?/gi;
  let match;

  while ((match = regex.exec(value))) {
    const rawTitle = cleanTitle(match[2]);
    if (!rawTitle || rawTitle.startsWith("#")) {
      continue;
    }

    const before = value.slice(Math.max(0, match.index - 18), match.index).toLowerCase();
    const optional = Boolean(match[1]) || /optional\s*:?\s*$/.test(before);
    const quantity = match[3] ? match[3] : match[4] ? cleanText(match[4]) : "";

    requirements.push({
      title: canonicalName(rawTitle),
      sourceTitle: rawTitle,
      quantity,
      required: !optional,
    });
  }

  return dedupeRequirements(requirements);
}

function dedupeRequirements(requirements) {
  const byTitle = new Map();

  for (const requirement of requirements) {
    const key = normalizeMaterialKey(requirement.title);
    if (!byTitle.has(key)) {
      byTitle.set(key, { ...requirement });
      continue;
    }

    const existing = byTitle.get(key);
    if (requirement.required !== false) {
      existing.required = true;
    }
    if (!existing.quantity && requirement.quantity) {
      existing.quantity = requirement.quantity;
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

function extractSectionSummary(content, pageTitle = "") {
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

    const sectionText = match[1]
      .replace(/\{\{PAGENAME\}\}/gi, pageTitle)
      .split("\n")
      .filter((line) => !line.trim().startsWith("*"))
      .join(" ");
    const summary = cleanText(sectionText);
    if (summary) {
      return summary.length > 280 ? `${summary.slice(0, 277)}...` : summary;
    }
  }

  const prose = cleanText(
    content
      .replace(extractTemplate(content, "infobox"), "")
      .replace(/\{\{PAGENAME\}\}/gi, pageTitle)
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

function parsePlainRequirement(value) {
  const linkedRequirement = extractRequirements(value)[0];
  if (linkedRequirement) {
    return linkedRequirement;
  }

  const title = cleanText(value);
  if (!title || /^(none|no|unknown)$/i.test(title)) {
    return null;
  }

  return {
    title: canonicalName(title),
    sourceTitle: cleanTitle(title),
    quantity: "",
  };
}

function isTreeOrBushTitle(title) {
  return /\b(tree|bush)$/i.test(cleanTitle(title));
}

function getInfoboxFields(page) {
  const infobox = extractTemplate(page.content, "infobox");
  return infobox ? parseTemplateFields(infobox) : {};
}

function getPlantProducerKind(producerPage) {
  if (!producerPage) {
    return null;
  }

  const lowerContent = producerPage.content.toLowerCase();
  const categories = extractCategories(producerPage.content);
  const title = cleanTitle(producerPage.title);

  if (lowerContent.includes("{{infobox tree") || categories.includes("Trees") || /\btree$/i.test(title)) {
    return "tree";
  }

  if (lowerContent.includes("{{infobox bush") || categories.includes("Bush") || /\bbush$/i.test(title)) {
    return "bush";
  }

  return null;
}

function getPlantProducerInfo(requirement, producerPagesByTitle) {
  const producerTitle = cleanTitle(requirement.sourceTitle || requirement.title);
  const producerPage = producerPagesByTitle.get(producerTitle);
  const producerKind = getPlantProducerKind(producerPage);

  if (!producerKind) {
    return null;
  }

  return {
    kind: producerKind,
    page: producerPage,
    title: producerTitle,
    url: wikiUrl(producerTitle),
  };
}

function findPlantProducer(toolRequirements, producerPagesByTitle) {
  for (const requirement of toolRequirements) {
    const producerInfo = getPlantProducerInfo(requirement, producerPagesByTitle);
    if (producerInfo) {
      return producerInfo;
    }
  }

  return null;
}

function getPlantFacts(producerInfo, productTitle) {
  const fields = getInfoboxFields(producerInfo.page);
  const seedRequirement = parsePlainRequirement(fields.objectsreq ?? fields.seeds ?? fields.seed ?? "");
  const producerTitle = producerInfo.title;
  const isTree = producerInfo.kind === "tree";
  const primaryFruit = cleanText(fields.tfruit ?? fields.fruitname ?? "");
  const otherFruit = cleanText(fields.tother ?? "");
  const productName = cleanTitle(productTitle);
  const normalizedProduct = normalizeMaterialKey(productName);
  let harvestQuantity = "";

  if (primaryFruit && normalizeMaterialKey(primaryFruit) === normalizedProduct) {
    harvestQuantity = cleanText(fields.tfruitqt ?? fields.fruitcount ?? "");
  } else if (otherFruit && normalizeMaterialKey(otherFruit) === normalizedProduct) {
    harvestQuantity = cleanText(fields.totherqt ?? "");
  } else if (!primaryFruit && fields.fruitcount) {
    harvestQuantity = cleanText(fields.fruitcount);
  }

  return {
    harvestQuantity,
    isTree,
    producerTitle,
    producerUrl: producerInfo.url,
    seed: seedRequirement ?? {
      title: `${productName} Seed`,
      sourceTitle: `${productName} Seed`,
      quantity: "1",
    },
  };
}

function plantAliasesForGoal(title, categories, producerTitle, seedTitle) {
  const baseAliases = aliasesForGoal(title, categories, false);
  const normalizedTitle = title.toLowerCase();
  const plainTitle = normalizedTitle.replace(/^red\s+/, "");
  return [
    ...new Set([
      ...baseAliases,
      seedTitle.toLowerCase(),
      `${normalizedTitle} seed`,
      `${plainTitle} seed`,
      `plant ${normalizedTitle}`,
      `plant ${producerTitle.toLowerCase()}`,
      `grow ${producerTitle.toLowerCase()}`,
      `harvest ${normalizedTitle}`,
      `pick ${normalizedTitle}`,
    ]),
  ].slice(0, 16);
}

function buildPlantProductRows({ title, sourceUrl, acquisition, producerInfo }) {
  const facts = getPlantFacts(producerInfo, title);
  const rows = [];
  const seedId = "plant-seed";
  const plantLoreId = "plant-lore";
  const potteryId = "pottery";
  const potId = "treeplanters-pot";
  const mediumId = "growing-medium";
  const waterId = "water";
  const tableId = "herbalist-table";
  const prepareId = "prepare-tree-pot";
  const sproutId = "sprout-sapling";
  const directId = "direct-ground-planting";
  const plantId = "plant-sapling";
  const growId = "grow-producer";
  const harvestId = "harvest-product";

  rows.push({
    id: seedId,
    kind: "material",
    name: facts.seed.title,
    order: rows.length + 1,
    quantity: "1",
    required: true,
    dependsOn: [],
    source: SOURCE,
    sourceUrl: wikiUrl(facts.seed.sourceTitle),
    method: `Get ${facts.seed.title} from an existing source, trade, or from the product's seed/remnant loop`,
    details: `${facts.seed.title} is listed as the seed or planting input for ${facts.producerTitle}.`,
  });

  rows.push({
    id: plantLoreId,
    kind: "skill",
    name: "Plant Lore",
    order: rows.length + 1,
    required: true,
    dependsOn: [],
    source: SOURCE,
    sourceUrl: "https://ringofbrodgar.com/wiki/Plant_Lore",
    method: "Learn Plant Lore for tree and bush planting",
    details: "Plant Lore is part of the Treeplanter's Pot route for raising new trees and bushes.",
  });

  rows.push({
    id: potteryId,
    kind: "skill",
    name: "Pottery",
    order: rows.length + 1,
    required: true,
    dependsOn: [],
    source: SOURCE,
    sourceUrl: "https://ringofbrodgar.com/wiki/Pottery",
    method: "Learn Pottery before making Treeplanter's Pots",
    details: "Treeplanter's Pot requires Pottery and Plant Lore.",
  });

  rows.push({
    id: potId,
    kind: "tool",
    name: "Treeplanter's Pot",
    order: rows.length + 1,
    quantity: "1",
    required: true,
    dependsOn: [plantLoreId, potteryId],
    source: SOURCE,
    sourceUrl: "https://ringofbrodgar.com/wiki/Treeplanter%27s_Pot",
    method: "Craft and fire a Treeplanter's Pot",
    details: "Use the pot to sprout tree and bush seeds safely before planting the sapling.",
  });

  rows.push({
    id: mediumId,
    kind: "material",
    name: "Growing Medium",
    order: rows.length + 1,
    quantity: "4 units",
    required: true,
    dependsOn: [],
    source: SOURCE,
    sourceUrl: "https://ringofbrodgar.com/wiki/Treeplanter%27s_Pot",
    method: "Use soil, mulch, earthworms, or bat guano",
    details: "Treeplanter's Pots need four units of accepted growing medium.",
  });

  rows.push({
    id: waterId,
    kind: "material",
    name: "Water",
    order: rows.length + 1,
    quantity: "1.0L",
    required: true,
    dependsOn: [],
    source: SOURCE,
    sourceUrl: "https://ringofbrodgar.com/wiki/Water",
    method: "Fill the pot with one liter of water",
    details: "The Treeplanter's Pot workflow requires water before the seed can sprout.",
  });

  rows.push({
    id: tableId,
    kind: "tool",
    name: "Herbalist Table",
    order: rows.length + 1,
    quantity: "1",
    required: true,
    dependsOn: [],
    source: SOURCE,
    sourceUrl: "https://ringofbrodgar.com/wiki/Herbalist_Table",
    method: "Place the filled pot on an Herbalist Table",
    details: "The filled Treeplanter's Pot must sit on an Herbalist Table to sprout.",
  });

  rows.push({
    id: prepareId,
    kind: "action",
    name: `Prepare ${facts.producerTitle} Pot`,
    order: rows.length + 1,
    required: true,
    dependsOn: [seedId, potId, mediumId, waterId],
    source: SOURCE,
    sourceUrl: "https://ringofbrodgar.com/wiki/Treeplanter%27s_Pot",
    method: `Put ${facts.seed.title}, growing medium, and water into the Treeplanter's Pot`,
    details: "Left-click the input, then right-click the pot or water source as appropriate.",
  });

  if (facts.isTree) {
    rows.push({
      id: directId,
      kind: "action",
      name: "Direct Ground Planting",
      order: rows.length + 1,
      required: false,
      dependsOn: [seedId],
      source: SOURCE,
      sourceUrl: facts.producerUrl,
      method: `Optional shortcut: plant ${facts.seed.title} directly in the ground`,
      details: `The ${facts.producerTitle} page notes that trees can be grown from seed in a Treeplanter's Pot or by direct ground planting.`,
    });
  }

  rows.push({
    id: sproutId,
    kind: "action",
    name: `Sprout ${facts.producerTitle} Sapling`,
    order: rows.length + 1,
    quantity: "4 in-game hours / about 73 real minutes",
    required: true,
    dependsOn: [prepareId, tableId],
    source: SOURCE,
    sourceUrl: "https://ringofbrodgar.com/wiki/Treeplanter%27s_Pot",
    method: "Wait for the filled pot to sprout on the Herbalist Table",
    details: "Treeplanter's Pot notes the sprouting wait and that the sapling must be planted after sprouting.",
  });

  rows.push({
    id: plantId,
    kind: "action",
    name: `Plant ${facts.producerTitle} Sapling`,
    order: rows.length + 1,
    quantity: "Within 24 real-life hours",
    required: true,
    dependsOn: [sproutId],
    source: SOURCE,
    sourceUrl: "https://ringofbrodgar.com/wiki/Treeplanter%27s_Pot",
    method: "Plant the sprouted sapling on valid terrain",
    details: "The sprouted sapling dies if it is not planted within the time window.",
  });

  rows.push({
    id: growId,
    kind: "action",
    name: `Grow ${facts.producerTitle}`,
    order: rows.length + 1,
    required: true,
    dependsOn: [plantId],
    source: SOURCE,
    sourceUrl: facts.producerUrl,
    method: `Let the ${facts.producerTitle} mature`,
    details: `${facts.producerTitle} is the renewable producer for ${title}.`,
  });

  rows.push({
    id: harvestId,
    kind: "action",
    name: `Harvest ${title}`,
    order: rows.length + 1,
    quantity: facts.harvestQuantity ? `Up to ${facts.harvestQuantity}` : undefined,
    required: true,
    dependsOn: [growId],
    source: SOURCE,
    sourceUrl,
    method: acquisition || `Right-click ${facts.producerTitle} and pick ${title}`,
    details: `${facts.producerTitle} produces ${title}; harvested materials replenish over time when the producer remains standing.`,
  });

  rows.push({
    id: "goal-complete",
    kind: "action",
    name: `Get ${title}`,
    order: rows.length + 1,
    required: true,
    dependsOn: [harvestId],
    source: SOURCE,
    sourceUrl,
    method: `Keep or use the harvested ${title}`,
    details: `${SOURCE} lists ${title} as produced by ${facts.producerTitle}.`,
  });

  return rows;
}

const COOKING_STATION_TITLES = new Set([
  "Oven",
  "Fire",
  "Fireplace",
  "Grid Iron",
  "Frying Pan",
  "Cauldron",
  "Kiln",
  "Roasting Spit",
  "Smoke Shed",
]);

const COOKING_INTERMEDIATE_TITLES = new Set([
  "Any Stuffing",
  "Batter",
]);

function splitTopLevelCommas(value) {
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
    if (value[index] === "," && bracketDepth === 0 && braceDepth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += value[index];
  }

  parts.push(current);
  return parts;
}

function combineAlternativeRequirements(requirements) {
  const required = requirements.some((requirement) => requirement.required !== false);
  const quantity = [...requirements].reverse().find((requirement) => requirement.quantity)?.quantity ?? "";
  const titles = requirements.map((requirement) => requirement.title);

  return {
    title: titles.join(" or "),
    sourceTitle: requirements[0].sourceTitle,
    sourceTitles: requirements.map((requirement) => requirement.sourceTitle),
    quantity,
    required,
    alternatives: titles,
  };
}

function extractRequirementGroups(value) {
  if (!value) {
    return [];
  }

  const requirements = [];
  for (const segment of splitTopLevelCommas(value)) {
    const segmentRequirements = extractRequirements(segment);
    if (/\bor\b/i.test(segment) && segmentRequirements.length > 1) {
      requirements.push(combineAlternativeRequirements(segmentRequirements));
    } else {
      requirements.push(...segmentRequirements);
    }
  }

  return dedupeRequirements(requirements);
}

function combineCookingStations(requirements) {
  const stations = requirements.filter((requirement) => COOKING_STATION_TITLES.has(cleanTitle(requirement.title)));
  const others = requirements.filter((requirement) => !COOKING_STATION_TITLES.has(cleanTitle(requirement.title)));

  if (stations.length <= 1) {
    return requirements;
  }

  return [combineAlternativeRequirements(stations), ...others];
}

function requirementSourceUrl(requirement) {
  const sourceTitle = requirement.sourceTitles?.[0] ?? requirement.sourceTitle;
  return wikiUrl(sourceTitle);
}

function isCookingIntermediateTitle(title) {
  const clean = cleanTitle(title);
  return (
    /^Unbaked\b/i.test(clean) ||
    /\bDough$/i.test(clean) ||
    /^Raw .*(?:Roast|Roll|Glutton)$/i.test(clean) ||
    COOKING_INTERMEDIATE_TITLES.has(clean)
  );
}

function isCookingSupportTitle(title) {
  return COOKING_STATION_TITLES.has(cleanTitle(title)) || isCookingIntermediateTitle(title);
}

function isCookedFoodGoal(title, categories, toolRequirements, materialRequirements, fields = {}) {
  const foodCategory = categories.some((category) =>
    /^(Baked Goods|Foods|Processed Foods|Meat Dishes|Sausages|Pitbaked Goods)$/i.test(category),
  );
  const foodStats = Object.keys(fields).some((key) =>
    /^(energy|hunger|sat\d*|str\d*|agi\d*|int\d*|con\d*|per\d*|cha\d*|dex\d*|wil\d*|psy\d*)$/i.test(key),
  );
  const usesCookingStation = toolRequirements.some((requirement) =>
    COOKING_STATION_TITLES.has(cleanTitle(requirement.title)),
  );
  const hasCookingIntermediate = materialRequirements.some((requirement) => isCookingIntermediateTitle(requirement.title));

  return (foodCategory || foodStats) && (usesCookingStation || hasCookingIntermediate || isCookingIntermediateTitle(title));
}

function inferCookingTools(toolRequirements, categories, materialRequirements) {
  if (toolRequirements.length > 0) {
    return toolRequirements;
  }

  const bakedCategory = categories.some((category) => /^(Baked Goods)$/i.test(category));
  const bakedInput = materialRequirements.some((requirement) => isCookingIntermediateTitle(requirement.title));

  if (bakedCategory && bakedInput) {
    return [
      {
        title: "Oven",
        sourceTitle: "Oven",
        quantity: "",
        required: true,
      },
    ];
  }

  return toolRequirements;
}

function cookingIngredientRoute(requirement) {
  const key = normalizeMaterialKey(requirement.title);
  const existingRoute = MATERIAL_ROUTES.get(key);
  if (existingRoute) {
    return existingRoute;
  }

  if (key.includes(" or ")) {
    return {
      method: `Use any valid alternative: ${requirement.alternatives?.join(", ") ?? requirement.title}`,
      details: `${requirement.title} is an either/or ingredient group for this cooking recipe.`,
    };
  }

  if (key === "any flour" || key.endsWith(" flour")) {
    return {
      method: "Grow or trade for grain seeds, then grind them with a Quern or Milling Machine",
      details: "Flour normally comes from milling grain seeds. Recipes that say Any Flour accept qualifying flour types.",
    };
  }

  if (key === "milk" || /milk$/.test(key)) {
    return {
      method: "Milk a domesticated animal or trade for milk",
      details: "Milk is a liquid ingredient and needs a container before it can be used in cooking.",
    };
  }

  if (key === "butter") {
    return {
      method: "Churn milk into butter, or trade for butter",
      details: "Butter is a solid fat commonly used in baked goods and pie doughs.",
    };
  }

  if (key === "curd" || key === "cheese") {
    return {
      method: "Use the dairy chain or trade for prepared dairy",
      details: `${requirement.title} belongs to the dairy processing chain and is used as a prepared cooking ingredient.`,
    };
  }

  if (key === "egg" || key.endsWith(" egg")) {
    return {
      method: "Collect eggs from birds or chicken coops, or trade for eggs",
      details: "Eggs are a cooking ingredient used directly in doughs, batters, and prepared foods.",
    };
  }

  if (key === "raw meat" || /^raw\b/.test(key) || key.includes(" meat")) {
    return {
      method: "Hunt or raise an animal, butcher it, and keep the raw meat",
      details: "Raw meat quality and type can affect the cooked result. Many recipes accept several specific raw meats.",
    };
  }

  if (key === "filet of any fish" || key.includes("fish")) {
    return {
      method: "Catch fish, then butcher or process it into the required fish ingredient",
      details: "Fish-based recipes usually accept specific fish or filet categories depending on the wiki requirement.",
    };
  }

  if (key === "dried fruit") {
    return {
      method: "Dry acceptable fruit or trade for dried fruit",
      details: "Dried fruit is a prepared ingredient used before the final cooking step.",
    };
  }

  if (key === "fruit" || key.includes("fruit") || key.includes("apple") || key.includes("berry")) {
    return {
      method: "Harvest, forage, grow, or trade for the fruit or berry",
      details: "For tree and bush fruit, use the matching generated plant goal when you need the full growing chain.",
    };
  }

  if (key === "spices") {
    return {
      method: "Use any valid spice, or skip this optional seasoning",
      details: "Spices are optional in many cooked meat recipes and improve or vary the final food.",
    };
  }

  if (key === "sweetener") {
    return {
      method: "Use honey or another accepted sweetener",
      details: "Sweetener is a generic ingredient class; the exact accepted item can vary by pantry supply.",
    };
  }

  if (key === "brandy") {
    return {
      method: "Distill wine in a Still, or trade for brandy",
      details: "Brandy is an alcohol ingredient made through the wine and still chain.",
    };
  }

  if (key === "bucket") {
    return {
      method: "Craft or borrow a bucket before mixing liquid ingredients",
      details: "Some liquid preparations need a bucket held or available before the recipe can be mixed.",
    };
  }

  if (key === "solid fat" || key === "animal fat" || key === "rendered animal fat") {
    return {
      method: "Render or collect fat from animal processing, or trade for it",
      details: "Fat ingredients are usually part of the butchery and rendering chain.",
    };
  }

  if (key === "entrails" || key === "intestines") {
    return {
      method: "Butcher animals and keep the entrails or intestines",
      details: "Offal ingredients come from the butchery chain and may require the right butchering skill.",
    };
  }

  if (key === "any onion" || key.endsWith(" onion") || key === "carrot" || key === "beetroot" || key === "turnip" || key === "cucumber") {
    return {
      method: "Farm, forage if applicable, or trade for the vegetable",
      details: `${requirement.title} is a crop-style cooking ingredient.`,
    };
  }

  if (key === "honey") {
    return {
      method: "Use beekeeping or trade for honey",
      details: "Honey works as a sweet cooking ingredient and may also satisfy some sweetener needs.",
    };
  }

  if (key === "vinegar") {
    return {
      method: "Ferment alcohol into vinegar, or trade for vinegar",
      details: "Vinegar is a prepared liquid ingredient used in several cooking recipes.",
    };
  }

  if (key === "nuts") {
    return {
      method: "Forage, harvest, or trade for accepted nuts",
      details: "Nut recipes accept qualifying nut ingredients from forage or tree sources.",
    };
  }

  if (key === "leaf") {
    return {
      method: "Gather leaves from valid plants or trees",
      details: "Pitbaked recipes can use leaves as wrapping or preparation material.",
    };
  }

  return materialRoute(requirement);
}

function cookingToolMethod(requirement) {
  const name = requirement.title;

  if (name.includes(" or ")) {
    return `Use any listed cooking station: ${requirement.alternatives?.join(", ") ?? name}`;
  }

  if (name === "Oven") {
    return "Use an Oven for the baking step";
  }

  if (name === "Fire" || name === "Fireplace") {
    return `Use a lit ${name} for the cooking step`;
  }

  if (name === "Cauldron") {
    return "Use a boiling Cauldron for the preparation step";
  }

  return `Use ${name} for the cooking step`;
}

function finalCookingVerb(toolRequirements) {
  const stationNames = toolRequirements.flatMap((requirement) => requirement.alternatives ?? [requirement.title]);

  if (stationNames.includes("Oven")) {
    return "Bake";
  }
  if (stationNames.includes("Smoke Shed")) {
    return "Smoke";
  }
  if (stationNames.includes("Cauldron")) {
    return "Boil";
  }
  if (stationNames.some((name) => ["Fire", "Fireplace", "Grid Iron", "Frying Pan", "Kiln", "Roasting Spit"].includes(name))) {
    return "Cook";
  }
  return "Make";
}

function needsFuelRow(toolRequirements) {
  const stationNames = toolRequirements.flatMap((requirement) => requirement.alternatives ?? [requirement.title]);
  return stationNames.some((name) => ["Oven", "Fire", "Fireplace", "Kiln"].includes(name));
}

function fuelActionLabel(toolRequirements) {
  const stationNames = toolRequirements.flatMap((requirement) => requirement.alternatives ?? [requirement.title]);
  if (stationNames.includes("Oven")) {
    return "Fuel and Light Oven";
  }
  if (stationNames.includes("Kiln")) {
    return "Fuel and Light Kiln";
  }
  return "Light Cooking Fire";
}

function buildCookedFoodRows({
  title,
  fields,
  sourceUrl,
  acquisition,
  skillRequirements,
  materialRequirements,
  toolRequirements,
  pageIndexByTitle,
}) {
  const rows = [];
  const reusableRows = new Map();

  function addReusableRow(row) {
    const key = `${row.kind}:${normalizeMaterialKey(row.name)}`;
    const existingId = reusableRows.get(key);
    if (existingId) {
      const existing = rows.find((candidate) => candidate.id === existingId);
      if (existing && row.required !== false) {
        existing.required = true;
      }
      return existingId;
    }

    const id = `${row.kind}-${slugify(row.name)}`;
    reusableRows.set(key, id);
    rows.push({
      ...row,
      id,
      order: rows.length + 1,
    });
    return id;
  }

  function addActionRow({ id, name, required = true, dependsOn, source = SOURCE, rowSourceUrl = sourceUrl, method, details, quantity }) {
    rows.push({
      id,
      kind: "action",
      name,
      order: rows.length + 1,
      quantity,
      required,
      dependsOn,
      source,
      sourceUrl: rowSourceUrl,
      method,
      details,
    });
    return id;
  }

  function addSkillRows(requirements, itemTitle) {
    return requirements.map((requirement) =>
      addReusableRow({
        kind: "skill",
        name: requirement.title,
        quantity: requirement.quantity || undefined,
        required: requirement.required !== false,
        dependsOn: [],
        source: SOURCE,
        sourceUrl: wikiUrl(requirement.sourceTitle),
        method: `Unlock ${requirement.title} before preparing ${itemTitle}`,
        details: `${requirement.title} is listed as a required skill for ${itemTitle}.`,
      }),
    );
  }

  function addToolRows(requirements, itemTitle) {
    return requirements
      .filter((requirement) => requirement.title !== "Hand")
      .map((requirement) =>
        addReusableRow({
          kind: "tool",
          name: requirement.title,
          quantity: requirement.quantity || undefined,
          required: requirement.required !== false,
          dependsOn: [],
          source: SOURCE,
          sourceUrl: requirementSourceUrl(requirement),
          method: cookingToolMethod(requirement),
          details: `${requirement.title} is listed as a production station or tool for ${itemTitle}.`,
        }),
      );
  }

  function addIngredientRow(requirement, itemTitle) {
    const route = cookingIngredientRoute(requirement);
    return addReusableRow({
      kind: "material",
      name: requirement.title,
      quantity: requirement.quantity || undefined,
      required: requirement.required !== false,
      dependsOn: [],
      source: SOURCE,
      sourceUrl: requirementSourceUrl(requirement),
      method: route.method,
      details: `${route.details} Needed for ${itemTitle}.`,
    });
  }

  function requiredDependency(id, required = true) {
    return required === false ? [] : [id];
  }

  function appendPreparedIngredient(requirement, depth = 0) {
    const intermediateTitle = cleanTitle(requirement.sourceTitle || requirement.title);
    const intermediatePage = pageIndexByTitle.get(intermediateTitle);

    if (!intermediatePage || !isCookingIntermediateTitle(intermediateTitle) || depth > 2) {
      const rowIdValue = addIngredientRow(requirement, title);
      return {
        id: rowIdValue,
        required: requirement.required !== false,
      };
    }

    const intermediateFields = getInfoboxFields(intermediatePage);
    const intermediateSourceUrl = wikiUrl(intermediateTitle);
    const intermediateSkills = extractRequirements(intermediateFields.skillreq);
    const intermediateTools = combineCookingStations(
      extractRequirementGroups(intermediateFields.producedby).filter((tool) => tool.title !== "Hand"),
    );
    const intermediateMaterials = extractRequirementGroups(intermediateFields.objectsreq);
    const intermediateAcquisition = extractSectionSummary(intermediatePage.content, intermediateTitle);
    const intermediateMenu = extractGameMenu(intermediatePage.content);
    const dependencyIds = [
      ...addSkillRows(intermediateSkills, intermediateTitle),
      ...addToolRows(intermediateTools, intermediateTitle),
    ];

    for (const material of intermediateMaterials) {
      const prepared = appendPreparedIngredient(material, depth + 1);
      dependencyIds.push(...requiredDependency(prepared.id, prepared.required));
    }

    const actionId = `prepare-${slugify(intermediateTitle)}`;
    addActionRow({
      id: actionId,
      name: `Make ${intermediateTitle}`,
      dependsOn: dependencyIds,
      rowSourceUrl: intermediateSourceUrl,
      method: intermediateMenu || intermediateAcquisition || `Craft ${intermediateTitle} from its listed ingredients`,
      details: `${intermediateTitle} is the prepared input used before finishing ${title}.`,
      quantity: requirement.quantity || undefined,
    });

    return {
      id: actionId,
      required: requirement.required !== false,
    };
  }

  const groupedMaterials = extractRequirementGroups(fields.objectsreq);
  const groupedTools = combineCookingStations(toolRequirements);
  const finalSkillIds = addSkillRows(skillRequirements, title);
  const finalToolIds = addToolRows(groupedTools, title);
  const finalIngredientIds = [];

  for (const material of groupedMaterials.length ? groupedMaterials : materialRequirements) {
    const prepared = appendPreparedIngredient(material);
    finalIngredientIds.push(...requiredDependency(prepared.id, prepared.required));
  }

  let fuelActionId = "";
  if (needsFuelRow(groupedTools)) {
    const fuelMaterialId = addReusableRow({
      kind: "material",
      name: "Branch",
      quantity: groupedTools.some((requirement) => (requirement.alternatives ?? [requirement.title]).includes("Oven"))
        ? "4"
        : undefined,
      required: true,
      dependsOn: [],
      source: SOURCE,
      sourceUrl: "https://ringofbrodgar.com/wiki/Branch",
      method: "Pick branches from trees or split blocks of wood",
      details: "Branches are the default early fuel for fires, fireplaces, kilns, and ovens.",
    });
    fuelActionId = addActionRow({
      id: "fuel-cooking-station",
      name: fuelActionLabel(groupedTools),
      dependsOn: [...finalToolIds, fuelMaterialId],
      method: "Add fuel and light the cooking station before finishing the food",
      details: "Most baked and fire-cooked foods need a lit station before the recipe completes.",
    });
  }

  if (acquisition) {
    rows.push({
      id: "wiki-cooking-note",
      kind: "note",
      name: "Wiki Cooking Notes",
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

  const verb = finalCookingVerb(groupedTools);
  const finalActionId = `finish-${slugify(title)}`;
  addActionRow({
    id: finalActionId,
    name: `${verb} ${title}`,
    dependsOn: [
      ...finalSkillIds,
      ...finalToolIds,
      ...finalIngredientIds,
      ...(fuelActionId ? [fuelActionId] : []),
    ],
    method: `${verb} ${title} using the prepared ingredients and cooking station`,
    details: `${title} is the finished cooked food from the recipe chain.`,
  });

  addActionRow({
    id: "goal-complete",
    name: `Get ${title}`,
    dependsOn: [finalActionId],
    method: `Keep, store, or eat the finished ${title}`,
    details: `${SOURCE} lists ${title} as a cooked food goal.`,
  });

  return rows;
}

function makeGoal(page, pageIndexByTitle = new Map()) {
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
  const acquisition = extractSectionSummary(page.content, title);

  const skillRequirements = isSkill
    ? parseSkillPrerequisites(fields.skills_required)
    : extractRequirements(fields.skillreq);
  const materialRequirements = extractRequirements(fields.objectsreq);
  const toolRequirements = extractRequirements(fields.producedby).filter((requirement) => requirement.title !== "Hand");
  const plantProducerInfo = findPlantProducer(toolRequirements, pageIndexByTitle);

  if (plantProducerInfo) {
    const plantRows = buildPlantProductRows({
      title,
      sourceUrl,
      acquisition,
      producerInfo: plantProducerInfo,
    });
    const plantFacts = getPlantFacts(plantProducerInfo, title);

    return {
      id: `ring-${slugify(title)}`,
      name: title,
      category: categoryForGoal(categories, "Plant product"),
      purpose: `Grow ${plantProducerInfo.title} and harvest ${title} using Ring of Brodgar tree and bush planting notes.`,
      aliases: plantAliasesForGoal(title, categories, plantProducerInfo.title, plantFacts.seed.title),
      searchHints: [
        `produced by ${plantProducerInfo.title}`,
        `grown from ${plantFacts.seed.title}`,
        `harvest ${title}`,
        `plant ${plantProducerInfo.title}`,
        cleanText(fields.producedby ?? ""),
        acquisition,
        ...categories,
      ].filter(Boolean).slice(0, 10),
      rows: plantRows,
    };
  }

  if (isCookedFoodGoal(title, categories, toolRequirements, materialRequirements, fields)) {
    const cookingToolRequirements = combineCookingStations(inferCookingTools(toolRequirements, categories, materialRequirements));
    const cookedRows = buildCookedFoodRows({
      title,
      fields,
      sourceUrl,
      acquisition,
      skillRequirements,
      materialRequirements,
      toolRequirements: cookingToolRequirements,
      pageIndexByTitle,
    });

    return {
      id: `ring-${slugify(title)}`,
      name: title,
      category: categoryForGoal(categories, "Cooked food"),
      purpose: `${finalCookingVerb(cookingToolRequirements)} ${title} through its ingredient preparation and cooking chain.`,
      aliases: [
        ...new Set([
          ...aliasesForGoal(title, categories, false),
          `cook ${title.toLowerCase()}`,
          `bake ${title.toLowerCase()}`,
          `${title.toLowerCase()} recipe`,
          ...materialRequirements.map((requirement) => requirement.title.toLowerCase()),
        ]),
      ].slice(0, 16),
      searchHints: [
        menuPath,
        cleanText(fields.skillreq ?? ""),
        cleanText(fields.objectsreq ?? ""),
        cleanText(fields.producedby ?? ""),
        acquisition,
        ...categories,
      ].filter(Boolean).slice(0, 10),
      rows: cookedRows,
    };
  }

  const rows = [];

  for (const requirement of skillRequirements) {
    const id = rowId("skill", requirement.title, rows.length + 1);
    rows.push({
      id,
      kind: "skill",
      name: requirement.title,
      order: rows.length + 1,
      quantity: requirement.quantity || undefined,
      required: requirement.required !== false,
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
      required: requirement.required !== false,
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
      required: requirement.required !== false,
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

function requirementSourceTitles(requirement) {
  return requirement.sourceTitles ?? [requirement.sourceTitle];
}

async function getCookingSupportPages(basePages) {
  const supportPages = [];
  const pageIndexByTitle = new Map(basePages.map((page) => [cleanTitle(page.title), page]));

  for (let depth = 0; depth < 3; depth += 1) {
    const titlesToFetch = new Set();

    for (const page of [...basePages, ...supportPages]) {
      const title = cleanTitle(page.title);
      const fields = getInfoboxFields(page);
      const categories = extractCategories(page.content);
      const materialRequirements = extractRequirementGroups(fields.objectsreq);
      const toolRequirements = extractRequirementGroups(fields.producedby);
      const shouldExpand =
        isCookingIntermediateTitle(title) ||
        isCookedFoodGoal(title, categories, toolRequirements, materialRequirements, fields);

      if (!shouldExpand) {
        continue;
      }

      for (const requirement of [...materialRequirements, ...toolRequirements]) {
        for (const sourceTitle of requirementSourceTitles(requirement)) {
          const cleanSourceTitle = cleanTitle(sourceTitle);
          if (cleanSourceTitle && isCookingSupportTitle(cleanSourceTitle) && !pageIndexByTitle.has(cleanSourceTitle)) {
            titlesToFetch.add(cleanSourceTitle);
          }
        }
      }
    }

    if (titlesToFetch.size === 0) {
      break;
    }

    const fetchedPages = await getPages([...titlesToFetch].sort((a, b) => a.localeCompare(b)));
    const newPages = fetchedPages.filter((page) => !pageIndexByTitle.has(cleanTitle(page.title)));
    if (newPages.length === 0) {
      break;
    }

    for (const page of newPages) {
      pageIndexByTitle.set(cleanTitle(page.title), page);
      supportPages.push(page);
    }
  }

  return supportPages;
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
  const cookingSupportPages = await getCookingSupportPages(pages);
  const knownPages = [...pages, ...cookingSupportPages];
  const producerTitles = new Set();

  for (const page of knownPages) {
    const fields = getInfoboxFields(page);
    for (const requirement of extractRequirements(fields.producedby)) {
      if (isTreeOrBushTitle(requirement.title)) {
        producerTitles.add(cleanTitle(requirement.sourceTitle || requirement.title));
      }
    }
  }

  const pageTitles = new Set(knownPages.map((page) => cleanTitle(page.title)));
  const producerPages = await getPages(
    [...producerTitles]
      .filter((title) => title && !pageTitles.has(title))
      .sort((a, b) => a.localeCompare(b)),
  );
  const pageIndexByTitle = new Map(
    [...knownPages, ...producerPages].map((page) => [cleanTitle(page.title), page]),
  );
  const goals = pages
    .map((page) => makeGoal(page, pageIndexByTitle))
    .filter(Boolean)
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  const output = {
    schemaVersion: 1,
    source: SOURCE,
    sourceUrl: "https://ringofbrodgar.com/",
    generatedAt: new Date().toISOString(),
    categories: CATEGORY_SEEDS,
    categoryCounts: Object.fromEntries(titlesByCategory),
    plantProducerCount: producerPages.length,
    cookingSupportCount: cookingSupportPages.length,
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
