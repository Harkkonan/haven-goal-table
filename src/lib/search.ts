import type { TaskGraph, TaskSearchResult } from "../types";

const tokenAliases: Record<string, string[]> = {
  chop: ["cut", "fell", "tree", "wood"],
  chopped: ["cut", "fell", "tree", "wood"],
  chopping: ["cut", "fell", "tree", "wood"],
  cut: ["chop", "fell", "tree", "wood"],
  cutting: ["chop", "fell", "tree", "wood"],
  down: ["fell"],
  fell: ["cut", "chop", "tree", "wood"],
  felling: ["cut", "chop", "tree", "wood"],
  forest: ["tree", "wood", "lumber"],
  trees: ["tree", "wood", "lumber"],
  home: ["house", "housing", "building"],
  house: ["home", "housing", "building"],
  houses: ["home", "housing", "building"],
  t3: ["tier", "3", "three", "great", "hall"],
  third: ["tier", "3", "three"],
  three: ["tier", "3"],
  totem: ["beacon", "spawn", "friend"],
  spawn: ["beacon", "friend"],
  spawning: ["beacon", "friend"],
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  const baseTokens = normalize(value)
    .split(" ")
    .filter((token) => token.length > 0);
  const expanded = new Set(baseTokens);

  for (const token of baseTokens) {
    for (const alias of tokenAliases[token] ?? []) {
      expanded.add(alias);
    }
  }

  return [...expanded];
}

function getCorpus(graph: TaskGraph) {
  return normalize(
    [
      graph.name,
      graph.category,
      graph.purpose,
      ...graph.aliases,
      ...graph.searchHints,
      ...graph.rows.flatMap((row) => [
        row.name,
        row.kind,
        row.quantity ?? "",
        row.method,
        row.details,
        row.source,
      ]),
    ].join(" "),
  );
}

function getPhraseMatches(graph: TaskGraph, normalizedQuery: string) {
  const phrases = [
    graph.name,
    graph.category,
    ...graph.aliases,
    ...graph.searchHints,
    ...graph.rows.map((row) => row.name),
  ];

  return phrases
    .map(normalize)
    .filter((phrase) => phrase.length > 0)
    .filter((phrase) => phrase.includes(normalizedQuery) || normalizedQuery.includes(phrase));
}

export function searchTaskGraphs(graphs: TaskGraph[], query: string): TaskSearchResult[] {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return graphs.map((graph, index) => ({
      graph,
      score: graphs.length - index,
      matchedTerms: [],
    }));
  }

  const queryTokens = tokenize(normalizedQuery);

  return graphs
    .map((graph) => {
      const corpus = getCorpus(graph);
      const corpusTokens = new Set(tokenize(corpus));
      const phraseMatches = getPhraseMatches(graph, normalizedQuery);
      const matchedTerms = new Set<string>();
      let score = 0;

      for (const phrase of phraseMatches) {
        score += phrase === normalizedQuery ? 90 : 45;
        matchedTerms.add(phrase);
      }

      for (const token of queryTokens) {
        if (corpusTokens.has(token) || corpus.includes(token)) {
          score += token.length <= 2 ? 2 : 8;
          matchedTerms.add(token);
        }
      }

      if (corpus.includes(normalizedQuery)) {
        score += 30;
        matchedTerms.add(normalizedQuery);
      }

      return {
        graph,
        score,
        matchedTerms: [...matchedTerms].slice(0, 6),
      };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.graph.name.localeCompare(b.graph.name));
}
