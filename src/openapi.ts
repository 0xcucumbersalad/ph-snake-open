/** OpenAPI 3.0.3 document for the SnaKédex public open-data API.
 *
 * Covers the admin-verified sightings endpoints plus the existing public
 * read-only data endpoints (scores, overrides, hidden, places, species).
 *
 * The prose here is written for a general audience — students, journalists,
 * researchers, hobbyists — not just developers, since /api/docs is linked
 * from the homepage. Protocol-level detail (exact match semantics, clamping,
 * header names, cache behaviour) is collected in a "For developers" section
 * at the end of `info.description` rather than scattered through the
 * user-facing copy. Field descriptions avoid internal vocabulary such as
 * `photo_key`, `IMG_BASE`, or "species dictionary".
 *
 * The spec is generated at request time so the server URL matches the request
 * origin, which keeps it correct for both the production custom domain and
 * the workers.dev preview URL. */

const TITLE = "SnaKédex Open Data API";
const VERSION = "1.0.0";
// Local development origin. All examples, links and the machine-readable
// spec URL point here so the docs work entirely against localhost.
const ORIGIN_HOMEPAGE = "http://localhost:3000";
// The live SnaKédex project this open-data API is derived from.
const SNAKEDEX_PROJECT = "https://snakedex.0xcucumbersalad.dev";
// The public Facebook group every sighting was identified from.
const SOURCE_GROUP = "https://facebook.com/groups/900072927547214";
const CONTACT_EMAIL = "0xcucumbersalad@proton.me";

/** Venom tiers as they appear in the dataset, ordered most to least
 *  dangerous. Must stay in sync with `src/lib/types.ts`. `unknown` is only
 *  emitted when a species has no dictionary entry. */
const VENOM_TIERS = [
  "highly-venomous",
  "venomous",
  "mildly-venomous",
  "non-venomous",
  "unknown",
] as const;

