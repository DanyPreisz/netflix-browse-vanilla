const rowsEl = document.querySelector("#rows");
const hero = document.querySelector("#hero");
const modal = document.querySelector("#modal");
const detail = document.querySelector("#detail");
const search = document.querySelector("#q");
let catalog = [];

document.querySelector("#close").addEventListener("click", () => {
  modal.hidden = true;
});
modal.addEventListener("click", (event) => {
  if (event.target === modal) modal.hidden = true;
});

search.addEventListener("input", () => paint(search.value.trim().toLowerCase()));

rowsEl.addEventListener("click", async (event) => {
  const btn = event.target.closest("[data-id]");
  if (!btn) return;
  const res = await fetch("/api/title?id=" + encodeURIComponent(btn.dataset.id));
  const item = await res.json();
  detail.innerHTML = `<h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.blurb)}</p><p>${escapeHtml(item.tag || "")}</p>`;
  modal.hidden = false;
});

async function load() {
  const res = await fetch("/api/catalog");
  const data = await res.json();
  catalog = data.rows;
  const first = catalog[0]?.items[0];
  if (first) {
    hero.innerHTML = `<p>Original</p><h1>${escapeHtml(first.title)}</h1><p>${escapeHtml(first.kind)} · ${first.year}</p><button class="play" type="button" data-id="${first.id}">Ver</button>`;
  }
  paint("");
}

function paint(q) {
  rowsEl.innerHTML = catalog
    .map((row) => {
      const items = row.items.filter((it) => !q || `${it.title} ${it.kind}`.toLowerCase().includes(q));
      if (!items.length) return "";
      return `<section class="row"><h2>${escapeHtml(row.title)}</h2><div class="scroller">${items
        .map(
          (it) =>
            `<button class="tile" data-id="${it.id}"><small>${escapeHtml(it.tag)}</small>${escapeHtml(it.title)}<small>${escapeHtml(it.kind)} · ${it.year}</small></button>`
        )
        .join("")}</div></section>`;
    })
    .join("");
}

function escapeHtml(s) {
  return String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;");
}

load();
