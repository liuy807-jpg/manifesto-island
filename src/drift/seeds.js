/** Seed islands from Yuting / the zine. Never labeled as visitors. */
export const SEEDS = [
  {
    id: "seed-sunrise",
    text: "A small boat at sunrise, waiting on the water.",
    name: "Yuting",
    from: "zine",
    seed: true,
    hidden: false,
    ts: 1763310000000,
  },
  {
    id: "seed-island",
    text: "An island that grows brighter the longer you stay.",
    name: "Yuting",
    from: "zine",
    seed: true,
    hidden: false,
    ts: 1763310001000,
  },
  {
    id: "seed-membrane",
    text: "A soft membrane, with light coming through it.",
    name: "Yuting",
    from: "zine",
    seed: true,
    hidden: false,
    ts: 1763310002000,
  },
  {
    id: "seed-listen",
    text: "Someone willing to stop and hear a whole sentence.",
    name: "Yuting",
    from: "zine",
    seed: true,
    hidden: false,
    ts: 1763310003000,
  },
  {
    id: "seed-corner",
    text: "A quiet corner, set adrift and left to travel.",
    name: "Yuting",
    from: "zine",
    seed: true,
    hidden: false,
    ts: 1763310004000,
  },
  {
    id: "seed-picture",
    text: "A picture I would refuse to give up.",
    name: "Yuting",
    from: "zine",
    seed: true,
    hidden: false,
    ts: 1763310005000,
  },
];

export function seedMap() {
  return Object.fromEntries(SEEDS.map((s) => [s.id, { ...s }]));
}

export function labelFor(entry) {
  if (!entry) return "";
  if (entry.seed || entry.from === "zine") return "Yuting · manifesto";
  const n = (entry.name || "").trim();
  return n || "Anonymous";
}
