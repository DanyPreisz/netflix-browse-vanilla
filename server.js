const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const SEED = path.join(ROOT, "data", "catalog.json");
const LOCAL_DB = process.env.DB_PATH || path.join("/tmp", "netflix-catalog.json");
const MONGO_URI = process.env.MONGODB_URI || "";
const MONGO_DB = process.env.MONGODB_DB || "nodoflix";
const MONGO_COL = process.env.MONGODB_COLLECTION || "catalog";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function seedCatalog() {
  try {
    return JSON.parse(fs.readFileSync(SEED, "utf8"));
  } catch {
    return { rows: [] };
  }
}

let colPromise = null;

async function collection() {
  if (!MONGO_URI) return null;
  if (!colPromise) {
    colPromise = (async () => {
      const { MongoClient } = require("mongodb");
      const client = new MongoClient(MONGO_URI);
      await client.connect();
      const col = client.db(MONGO_DB).collection(MONGO_COL);
      if ((await col.countDocuments({ id: "catalog" })) === 0) {
        await col.insertOne({ id: "catalog", ...seedCatalog() });
      }
      return col;
    })();
  }
  return colPromise;
}

function localRead() {
  try {
    if (fs.existsSync(LOCAL_DB)) return JSON.parse(fs.readFileSync(LOCAL_DB, "utf8"));
  } catch {}
  const seed = seedCatalog();
  localWrite(seed);
  return seed;
}

function localWrite(data) {
  fs.writeFileSync(LOCAL_DB, JSON.stringify(data, null, 2));
}

async function loadCatalog(col) {
  if (!col) return localRead();
  const doc = await col.findOne({ id: "catalog" }, { projection: { _id: 0 } });
  return { rows: (doc && doc.rows) || [] };
}

function send(res, status, body, type = TYPES[".json"]) {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function file(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, "No encontrado", "text/plain; charset=utf-8");
    send(res, 200, data, TYPES[path.extname(filePath)] || "application/octet-stream");
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const col = await collection();

    if (req.method === "GET" && (url.pathname === "/health" || url.pathname === "/healthz")) {
      return send(res, 200, { ok: true, store: col ? "mongodb" : "local" });
    }

    if (req.method === "GET" && url.pathname === "/api/catalog") {
      return send(res, 200, await loadCatalog(col));
    }

    if (req.method === "GET" && url.pathname === "/api/title") {
      const id = url.searchParams.get("id");
      const data = await loadCatalog(col);
      const item = (data.rows || []).flatMap((r) => r.items || []).find((it) => it.id === id);
      if (!item) return send(res, 404, { error: "not found" });
      return send(res, 200, { ...item, blurb: `${item.title} (${item.year}). ${item.kind}.` });
    }

    const rel = url.pathname === "/" ? "/index.html" : url.pathname;
    const safe = path.normalize(rel).replace(/^(\.\.[/\\])+/, "");
    file(res, path.join(PUBLIC, safe));
  } catch (err) {
    console.error(err);
    send(res, 500, { error: "store", detail: String(err.message || err) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`listening on http://${HOST}:${PORT} store=${MONGO_URI ? "mongodb" : "local"}`);
});