const DESCRIPTION = `
Every snake photo in [SnaKédex](${ORIGIN_HOMEPAGE}) that an expert has
identified, free for anyone to use.

Around **10,000 snake sightings** from across the Philippines — what species
it was, which province it turned up in, and whether it's venomous. No sign-up,
no API key, no cost. Open it in your browser right now:

[${ORIGIN_HOMEPAGE}/api/sightings?province=Cebu](${ORIGIN_HOMEPAGE}/api/sightings?province=Cebu)

## Try it without writing any code

Every green **Try it out** button on this page sends a real request and shows
you the real answer. Nothing to install, nothing to sign up for. Start with
**GET /sightings** below.

## What you get

Each sighting tells you:

- **Which snake** — both the common name ("Philippine Cat Snake") and the
  scientific one (*Boiga angulata*).
- **How dangerous** — from \`non-venomous\` up to \`highly-venomous\`.
- **Where** — the province, plus a more specific spot when we know it.
- **A photo** — a direct image link.
- **Expert notes** — what the identifying moderator said about it.

## Why you can trust it

Every sighting here was identified by a **moderator who knows snakes**.
Guesses from the general public never appear.

All records come from one public Facebook community — the
[Philippine snake identification group](${SOURCE_GROUP}) — and each sighting's
\`source_url\` links straight back to the original post it was identified from.

Our moderators keep correcting the record, and this API always serves their
latest word: if they fix an ID, you get the corrected species; if they move a
sighting to the right province, you get the new one; if a photo turns out not
to be a snake at all, it disappears from these results. Corrections show up
within about a minute.

One thing to know: some records are photos of **shed skins** rather than the
live animal. Each sighting says which it is, so you can skip them if you only
want live-animal records.

## Common things people ask for

| You want | Add this to the URL |
| --- | --- |
| Snakes from one province | \`?province=Cebu\` |
| Only the dangerous ones | \`?venom=highly-venomous\` |
| One specific species | \`?species=Boiga angulata\` |
| Search by name or place | \`?q=cobra\` |
| More results at once | \`?limit=200\` (200 is the most) |

Combine them freely — \`?province=Cebu&venom=highly-venomous\` gives you the
dangerous snakes in Cebu.

## Getting all of it

You get 50 sightings at a time by default, up to 200 if you ask. To walk
through everything, keep asking for the next batch with \`offset\`: \`offset=0\`
for the first 200, \`offset=200\` for the next, and so on. The \`total\` field
tells you how many there are altogether, and you'll get an empty list once
you reach the end.

The order never shifts around between requests, so you won't miss records or
see the same one twice.

## How much you can use

**100 requests a minute.** That's plenty for a website, a class project, or a
research script, and there's nothing to apply for.

If you go over, we'll ask you to wait a few seconds and tell you exactly how
long. Asking for \`limit=200\` instead of lots of small requests is the easy way
to stay well under.

## Using it in your own project

Sightings work straight from a web page — no proxy or server needed. Here's
the whole thing in JavaScript:

\`\`\`js
const res  = await fetch("${ORIGIN_HOMEPAGE}/api/sightings?province=Cebu");
const data = await res.json();
console.log(\`\${data.total} sightings in Cebu\`);
for (const s of data.sightings) {
  console.log(s.common, "-", s.venom, "-", s.location);
}
\`\`\`

Or from a terminal:

\`\`\`bash
curl "${ORIGIN_HOMEPAGE}/api/sightings?province=Cebu"
\`\`\`

## Please credit us

The data is free to use, including commercially, under
[Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).
All we ask is that you credit **[SnaKédex](${SNAKEDEX_PROJECT})** and link back
to the project at [${SNAKEDEX_PROJECT}](${SNAKEDEX_PROJECT}).

Built something with it, or spotted a mistake in an identification? Email us
at [${CONTACT_EMAIL}](mailto:${CONTACT_EMAIL}) — we'd genuinely like to hear
about it.

---

### For developers

Everything above in protocol terms, if that's what you're after:

- **Auth:** none. All endpoints are \`GET\`, public and read-only. CORS is
  \`Access-Control-Allow-Origin: *\`.
- **Filters:** \`province\`, \`species\`, and \`venom\` match exactly and are
  case-sensitive; \`q\` is a case-insensitive substring match over common name,
  scientific name, and location. Filters combine with AND. Unknown query
  parameters are ignored.
- **Paging:** \`limit\` (default 50, max 200) and \`offset\`. Out-of-range values
  are clamped rather than rejected, and an \`offset\` past \`total\` returns an
  empty array, not an error. Ordering is province, then scientific name, then
  photo key.
- **Rate limit:** 100 requests per 60 seconds per IP, sliding window. Responses
  carry \`RateLimit-Limit\`, \`RateLimit-Remaining\`, \`RateLimit-Reset\` and
  \`RateLimit-Policy: 100;w=60\`; a \`429\` also carries \`Retry-After\` in seconds.
  \`/openapi.json\` and \`/docs\` are not rate-limited.
- **Caching:** \`Cache-Control: public, max-age=60,
  stale-while-revalidate=600\`, so a cached response can trail moderator edits
  by up to a minute.
- **Machine-readable spec:** [\`/api/openapi.json\`](${ORIGIN_HOMEPAGE}/api/openapi.json)
  (OpenAPI 3.0.3) — point your client generator at it.
`.trim();

/** Shared rate-limit response headers, referenced from each sightings
 *  response so the definitions live in `components.headers` exactly once. */
const RATE_LIMIT_HEADER_REFS = {
  "RateLimit-Policy": { $ref: "#/components/headers/RateLimit-Policy" },
  "RateLimit-Limit": { $ref: "#/components/headers/RateLimit-Limit" },
  "RateLimit-Remaining": { $ref: "#/components/headers/RateLimit-Remaining" },
  "RateLimit-Reset": { $ref: "#/components/headers/RateLimit-Reset" },
};

