import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GLOSSARY } from "../wiki-data.mjs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");

test("wiki provides a large nonduplicated Spanish glossary", () => {
  assert.ok(GLOSSARY.length >= 70);
  const normalized = GLOSSARY.map(item => item.term.toLocaleLowerCase("es"));
  assert.equal(new Set(normalized).size, normalized.length);
  assert.ok(GLOSSARY.every(item => item.term.length > 0 && item.definition.length >= 15));
  for (const term of ["Lambda / λ", "Phi / Φ / potencial", "SLA", "VRAM", "P95 / percentil 95", "PPO"]) {
    assert.ok(GLOSSARY.some(entry => entry.term === term), "Missing " + term);
  }
});

test("glossary source and web mirror contain the same terms", () => {
  const markdown = read("../../docs/wiki/glosario.md");
  for (const item of GLOSSARY) {
    assert.ok(markdown.includes("| **" + item.term + "** | " + item.definition + " |"),
      "Glossary mirror out of sync for " + item.term);
  }
});

test("wiki page is discoverable and links to existing lessons", () => {
  const html = read("../wiki.html");
  const home = read("../index.html");
  assert.match(home, /href="\.\/wiki\.html"/);
  assert.match(html, /id="term-search"/);
  assert.match(html, /src="\.\/wiki\.mjs"/);
  const chapters = [
    "01-introduccion.md",
    "02-matematicas.md",
    "03-simulador.md",
    "04-experimentos.md",
    "glosario.md",
    "06-preguntas.md",
  ];
  const index = read("../../docs/wiki/README.md");
  for (const file of chapters) {
    assert.ok(index.includes(file), "Missing chapter index: " + file);
    assert.ok(read("../../docs/wiki/" + file).length > 200, "Chapter is empty: " + file);
  }
});
