# Nodoflix · Netflix / YouTube browse

Filas de títulos + fila YouTube. Catálogo en Atlas (`nodoflix.catalog`).

## Local

```bash
npm install
npm start
```

## Cloud Run

```bash
export GCP_PROJECT_ID=project-778283d9-dc7e-4c2c-947
export MONGODB_URI="mongodb+srv://USER:PASS@CLUSTER.mongodb.net/nodoflix?retryWrites=true&w=majority&authSource=admin"

gcloud run deploy netflix-browse-vanilla \
  --project $GCP_PROJECT_ID \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --update-env-vars="MONGODB_URI=${MONGODB_URI},MONGODB_DB=nodoflix,MONGODB_COLLECTION=catalog"
```

`/health` → `"store":"mongodb"`.

## API

- `GET /api/catalog`
- `GET /api/title?id=n1`
- `GET /health`