/** Headers on a successful (cacheable) sightings response. */
const SUCCESS_HEADER_REFS = {
  ...RATE_LIMIT_HEADER_REFS,
  "Cache-Control": { $ref: "#/components/headers/Cache-Control" },
  "Access-Control-Allow-Origin": { $ref: "#/components/headers/Access-Control-Allow-Origin" },
};

/** Build the OpenAPI document, deriving the server URL from the request. */
export function buildOpenApiSpec(origin: string): object {
  // No trailing slash: OpenAPI concatenates `servers[].url` with the path
  // template, so `.../api/` + `/sightings` would yield a double slash.
  const serverUrl = `/api`;

  return {
    openapi: "3.0.3",
    info: {
      title: TITLE,
      version: VERSION,
      // NOTE: `info.summary` is OpenAPI 3.1+ only and is invalid in 3.0.3,
      // so the one-line pitch lives at the top of `description` instead.
      description: DESCRIPTION,
      termsOfService: `${origin.replace(/\/+$/, "")}/api/terms`,
      contact: { name: "SnaKédex", url: SNAKEDEX_PROJECT, email: CONTACT_EMAIL },
      license: { name: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
    },
    externalDocs: {
      url: SNAKEDEX_PROJECT,
      description: "SnaKédex — the live SnaKédex app and map.",
    },
    servers: [{ url: serverUrl, description: "SnaKédex — live data" }],

    tags: [
      {
        name: "Sightings",
        description:
          "Expert-identified snake sightings — the main thing most people " +
          "want. Around 10,000 records covering species, venom level, " +
          "province, and photos. Start here.",
      },
    ],

    // Explicitly public: no security schemes apply to any operation.
    security: [],
    components: {
      parameters: {
        Province: {
          name: "province",
          in: "query",
          required: false,
          description:
            "Show only sightings from one province, e.g. `Cebu`. " +
            "Spelling and capitalisation must match exactly.",
          schema: { type: "string", minLength: 1, maxLength: 120 },
          example: "Cebu",
        },
        Species: {
          name: "species",
          in: "query",
          required: false,
          description:
            "Show only one species, using its scientific name, e.g. " +
            "`Boiga angulata`. Not sure of the spelling? Use `q` instead.",
          schema: { type: "string", minLength: 1, maxLength: 120 },
          example: "Boiga angulata",
        },
        Venom: {
          name: "venom",
          in: "query",
          required: false,
          description:
            "Show only snakes at one danger level. `highly-venomous` is the " +
            "medically serious end; `non-venomous` is harmless to people.",
          schema: {
            type: "string",
            enum: VENOM_TIERS,
          },
          example: "non-venomous",
        },
        Query: {
          name: "q",
          in: "query",
          required: false,
          description:
            "Search by any part of a name or place — `cobra`, `viper`, " +
            "`Manila`. Capitalisation doesn't matter. Looks at the common " +
            "name, the scientific name, and the location.",
          schema: { type: "string", minLength: 1, maxLength: 200 },
          example: "cobra",
        },
        Limit: {
          name: "limit",
          in: "query",
          required: false,
          description:
            "How many sightings to return at once. Defaults to 50; 200 is " +
            "the most allowed.",
          schema: { type: "integer", minimum: 1, maximum: 200, default: 50 },
          example: 50,
        },
        Offset: {
          name: "offset",
          in: "query",
          required: false,
          description:
            "How many sightings to skip — use this to get the next batch. " +
            "`0` is the start, `200` skips the first 200.",
          schema: { type: "integer", minimum: 0, default: 0 },
          example: 0,
        },
        SightingKey: {
          name: "key",
          in: "path",
          required: true,
          description:
            "The `key` of a sighting, which looks like a filename. Copy one " +
            "from any result of the list endpoint above.",
          schema: { type: "string", minLength: 1, maxLength: 200, pattern: "^[^/]+$" },
          example: "10000157193342192.jpg",
        },
      },

      headers: {
        "RateLimit-Policy": {
          description: "The limit in force: `100;w=60` means 100 requests per 60 seconds.",
          schema: { type: "string", example: "100;w=60" },
        },
        "RateLimit-Limit": {
          description: "How many requests you get per minute (100).",
          schema: { type: "integer", example: 100 },
        },
        "RateLimit-Remaining": {
          description: "How many requests you have left this minute.",
          schema: { type: "integer", example: 99 },
        },
        "RateLimit-Reset": {
          description: "Seconds until your allowance refreshes.",
          schema: { type: "integer", example: 59 },
        },
        "Cache-Control": {
          description:
            "How long this response may be cached. Results can trail moderator " +
            "edits by up to a minute.",
          schema: { type: "string", example: "public, max-age=60, stale-while-revalidate=600" },
        },
        "Retry-After": {
          description: "How long to wait before trying again. Only sent with a `429`.",
          schema: { type: "integer", example: 12 },
        },
        "Access-Control-Allow-Origin": {
          description: "Always `*`, so you can call this straight from a web page.",
          schema: { type: "string", example: "*" },
        },
      },

      responses: {
        BadRequest: {
          description:
            "The sighting key wasn't readable. This usually means it got " +
            "mangled in the URL — try copying it again from a search result.",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
        NotFound: {
          description:
            "Nothing matches that key. Either it's wrong, or a moderator has " +
            "since removed the photo.",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
        TooManyRequests: {
          description:
            "You've made more than 100 requests in the past minute. Wait the " +
            "number of seconds given in `retry_after` and carry on — nothing " +
            "is blocked permanently.",
          headers: {
            ...RATE_LIMIT_HEADER_REFS,
            "Retry-After": { $ref: "#/components/headers/Retry-After" },
          },
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
        InternalServerError: {
          description:
            "Something went wrong on our end. Worth retrying; if it keeps " +
            "happening, please let us know.",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
      },

      schemas: {
        Sighting: {
          type: "object",
          required: ["key", "species", "common", "venom", "province", "authority", "shed"],
          additionalProperties: false,
          description:
            "A single snake sighting: what it was, where it was seen, and how " +
            "dangerous it is.",
          properties: {
            key: {
              type: "string",
              minLength: 1,
              maxLength: 200,
              pattern: "^[^/]+$",
              description:
                "This sighting's unique ID. Pass it to `/sightings/{key}` to " +
                "look up this one record again later.",
              example: "10000157193342192.jpg",
            },
            species: {
              type: "string",
              description:
                "The scientific name, e.g. `Boiga angulata`. Use this if " +
                "you're cross-referencing other biodiversity databases.",
              example: "Coelognathus erythrurus psephenourus",
            },
            common: {
              type: "string",
              description:
                "The everyday English name, e.g. `Philippine Cat Snake`. This " +
                "is the one to show people.",
              example: "Philippine Grey-tailed Ratsnake",
            },
            venom: {
              type: "string",
              enum: VENOM_TIERS,
              description:
                "How dangerous this snake is to people, from " +
                "`highly-venomous` (medically serious) down to " +
                "`non-venomous` (harmless). `unknown` is rare and means we " +
                "have no venom information for the species.",
              example: "non-venomous",
            },
            family: {
              type: "string",
              nullable: true,
              description:
                "The scientific family the snake belongs to, such as " +
                "`Colubridae` or `Elapidae` (the cobra family). `null` if we " +
                "don't have it.",
              example: "Colubridae",
            },
            endemic: {
              type: "boolean",
              nullable: true,
              description:
                "`true` if this species is found only in the Philippines and " +
                "nowhere else in the world. `null` if we don't know.",
              example: true,
            },
            province: {
              type: "string",
              description: "The province the snake was seen in.",
              example: "Cebu",
            },
            location: {
              type: "string",
              nullable: true,
              description:
                "A more specific place within the province, like a city or " +
                "barangay, when whoever posted it said. `null` if not.",
              example: "Cebu City",
            },
            authority: {
              type: "string",
              enum: ["admin"],
              description:
                "Who identified the snake. Always `admin` here, meaning a " +
                "moderator who knows snakes — that's the whole point of this " +
                "dataset.",
              example: "admin",
            },
            shed: {
              type: "boolean",
              description:
                "`true` if the photo is of a shed skin rather than a live " +
                "snake. Skip these if you only want live-animal sightings.",
              example: false,
            },
            image: {
              type: "string",
              nullable: true,
              format: "uri",
              description:
                "Direct link to the photo. You can use this straight in an " +
                "`<img>` tag.",
              example: "https://snake-cdn.0xcucumbersalad.dev/img/10000157193342192.jpg",
            },
            post_id: {
              type: "string",
              nullable: true,
              description:
                "Our internal reference for the original post this came " +
                "from. Most people can ignore this — use `source_url` for a " +
                "clickable link.",
              example: "1685813902306442",
            },
            source_url: {
              type: "string",
              nullable: true,
              format: "uri",
              description:
                "Link to the original Facebook group post this sighting was " +
                "identified from. Every record comes from the public " +
                "[Philippine snake ID group](https://facebook.com/groups/900072927547214).",
              example: "https://facebook.com/groups/900072927547214/1685813902306442",
            },
            admin_comments: {
              type: "array",
              description:
                "What the identifying moderator said about the snake — often " +
                "the reasoning behind the ID, or a safety note. Usually the " +
                "most interesting part of a record.",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["text"],
                properties: {
                  text: { type: "string", example: "Philippine Grey-Tailed Rat Snake..." },
                  author: { type: "string", nullable: true, example: "Rudy Rueda" },
                },
              },
            },
          },
          example: {
            key: "10000157193342192.jpg",
            species: "Coelognathus erythrurus psephenourus",
            common: "Philippine Grey-tailed Ratsnake",
            venom: "non-venomous",
            family: "Colubridae",
            endemic: true,
            province: "Cebu",
            location: "Cebu City",
            authority: "admin",
            shed: false,
            image: "https://snake-cdn.0xcucumbersalad.dev/img/10000157193342192.jpg",
            post_id: "1685813902306442",
            source_url: "https://facebook.com/groups/900072927547214/1685813902306442",
            admin_comments: [
              {
                text: "Philippine Grey-Tailed Rat Snake \"Maninina\" (Coelognathus erythrurus psephenourus). Non Venomous & Great for Pest Control.",
                author: "Rudy Rueda",
              },
            ],
          },
        },
        SightingList: {
          type: "object",
          required: ["total", "limit", "offset", "count", "sightings"],
          additionalProperties: false,
          description: "One batch of sightings, plus how many there are in total.",
          properties: {
            total: {
              type: "integer",
              minimum: 0,
              description:
                "How many sightings match your search altogether — not just " +
                "in this batch. Use it to work out how many batches to fetch.",
              example: 1234,
            },
            limit: {
              type: "integer",
              minimum: 1,
              maximum: 200,
              description: "The batch size that was used.",
              example: 50,
            },
            offset: {
              type: "integer",
              minimum: 0,
              description: "How many sightings were skipped to reach this batch.",
              example: 0,
            },
            count: {
              type: "integer",
              minimum: 0,
              description:
                "How many sightings are in this batch. Smaller than `limit` on " +
                "the last batch, and `0` once you've reached the end.",
              example: 50,
            },
            sightings: {
              type: "array",
              description: "The sightings themselves.",
              items: { $ref: "#/components/schemas/Sighting" },
            },
          },
          example: {
            total: 1234,
            limit: 50,
            offset: 0,
            count: 1,
            sightings: [
              {
                key: "10000157193342192.jpg",
                species: "Coelognathus erythrurus psephenourus",
                common: "Philippine Grey-tailed Ratsnake",
                venom: "non-venomous",
                family: "Colubridae",
                endemic: true,
                province: "Cebu",
                location: "Cebu City",
                authority: "admin",
                shed: false,
                image: "https://snake-cdn.0xcucumbersalad.dev/img/10000157193342192.jpg",
                post_id: "1685813902306442",
                source_url: "https://facebook.com/groups/900072927547214/1685813902306442",
                admin_comments: [],
              },
            ],
          },
        },
        Error: {
          type: "object",
          additionalProperties: false,
          required: ["error"],
          properties: {
            error: {
              type: "string",
              description: "A short description of what went wrong.",
              example: "not found",
            },
            retry_after: {
              type: "integer",
              nullable: true,
              description:
                "How many seconds to wait before trying again. Only present " +
                "when you've hit the rate limit.",
              example: 12,
            },
          },
        },
      },
    },

    paths: {
      "/sightings": {
        get: {
          tags: ["Sightings"],
          operationId: "listSightings",
          summary: "Search snake sightings",
          description:
            "The main endpoint — search roughly 10,000 expert-identified " +
            "snake sightings from across the Philippines.\n\n" +
            "Call it with no options to get the 50 most recent by ordering, or " +
            "narrow things down with the filters below. Try `province=Cebu`, " +
            "or `venom=highly-venomous` to see only the dangerous ones. You " +
            "can combine as many filters as you like.\n\n" +
            "**Hit the Try it out button** to run a real search and see what " +
            "comes back.\n\n" +
            "You'll get 50 sightings at a time unless you ask for more with " +
            "`limit` (up to 200). `total` in the response tells you how many " +
            "matched overall, and `offset` fetches the next batch.",
          parameters: [
            { $ref: "#/components/parameters/Province" },
            { $ref: "#/components/parameters/Species" },
            { $ref: "#/components/parameters/Venom" },
            { $ref: "#/components/parameters/Query" },
            { $ref: "#/components/parameters/Limit" },
            { $ref: "#/components/parameters/Offset" },
          ],
          responses: {
            "200": {
              description: "Success — a batch of matching sightings.",
              headers: SUCCESS_HEADER_REFS,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SightingList" },
                },
              },
            },
            "429": { $ref: "#/components/responses/TooManyRequests" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      "/sightings/{key}": {
        get: {
          tags: ["Sightings"],
          operationId: "getSighting",
          summary: "Look up one sighting",
          description:
            "Fetch a single sighting by its `key`. Handy when you've saved a " +
            "reference to one and want to check it again later.\n\n" +
            "Grab a `key` from any result of the search above and paste it in. " +
            "You'll get a `404` if nothing matches — either the key is wrong, " +
            "or a moderator has since removed that photo.",
          parameters: [{ $ref: "#/components/parameters/SightingKey" }],
          responses: {
            "200": {
              description: "Success — the sighting you asked for.",
              headers: SUCCESS_HEADER_REFS,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Sighting" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "404": { $ref: "#/components/responses/NotFound" },
            "429": { $ref: "#/components/responses/TooManyRequests" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },
    },
  };
}

const CACHE_CONTROL = "public, max-age=0, must-revalidate";

/** Serve the OpenAPI document as JSON, with the server URL derived from the
 *  request so it stays correct for both production and preview URLs. */
export function openApiJsonResponse(request: Request): Response {
  const spec = buildOpenApiSpec(publicOrigin(request));
  return new Response(JSON.stringify(spec), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": CACHE_CONTROL,
      "access-control-allow-origin": "*",
      "x-content-type-options": "nosniff",
    },
  });
}

/** The externally reachable origin for this request.
 *
 *  `request.url` reports the scheme of the connection the Worker sees, which
 *  is `http:` under `wrangler dev` and can be `http:` behind the Cloudflare
 *  edge. Advertising `http://` in `servers[].url` would send clients to a
 *  redirect, so honour `X-Forwarded-Proto` and otherwise assume https for
 *  any non-loopback host. */
function publicOrigin(request: Request): string {
  const url = new URL(request.url);
  const forwarded = request.headers.get("X-Forwarded-Proto")?.split(",")[0]?.trim();
  if (forwarded === "https" || forwarded === "http") {
    url.protocol = `${forwarded}:`;
  } else if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1" && url.hostname !== "[::1]") {
    url.protocol = "https:";
  }
  return url.origin;
}
