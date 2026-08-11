# SnaKédex Open Data API

A small, read-only HTTP API that serves **expert-verified snake sightings from the Philippines** as open data. It ships with interactive Swagger UI docs and a machine-readable OpenAPI 3.0.3 spec.

> This is the open-data API for **[SnaKédex](https://snakedex.0xcucumbersalad.dev)**. Every sighting was identified by moderators in the public [Philippine snake identification Facebook group](https://facebook.com/groups/900072927547214), and each record links back to its original post via `source_url`.

Only **admin-verified** sightings are exposed — records identified by a moderator who knows snakes. Unverified community submissions are excluded from every endpoint.

- **10,426** admin-verified sightings across **81** provinces
- Species, common name, venom tier, province, photo, and moderator notes
- No API key, no sign-up — every endpoint is a public `GET`
- Built on [Hono](https://hono.dev); deployed on Cloudflare Workers

## Live API

Deployed at **https://ph-snake-open.edgie.workers.dev**

- **Interactive docs (Swagger UI):** https://ph-snake-open.edgie.workers.dev/api/docs
- **OpenAPI spec (JSON):** https://ph-snake-open.edgie.workers.dev/api/openapi.json
- **Sightings:** https://ph-snake-open.edgie.workers.dev/api/sightings?province=Cebu

The root path `/` redirects to `/api/docs`.

## Run locally

```bash
npm install
npm run dev        # wrangler dev (Workers runtime)
# or
npm run dev:node   # tsx server.ts on http://localhost:3000
```

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/sightings` | Search admin-verified sightings (filters + paging) |
| `GET` | `/api/sightings/:key` | Look up a single sighting by its `key` |
| `GET` | `/api/openapi.json` | OpenAPI 3.0.3 document |
| `GET` | `/api/docs` | Swagger UI reference |
| `GET` | `/api/terms` | Terms of service |

### Query parameters for `/api/sightings`

| Parameter | Type | Description |
| --- | --- | --- |
| `province` | string | Exact-match province, e.g. `Cebu` (case-sensitive) |
| `species` | string | Exact-match scientific name, e.g. `Boiga angulata` |
| `venom` | string | One of `highly-venomous`, `venomous`, `mildly-venomous`, `non-venomous`, `unknown` |
| `q` | string | Case-insensitive substring search over common name, scientific name, and location |
| `limit` | integer | Batch size, default `50`, max `200` |
| `offset` | integer | Number of records to skip (paging) |

Filters combine with AND. Results are stably ordered (province → scientific name → key), so paging with `offset` never skips or repeats a record.

### Example

```bash
curl "http://localhost:3000/api/sightings?province=Cebu&venom=highly-venomous&limit=5"
```

```json
{
  "total": 1234,
  "limit": 5,
  "offset": 0,
  "count": 5,
  "sightings": [
    {
      "key": "10000157193342192.jpg",
      "species": "Coelognathus erythrurus psephenourus",
      "common": "Philippine Grey-tailed Ratsnake",
      "venom": "non-venomous",
      "family": "Colubridae",
      "endemic": true,
      "province": "Cebu",
      "location": "Cebu City",
      "authority": "admin",
      "shed": false,
      "image": "https://snake-cdn.0xcucumbersalad.dev/img/10000157193342192.jpg",
      "post_id": "1685813902306442",
      "source_url": "https://facebook.com/groups/900072927547214/1685813902306442",
      "admin_comments": [
        { "text": "Non venomous, great for pest control.", "author": "Rudy Rueda" }
      ]
    }
  ]
}
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev:node` | Run locally with Node (`tsx server.ts`) on port 3000 |
| `npm run dev` | Run locally with `wrangler dev` (Cloudflare Workers) |
| `npm run build` | Deploy to Cloudflare Workers (`wrangler deploy`) |

## Project structure

```
.
├── server.ts          # Local Node entrypoint (@hono/node-server)
├── src/
│   ├── index.ts       # Hono app, routes, admin-only filtering
│   ├── openapi.ts      # OpenAPI 3.0.3 document (generated per request)
│   └── swaggerUi.ts   # Themed Swagger UI page
├── sightings.json     # Source dataset
└── wrangler.toml      # Cloudflare Workers config
```

## Deployment

Deployed on **Cloudflare Workers** (`src/index.ts`, set as `main` in `wrangler.toml`):

```bash
npm run build   # wrangler deploy
```

The bundled dataset is ~7 MB (~1 MB gzipped), comfortably within the Workers size limit. For local development, `server.ts` runs the same Hono app under Node via `@hono/node-server`.

## Data notes

- **Source:** all sightings come from the public [Philippine snake identification Facebook group](https://facebook.com/groups/900072927547214). Each record's `source_url` links back to the exact post it was identified from.
- **Verification:** every sighting is identified by a moderator; unverified community submissions never appear.
- **Shed skins:** some records are photos of shed skins rather than live animals — check the `shed` field.
- **Images:** the `image` field points at an external photo CDN (`snake-cdn.0xcucumbersalad.dev`).

## Related

- **[SnaKédex](https://snakedex.0xcucumbersalad.dev)** — the live SnaKédex app and map this open-data API is derived from.
- **[Source Facebook group](https://facebook.com/groups/900072927547214)** — the community where every sighting was identified.

## License

Data is available under [Creative Commons Attribution 4.0 (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/) — free to use, including commercially, with attribution to **[SnaKédex](https://snakedex.0xcucumbersalad.dev)**.
