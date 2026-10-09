import { GLOSSARY } from "./wiki-data.mjs";

const searchInput = document.getElementById("term-search");
const output = document.getElementById("terms");
const count = document.getElementById("search-count");
const clear = document.getElementById("clear-search");
const empty = document.getElementById("no-results");
document.getElementById("term-count").textContent = String(GLOSSARY.length);

function normalize(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
}

function render(query) {
  const normalized = normalize(query.trim());
  const words = normalized.split(/\s+/).filter(Boolean);
  const matches = GLOSSARY.filter(item => {
    const haystack = normalize(item.term + " " + item.definition);
    return words.every(word => haystack.includes(word));
  });
  output.replaceChildren();
  for (const item of matches) {
    const card = document.createElement("article");
    card.className = "term-card";
    const heading = document.createElement("h3");
    heading.textContent = item.term;
    const description = document.createElement("p");
    description.textContent = item.definition;
    card.append(heading, description);
    output.append(card);
  }
  count.textContent = matches.length + (matches.length === 1 ? " término" : " términos") + " encontrados";
  clear.hidden = !query;
  empty.hidden = matches.length !== 0;
}
searchInput.addEventListener("input", () => render(searchInput.value));
clear.addEventListener("click", () => { searchInput.value = ""; render(""); searchInput.focus(); });
render("");
