/** Serves a Swagger UI page at `/api/docs` that loads the OpenAPI document
 *  from `/api/openapi.json`. The UI assets are pulled from a pinned CDN
 *  version, so the worker stays small and stateless.
 *
 *  THEME: this page is skinned to match the SnaKédex app (src/index.css), not
 *  stock Swagger UI. The rules mirrored from the app are:
 *    - dark palette only: void #0f0f1b / panel #1a1a2e / panel2 #252542,
 *      ink #e8e8f0, dim #8a8ab0, accents venom #ff2e57 / mild #ffb800 /
 *      safe #39ff14 / dexblue #3aa0e0, dexred #e03a3a housing
 *    - border-radius is ALWAYS 0; frames are a 6x6 SVG border-image sprite
 *      with knocked-out corner pixels, never a plain border
 *    - shadows are hard offsets (`4px 4px 0 #000`), never blurred
 *    - motion is stepped, never eased
 *  The page is wrapped in the same Pokédex device chrome as DexShell.tsx
 *  (red plastic housing, hinge gloss, corner screws, recessed CRT screen with
 *  scanlines, speaker-grille vent), so the docs read as part of the app.
 *
 *  TYPE is the one deliberate divergence from the app. The app renders short
 *  labels and one-line readouts, so it can use "Press Start 2P" + "VT323"
 *  throughout. This is a long reference document people actually read, and both
 *  faces fail at that job: Press Start 2P is a bitmap face with no lowercase
 *  rhythm (it was being used at 7-9px for table headers, which is decoration,
 *  not text), and VT323 is a thin CRT face that smears at body sizes and makes
 *  l/1/I ambiguous — unacceptable for copyable API values. So the pixel face is
 *  kept for CHROME ONLY (banners, method chips, buttons, the wordmark) at a
 *  10px floor, and reading is done by --font-ui / --font-code. See the token
 *  block for the full rationale.
 *
 *  Tailwind does not scan `worker/`, so every style here is hand-written CSS.
 *  Swagger UI's own stylesheet is very specific, hence the `!important` use. */

const SWAGGER_VERSION = "5.18.2";
const SWAGGER_BASE = `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_VERSION}`;

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SnaKédex Open Data API — Reference</title>
  <meta name="description" content="Interactive reference for the SnaKédex Open Data API: admin-verified snake sightings in the Philippines." />
  <meta name="color-scheme" content="dark" />
  <meta name="theme-color" content="#e03a3a" />
  <link rel="icon" href="/favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" />
  <link rel="stylesheet" href="${SWAGGER_BASE}/swagger-ui.css" />
  <style>
  /* ===================================================================== *
   * 1. Design tokens — copied from src/index.css / tailwind.config.js
   * ===================================================================== */
  :root {
    color-scheme: dark;

    /* ---- Type stacks -------------------------------------------------------
       The app itself only needs two faces because it renders short labels and
       one-line readouts. This page is a long reference document, so the
       decorative faces are kept for CHROME ONLY and real reading is done by a
       system UI font:
         --font-pixel : "Press Start 2P". Enormous per-em and no lowercase
                        rhythm; never below 10px and never for prose.
         --font-ui    : all body copy, tables and descriptions.
         --font-code  : paths, params, types and code samples. Monospace is
                        semantically right here and far clearer than VT323,
                        which is a thin CRT face that smears at small sizes. */
    --font-pixel: "Press Start 2P", monospace;
    --font-ui: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    --font-code: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;

    --void: #0f0f1b;
    --panel: #1a1a2e;
    --panel2: #252542;
    --bevel: #3a3a5e;
    --screen: #14141f;
    --ink: #e8e8f0;
    --dim: #8a8ab0;
    --venom: #ff2e57;
    --mild: #ffb800;
    --safe: #39ff14;
    --dexblue: #3aa0e0;
    --dexred: #e03a3a;
    --dexred-hi: #ff6b6b;

    /* 6x6 border-image sprite: a 2px-thick ring with each outermost corner
       pixel knocked out. That knocked-out pixel is what makes a pixel-art
       frame step at the corners instead of drawing a sharp 90 degrees. */
    --px-frame-black: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='6' height='6' fill='%23000000'><path d='M1 0h4v1H1zM0 1h6v1H0zM0 2h2v2H0zM4 2h2v2H4zM0 4h6v1H0zM1 5h4v1H1z'/></svg>");

    /* 8x8 bitmap circle for LED-sized dots. border-radius:50% anti-aliases
       and instantly breaks the pixel look, so clip-path does the rounding. */
    --px-octagon: polygon(
      25% 0, 75% 0, 75% 12.5%, 87.5% 12.5%, 87.5% 25%, 100% 25%, 100% 75%,
      87.5% 75%, 87.5% 87.5%, 75% 87.5%, 75% 100%, 25% 100%, 25% 87.5%,
      12.5% 87.5%, 12.5% 75%, 0 75%, 0 25%, 12.5% 25%, 12.5% 12.5%, 25% 12.5%
    );
  }

  /* Frame recipe. background-clip: padding-box keeps the panel fill out of
     the ring so the knocked-out corner pixels stay transparent. */
  .px-frame-4,
  .px-frame-3,
  .px-frame-2 {
    border-style: solid;
    border-color: transparent;
    border-image-source: var(--px-frame-black);
    border-image-slice: 2;
    border-image-repeat: stretch;
    background-clip: padding-box;
  }
  .px-frame-4 { border-width: 4px; }
  .px-frame-3 { border-width: 3px; }
  .px-frame-2 { border-width: 2px; }

  /* ===================================================================== *
   * 2. Page base
   * ===================================================================== */
  html, body { margin: 0; padding: 0; }
  body {
    background: var(--void);
    color: var(--ink);
    font-family: var(--font-ui);
    font-size: 16px;
    line-height: 1.6;
    -webkit-text-size-adjust: 100%;
    -webkit-tap-highlight-color: transparent;
    /* Light text on a very dark background gains apparent weight; asking for
       grayscale AA thins it back to the intended stroke. */
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Nothing in a pixel UI eases — snap transitions to a few discrete frames. */
  *, *::before, *::after { transition-timing-function: steps(4, end) !important; }

  /* Kill anti-aliased corners anywhere they sneak in (Swagger UI, UA styles). */
  *, *::before, *::after { border-radius: 0 !important; }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  :focus-visible { outline: 3px solid var(--mild); outline-offset: 2px; }
  ::selection { background: var(--mild); color: #000; }

  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-track { background: var(--void); }
  ::-webkit-scrollbar-thumb { background: var(--bevel); border: 2px solid var(--void); }
  ::-webkit-scrollbar-thumb:hover { background: #4a4a7e; }

  .sd-skip {
    position: absolute; left: -9999px; top: 0; z-index: 999;
    font-family: var(--font-ui); font-size: 14px; font-weight: 700;
    background: var(--mild); color: #000; padding: 10px 14px;
  }
  .sd-skip:focus { left: 0; }

  /* ===================================================================== *
   * 3. Top nav bar — the app's StatsBar treatment
   * ===================================================================== */
  .sd-bar {
    position: sticky; top: 0; z-index: 200;
    background: var(--panel);
    border-bottom: 4px solid #000;
    box-shadow: inset 0 -2px 0 0 rgba(0, 0, 0, 0.5);
    padding: 10px 12px;
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  }
  .sd-bar a { text-decoration: none; }
  /* The wordmark stays pixel-font — it's a logo, not text to be read. */
  .sd-bar .sd-home {
    font-family: var(--font-pixel); font-size: 11px; line-height: 1.9;
    color: var(--safe); text-shadow: 1px 1px 0 #000;
    transition: color 0.06s;
  }
  .sd-bar .sd-home:hover { color: var(--mild); }
  .sd-bar .sd-sub {
    font-family: var(--font-ui); font-size: 13px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 1px;
    color: var(--dim);
  }
  .sd-bar .sd-links { margin-left: auto; display: flex; gap: 14px; flex-wrap: wrap; }
  .sd-bar .sd-links a {
    font-family: var(--font-ui); font-size: 13px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.8px;
    color: var(--dexblue);
    transition: color 0.06s;
  }
  .sd-bar .sd-links a:hover { color: var(--mild); }

  /* ===================================================================== *
   * 4. Pokédex device chrome — mirrors DexShell.tsx / src/index.css:648+
   * ===================================================================== */
  .sd-console {
    position: relative;
    display: block;
    max-width: 1180px;
    margin: 16px auto 28px;
    background-color: var(--dexred);
    border-style: solid; border-width: 4px; border-color: transparent;
    border-image-source: var(--px-frame-black);
    border-image-slice: 2; border-image-repeat: stretch;
    background-clip: padding-box;
    box-shadow: inset 0 0 0 3px var(--dexred-hi), 4px 4px 0 0 #000;
  }
  @media (max-width: 720px) {
    .sd-console { margin: 10px 6px 18px; }
  }

  /* Top hinge gloss — the plastic seam every device face plate has. */
  .dex-hinge {
    position: absolute; inset: 0 0 auto 0; height: 4px;
    background: rgba(255, 255, 255, 0.3); pointer-events: none;
  }

  /* Four corner screws holding the "case" together. */
  .dex-screw {
    position: absolute; width: 6px; height: 6px; background: #8a1f1f;
    box-shadow: inset 1px 1px 0 rgba(0, 0, 0, 0.55), inset -1px -1px 0 rgba(255, 255, 255, 0.15);
  }
  .dex-screw-tl { top: 6px; left: 6px; }
  .dex-screw-tr { top: 6px; right: 6px; }
  .dex-screw-bl { bottom: 6px; left: 6px; }
  .dex-screw-br { bottom: 6px; right: 6px; }

  .dex-header {
    position: relative;
    padding: 12px 16px 10px;
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    /* A darker flat shade of the housing red (no gradient, no blur) so the
       title clears AA at 5.62:1 instead of 4.34:1 on plain #e03a3a. */
    background: #c62828;
    box-shadow: inset 0 -2px 0 0 rgba(0, 0, 0, 0.25);
  }
  /* White on the #e03a3a housing is 4.34:1 — just under AA. The app can afford
     that for a one-word panel title, but this is a document header, so the
     header band uses a darker shade of the same red (a flat colour, keeping the
     no-blur/no-gradient rule) which lifts both title and subtitle over AA. */
  .dex-title {
    font-family: var(--font-pixel); font-size: 12px; line-height: 1.9;
    color: #fff; text-shadow: 2px 2px 0 #000;
  }
  .dex-subtitle {
    font-family: var(--font-ui); font-size: 14px; font-weight: 600;
    /* A light red-tinted ink rather than the app's rgba(0,0,0,0.8): on the
       darkened header band this reads as the same "recessed label" but at
       4.55:1 instead of failing. */
    color: #ffe0e0; line-height: 1.45; margin-top: 5px;
  }

  /* Indicator cluster: one big lens + three small status LEDs. */
  .dex-leds { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
  .dex-lens {
    position: relative; width: 24px; height: 24px;
    clip-path: var(--px-octagon); background: #000; isolation: isolate;
  }
  .dex-lens::before {
    content: ""; position: absolute; inset: 3px; z-index: -1;
    background: var(--dexblue); clip-path: inherit;
    box-shadow: inset 3px 3px 0 rgba(255, 255, 255, 0.4), inset -3px -3px 0 rgba(0, 0, 0, 0.3);
  }
  /* A single square of specular highlight — pixel art never uses a soft glint. */
  .dex-lens::after {
    content: ""; position: absolute; top: 6px; left: 6px;
    width: 3px; height: 3px; background: #fff;
  }
  .dex-led { width: 8px; height: 8px; clip-path: var(--px-octagon); background: #000; position: relative; }
  .dex-led::before {
    content: ""; position: absolute; inset: 2px; background: var(--c); clip-path: inherit;
    box-shadow: inset 1px 1px 0 rgba(255, 255, 255, 0.45);
  }
  .dex-led-red { --c: var(--venom); }
  .dex-led-amber { --c: var(--mild); }
  .dex-led-green { --c: var(--safe); }
  /* Stepped "power on" flash, not the smooth CSS pulse. */
  @keyframes led-blip { 0%, 45% { filter: brightness(1); } 46%, 100% { filter: brightness(0.45); } }
  .dex-led-green { animation: led-blip 1.4s steps(1) infinite; }

  /* The recessed screen module: black bevel, a visible red plastic margin
     around it (padding on the wrap), and scanlines for the CRT feel. */
  .dex-screen-wrap { padding: 0 8px 8px; }
  .dex-screen {
    position: relative;
    background-color: var(--screen);
    border-style: solid; border-width: 3px; border-color: transparent;
    border-image-source: var(--px-frame-black);
    border-image-slice: 2; border-image-repeat: stretch;
    background-clip: padding-box;
    box-shadow: inset 2px 2px 0 rgba(0, 0, 0, 0.6);
  }
  .dex-screen::after {
    content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 5;
    background: repeating-linear-gradient(
      0deg, rgba(0, 0, 0, 0.16) 0px, rgba(0, 0, 0, 0.16) 1px, transparent 1px, transparent 3px
    );
  }

  /* Bottom speaker-grille cap — bookends the device. */
  .dex-vent {
    height: 10px; margin: 0 10px;
    background: repeating-linear-gradient(
      90deg, rgba(0, 0, 0, 0.35) 0px, rgba(0, 0, 0, 0.35) 4px, transparent 4px, transparent 8px
    );
  }

  /* ===================================================================== *
   * 5. Fallbacks (no JS / CDN failure) — the app's parchment panel
   * ===================================================================== */
  .sd-fallback {
    display: none; margin: 20px; padding: 14px 16px;
    background-color: #fdf6e3; color: #22283a;
    border-style: solid; border-width: 4px; border-color: transparent;
    border-image-source: var(--px-frame-black);
    border-image-slice: 2; border-image-repeat: stretch;
    background-clip: padding-box;
    box-shadow: inset 0 0 0 3px #fff, 4px 4px 0 0 rgba(42, 47, 69, 0.5);
  }
  .sd-fallback h2 {
    font-family: var(--font-pixel); font-size: 11px;
    color: #c23a3a; margin: 0 0 12px; line-height: 1.9;
  }
  .sd-fallback p { font-family: var(--font-ui); font-size: 15px; margin: 0; line-height: 1.6; }
  .sd-fallback code {
    background: #efe6cd; border: 2px solid #2a2f45; padding: 0 4px; word-break: break-all;
  }
  .sd-fallback a { color: #2a6db0; }

  /* ===================================================================== *
   * 6. Swagger UI overrides
   * ===================================================================== */
  #swagger-ui { padding: 14px; }
  @media (max-width: 720px) { #swagger-ui { padding: 8px; } }

  .swagger-ui .topbar { display: none; }
  .swagger-ui .wrapper { max-width: none; padding: 0; }
  .swagger-ui { color: var(--ink); font-family: var(--font-ui); }
  /* Swagger sets "font-family: sans-serif" on selectors like
     ".swagger-ui .info p" that outrank ".swagger-ui *", so the base font rule
     has to be !important or text falls back to Swagger's own stack. */
  .swagger-ui * { font-family: var(--font-ui) !important; }
  /* Anything that is an identifier (a path, param name, type, header or code)
     goes monospace — it aids scanning and prevents l/1/I ambiguity. */
  .swagger-ui code,
  .swagger-ui pre,
  .swagger-ui .microlight,
  .swagger-ui .parameter__name,
  .swagger-ui .parameter__type,
  .swagger-ui .parameter__extension,
  .swagger-ui .prop-type,
  .swagger-ui .prop-format,
  .swagger-ui .model,
  .swagger-ui .model *,
  .swagger-ui .opblock-summary-path,
  .swagger-ui .opblock-summary-path *,
  .swagger-ui .response-col_status,
  .swagger-ui td.header-col,
  .swagger-ui .header-example,
  .swagger-ui .info .base-url,
  .swagger-ui select,
  .swagger-ui input,
  .swagger-ui textarea { font-family: var(--font-code) !important; }
  .swagger-ui p,
  .swagger-ui li,
  .swagger-ui td,
  .swagger-ui .markdown p,
  .swagger-ui .renderedMarkdown p {
    color: var(--ink); font-size: 15px; line-height: 1.65;
  }
  /* Long prose gets a comfortable measure (~78ch) instead of running the full
     1180px console width, which is well past the readable line length.
     margin-right:auto is required — Swagger sets "margin: auto" on these, so a
     bare max-width gets CENTRED, leaving a ragged indent against the
     full-width headings and tables. */
  .swagger-ui .info .description > .renderedMarkdown > p,
  .swagger-ui .info .description > .renderedMarkdown > ul,
  .swagger-ui .info .description > .renderedMarkdown > ol,
  .swagger-ui .info .description > .renderedMarkdown > blockquote {
    max-width: 78ch; margin-left: 0 !important; margin-right: auto !important;
  }
  .swagger-ui a,
  .swagger-ui a.link,
  .swagger-ui .info a { color: var(--dexblue); font-size: inherit; }
  .swagger-ui a:hover,
  .swagger-ui a.link:hover,
  .swagger-ui .info a:hover { color: var(--mild); }
  .swagger-ui .info__tos,
  .swagger-ui .info__contact,
  .swagger-ui .info__license,
  .swagger-ui .info__extdocs { margin-top: 6px; }
  .swagger-ui svg { fill: var(--ink); }

  /* Press Start 2P is reserved for CHROME: section banners, the method chip and
     buttons. It is never applied to paths, parameter names, table headers or
     tabs — at the 7-9px those need, a bitmap face with no lowercase descenders
     becomes decoration rather than text. Minimum 10px, generous line-height,
     and never a full sentence. */
  .swagger-ui .info .title,
  .swagger-ui .opblock-tag,
  .swagger-ui .opblock .opblock-summary-method,
  .swagger-ui .opblock-section-header h4,
  .swagger-ui .opblock-title,
  .swagger-ui .opblock-title_normal,
  .swagger-ui .responses-inner > h4,
  .swagger-ui .btn,
  .swagger-ui section.models h4,
  .swagger-ui .dialog-ux .modal-ux-header h3 {
    font-family: var(--font-pixel) !important;
    letter-spacing: 0.5px;
  }

  /* ---- info / description ------------------------------------------------ */
  .swagger-ui .info { margin: 6px 0 22px; }
  .swagger-ui .info hgroup.main { margin: 0 0 14px; }
  .swagger-ui .info .title {
    font-size: 15px !important; color: #fff; line-height: 1.7;
    text-shadow: 2px 2px 0 #000; display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
  }
  .swagger-ui .info .title small {
    background: var(--safe) !important; margin: 0;
    border-style: solid; border-width: 2px; border-color: transparent;
    border-image-source: var(--px-frame-black); border-image-slice: 2; border-image-repeat: stretch;
    background-clip: padding-box; box-shadow: 2px 2px 0 0 #000 !important;
  }
  .swagger-ui .info .title small pre {
    font-family: var(--font-pixel) !important; font-size: 10px !important;
    color: #000 !important; background: none; margin: 0; padding: 6px 8px;
  }
  /* The second chip is the OAS version badge; Swagger gives it no distinct
     class, so target it positionally. */
  .swagger-ui .info .title small + small { background: var(--dexblue) !important; }
  .swagger-ui .info .title small pre.version { color: #000 !important; }
  .swagger-ui .info .base-url { color: var(--dim) !important; font-size: 16px; }
  .swagger-ui .info li, .swagger-ui .info p, .swagger-ui .info table { color: var(--ink); }
  .swagger-ui .info a, .swagger-ui .info__tos a, .swagger-ui .info .link { color: var(--dexblue); }

  /* The spec description is a long Markdown document, so every element it can
     emit needs a rule (h2/h3, tables, fenced code, blockquote, lists).
     Headings keep the pixel face because they are short banner labels, but the
     line-height is opened right up — Press Start 2P has no descenders and its
     caps fill the full em, so tight leading makes multi-line headings collide. */
  /* These need !important on font-family: the base ".swagger-ui *" rule is
     itself !important, and !important always wins over a normal declaration
     no matter how specific the selector is. */
  .swagger-ui .info .description h1,
  .swagger-ui .renderedMarkdown h1 {
    font-family: var(--font-pixel) !important; font-size: 15px; color: #fff;
    line-height: 1.9; margin: 30px 0 16px;
  }
  .swagger-ui .info .description h2,
  .swagger-ui .renderedMarkdown h2 {
    font-family: var(--font-pixel) !important; font-size: 13px; color: var(--mild);
    line-height: 1.9; margin: 34px 0 16px; padding-bottom: 10px;
    border-bottom: 2px solid var(--bevel);
  }
  .swagger-ui .info .description h3,
  .swagger-ui .renderedMarkdown h3 {
    font-family: var(--font-pixel) !important; font-size: 11px; color: var(--safe);
    line-height: 1.9; margin: 28px 0 12px;
  }
  /* h4/h5 sit below the pixel font's readable floor, so they switch to the UI
     face in caps — same hierarchy signal, actually legible. */
  .swagger-ui .info .description h4,
  .swagger-ui .info .description h5,
  .swagger-ui .renderedMarkdown h4,
  .swagger-ui .renderedMarkdown h5 {
    font-family: var(--font-ui) !important; font-size: 13px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 1px; color: var(--dexblue);
    line-height: 1.5; margin: 20px 0 8px;
  }
  .swagger-ui .renderedMarkdown strong, .swagger-ui .markdown strong { color: #fff; }
  .swagger-ui .renderedMarkdown blockquote, .swagger-ui .markdown blockquote {
    margin: 12px 0; padding: 8px 12px; background: var(--panel);
    border-left: 4px solid var(--mild); color: var(--ink);
  }
  .swagger-ui .renderedMarkdown ul, .swagger-ui .renderedMarkdown ol { padding-left: 22px; }
  .swagger-ui .renderedMarkdown li::marker { color: var(--mild); }
  .swagger-ui .renderedMarkdown table, .swagger-ui .info table {
    border-collapse: collapse; width: 100%; margin: 14px 0; display: table;
  }
  /* Markdown table headers: uppercase UI face, not 8px pixel font. Pure white
     rather than --dim, which only reaches 4.46:1 against --panel2. */
  .swagger-ui .renderedMarkdown table th, .swagger-ui .info table th {
    font-family: var(--font-ui) !important; font-size: 12px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.8px; color: #fff !important;
    background: var(--panel2); border: 2px solid #000; padding: 10px 10px;
    text-align: left; line-height: 1.5;
  }
  .swagger-ui .renderedMarkdown table td, .swagger-ui .info table td {
    background: var(--panel); border: 2px solid #000; padding: 9px 10px; font-size: 15px;
  }

  /* Inline + fenced code, in the app's terminal green. 14px monospace instead
     of 16px VT323: VT323 is a hairline CRT face whose digits and punctuation
     are hard to tell apart, which is unacceptable for copyable API values. */
  .swagger-ui .renderedMarkdown code,
  .swagger-ui .markdown code,
  .swagger-ui code {
    background: var(--void) !important; color: var(--safe) !important;
    font-family: var(--font-code) !important; font-size: 14px;
    border: 2px solid var(--bevel); padding: 1px 5px;
  }
  .swagger-ui .renderedMarkdown pre,
  .swagger-ui .markdown pre {
    background: var(--void) !important; color: var(--safe) !important;
    border-style: solid; border-width: 3px; border-color: transparent;
    border-image-source: var(--px-frame-black); border-image-slice: 2; border-image-repeat: stretch;
    background-clip: padding-box;
    box-shadow: inset 0 0 0 2px var(--bevel);
    padding: 12px 14px; margin: 14px 0; overflow-x: auto;
  }
  .swagger-ui .renderedMarkdown pre code,
  .swagger-ui .markdown pre code {
    border: 0; padding: 0; background: none !important; font-size: 16px;
  }
  .swagger-ui hr { border: 0; border-top: 2px solid var(--bevel); margin: 22px 0; }

  /* ---- server / scheme selector ----------------------------------------- */
  .swagger-ui .scheme-container {
    background: var(--panel) !important; margin: 0 0 20px; padding: 14px;
    border-style: solid; border-width: 4px; border-color: transparent;
    border-image-source: var(--px-frame-black); border-image-slice: 2; border-image-repeat: stretch;
    background-clip: padding-box;
    box-shadow: inset 0 0 0 3px var(--bevel), 4px 4px 0 0 #000 !important;
  }
  .swagger-ui .scheme-container .schemes-title,
  .swagger-ui .servers-title,
  .swagger-ui .servers > label {
    font-family: var(--font-ui) !important; font-size: 12px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 1px;
    color: var(--mild) !important; line-height: 1.5;
  }
  .swagger-ui select,
  .swagger-ui input[type=text],
  .swagger-ui input[type=search],
  .swagger-ui input[type=password],
  .swagger-ui input[type=email],
  .swagger-ui input[type=number],
  .swagger-ui input[type=file],
  .swagger-ui textarea {
    background: var(--screen) !important; color: var(--ink) !important;
    font-family: var(--font-code) !important; font-size: 14px !important;
    background-image: none !important;
    border-style: solid !important; border-width: 2px !important; border-color: transparent !important;
    border-image-source: var(--px-frame-black) !important;
    border-image-slice: 2 !important; border-image-repeat: stretch !important;
    background-clip: padding-box !important;
    box-shadow: inset 1px 1px 0 0 rgba(0, 0, 0, 0.5) !important;
    outline: none;
  }
  .swagger-ui select { padding: 6px 8px; }
  .swagger-ui input:focus, .swagger-ui select:focus, .swagger-ui textarea:focus {
    box-shadow: inset 1px 1px 0 0 rgba(0, 0, 0, 0.5), 0 0 0 2px var(--mild) !important;
  }
  .swagger-ui input::placeholder, .swagger-ui textarea::placeholder { color: var(--dim); }
  .swagger-ui .filter { padding: 0 0 16px; }
  .swagger-ui .filter .operation-filter-input { padding: 8px 10px; margin: 0; }

  /* ---- tag sections ----------------------------------------------------- */
  .swagger-ui .opblock-tag-section { margin-bottom: 22px; }
  /* Swagger lays the tag header out as a single flex ROW (name | description |
     chevron), which at pixel-font sizes runs the name straight into the
     description text. Stack it instead: name on top, description beneath. */
  .swagger-ui .opblock-tag {
    font-size: 13px !important; color: var(--mild) !important;
    background: var(--panel); padding: 16px 14px; margin: 0 0 14px;
    border: 0; border-bottom: 4px solid #000;
    line-height: 1.9; transition: background-color 0.06s;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    column-gap: 10px;
    row-gap: 8px;
  }
  .swagger-ui .opblock-tag > a.nostyle { grid-column: 1; grid-row: 1; display: block; }
  .swagger-ui .opblock-tag > a.nostyle span { color: var(--mild); }
  .swagger-ui .opblock-tag > small { grid-column: 1 / -1; grid-row: 2; }
  .swagger-ui .opblock-tag > button { grid-column: 2; grid-row: 1; }
  .swagger-ui .opblock-tag small,
  .swagger-ui .opblock-tag .renderedMarkdown p {
    font-family: var(--font-ui) !important; font-size: 15px !important;
    color: var(--dim) !important; padding: 0; line-height: 1.6;
    flex: none; text-align: left; max-width: 80ch;
  }
  .swagger-ui .opblock-tag svg,
  .swagger-ui .expand-methods svg,
  .swagger-ui .expand-operation svg { fill: var(--dim) !important; }
  .swagger-ui .expand-methods:hover svg { fill: var(--mild) !important; }

  /* ---- operation blocks -------------------------------------------------- */
  /* The inner bevel ring is the method's accent colour, which is how the app
     colour-codes venom tiers — same trick, applied to HTTP verbs. */
  .swagger-ui .opblock {
    background: var(--panel) !important; margin: 0 0 16px;
    border-style: solid !important; border-width: 4px !important; border-color: transparent !important;
    border-image-source: var(--px-frame-black) !important;
    border-image-slice: 2 !important; border-image-repeat: stretch !important;
    background-clip: padding-box !important;
    box-shadow: inset 0 0 0 3px var(--bevel), 4px 4px 0 0 #000 !important;
  }
  .swagger-ui .opblock.opblock-get { box-shadow: inset 0 0 0 3px var(--safe), 4px 4px 0 0 #000 !important; }
  .swagger-ui .opblock.opblock-post { box-shadow: inset 0 0 0 3px var(--dexblue), 4px 4px 0 0 #000 !important; }
  .swagger-ui .opblock.opblock-put,
  .swagger-ui .opblock.opblock-patch { box-shadow: inset 0 0 0 3px var(--mild), 4px 4px 0 0 #000 !important; }
  .swagger-ui .opblock.opblock-delete { box-shadow: inset 0 0 0 3px var(--venom), 4px 4px 0 0 #000 !important; }
  .swagger-ui .opblock.opblock-deprecated { box-shadow: inset 0 0 0 3px #6a6a8a, 4px 4px 0 0 #000 !important; opacity: 0.75; }

  .swagger-ui .opblock .opblock-summary {
    border-bottom: 4px solid #000; padding: 12px; gap: 10px;
  }
  .swagger-ui .opblock .opblock-summary:hover { background: rgba(255, 255, 255, 0.04); }

  /* Method chip: the app's .type-badge — 2px frame, hard 1px drop, text shadow. */
  .swagger-ui .opblock .opblock-summary-method {
    font-size: 10px !important; min-width: 86px; padding: 11px 8px;
    text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.5);
    border-style: solid; border-width: 2px; border-color: transparent;
    border-image-source: var(--px-frame-black); border-image-slice: 2; border-image-repeat: stretch;
    background-clip: padding-box;
    box-shadow:
      inset 0 2px 0 0 rgba(255, 255, 255, 0.22),
      inset 0 -2px 0 0 rgba(0, 0, 0, 0.3),
      2px 2px 0 0 #000 !important;
  }
  /* Swagger's own colours come from ".swagger-ui .opblock.opblock-get
     .opblock-summary-method", so these must match that specificity (the
     ".opblock" ancestor) or the stock blue/green wins. */
  .swagger-ui .opblock.opblock-get .opblock-summary-method { background: var(--safe); color: #000; }
  .swagger-ui .opblock.opblock-post .opblock-summary-method { background: var(--dexblue); color: #000; }
  .swagger-ui .opblock.opblock-put .opblock-summary-method,
  .swagger-ui .opblock.opblock-patch .opblock-summary-method { background: var(--mild); color: #000; }
  .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: var(--venom); color: #fff; }
  .swagger-ui .opblock.opblock-head .opblock-summary-method,
  .swagger-ui .opblock.opblock-options .opblock-summary-method,
  .swagger-ui .opblock.opblock-deprecated .opblock-summary-method { background: #6a6a8a; color: #fff; }

  /* The path is the single most-read string on the page. Monospace, 15px, and
     bold so it clearly outranks the description beneath it. */
  .swagger-ui .opblock .opblock-summary-path,
  .swagger-ui .opblock .opblock-summary-path__deprecated {
    font-size: 15px !important; color: var(--ink); line-height: 1.5;
    max-width: none; font-weight: 700;
  }
  .swagger-ui .opblock .opblock-summary-path a,
  .swagger-ui .opblock .opblock-summary-path span { color: var(--ink); }
  .swagger-ui .opblock .opblock-summary-path:hover a { color: var(--mild); }
  .swagger-ui .opblock .opblock-summary-description {
    font-family: var(--font-ui) !important; font-size: 15px; color: var(--dim);
    line-height: 1.5;
  }
  /* Path and description are different faces at similar sizes; side by side
     they crowd, so stack them under the method chip. */
  .swagger-ui .opblock .opblock-summary-path-description-wrapper {
    display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
    flex: 1; padding: 0;
  }
  @media (max-width: 640px) {
    .swagger-ui .opblock .opblock-summary { flex-wrap: wrap; }
    .swagger-ui .opblock .opblock-summary-path { word-break: break-all; }
  }
  .swagger-ui .opblock .opblock-summary-control:focus { outline: none; }

  .swagger-ui .opblock-body { background: var(--panel); }
  .swagger-ui .opblock-description-wrapper,
  .swagger-ui .opblock-external-docs-wrapper { color: var(--ink); font-size: 15px; }
  /* The second selector is the "No parameters" empty state, which Swagger
     renders in its light-theme #3b4151 (1.67:1 here). */
  .swagger-ui .opblock-description-wrapper p,
  .swagger-ui .parameters-container .opblock-description-wrapper p {
    max-width: 78ch; color: var(--dim) !important;
  }
  .swagger-ui .opblock-title_normal { font-family: var(--font-pixel) !important; font-size: 10px !important; line-height: 1.9; }
  .swagger-ui .opblock-section-header {
    background: var(--panel2) !important; box-shadow: none !important;
    border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 12px 14px; min-height: 0;
  }
  .swagger-ui .opblock-section-header h4,
  .swagger-ui .opblock-section-header > label,
  .swagger-ui .opblock-title { color: #fff !important; font-size: 11px !important; line-height: 1.9; }
  .swagger-ui .opblock-section-header label span { color: var(--dim); font-size: 13px; }

  /* ---- parameter + response tables -------------------------------------- */
  .swagger-ui table { border-collapse: collapse; }
  /* Column headers were 8px pixel-font — effectively unreadable. Uppercase UI
     face at 12px carries the same "this is a label" signal legibly. */
  .swagger-ui table thead tr th,
  .swagger-ui table thead tr td {
    font-family: var(--font-ui) !important;
    font-size: 12px !important; font-weight: 700;
    text-transform: uppercase; letter-spacing: 1px;
    color: var(--dim) !important;
    border-bottom: 2px solid var(--bevel); padding: 11px 10px; line-height: 1.5;
  }
  .swagger-ui .parameters-col_description { color: var(--ink); }
  .swagger-ui .parameters-col_description .markdown p,
  .swagger-ui .parameters-col_description .renderedMarkdown p { color: var(--ink); max-width: 70ch; }
  .swagger-ui .parameter__name {
    font-size: 15px !important; color: #fff; line-height: 1.5; font-weight: 700;
  }
  .swagger-ui .parameter__name.required span { color: var(--venom); }
  .swagger-ui .parameter__name.required::after { color: var(--venom); font-size: 13px; }
  .swagger-ui .parameter__type { color: var(--safe); font-size: 13px; }
  .swagger-ui .parameter__extension,
  .swagger-ui .parameter__in,
  .swagger-ui .parameter__deprecated { color: var(--dim); font-size: 13px; font-style: normal; }
  /* Response-header table cells. Swagger styles these via a long descendant
     chain that sets its light-theme ink (#3b4151) — only 1.67:1 on our dark
     screen — so this needs !important to reach a readable contrast. */
  .swagger-ui .responses-table .headers-wrapper td.header-col,
  .swagger-ui table.headers td,
  .swagger-ui td.header-col,
  .swagger-ui td.header-col *,
  .swagger-ui .response-col_description__inner td { color: var(--ink) !important; font-size: 14px; }
  /* The real class is "headers__title" (not ".headers h4" as one might guess);
     Swagger leaves it at its light-theme #3b4151, i.e. 1.67:1 on our screen. */
  .swagger-ui .headers__title,
  .swagger-ui h4.headers__title,
  .swagger-ui table.headers thead td,
  .swagger-ui table.headers th {
    font-family: var(--font-ui) !important; font-size: 12px !important;
    font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
    color: var(--dim) !important;
  }
  .swagger-ui td.header-col .renderedMarkdown p { color: var(--ink) !important; }
  /* The header "type / example" hint column stays secondary but legible. */
  .swagger-ui .header-example,
  .swagger-ui td.header-col .prop-format { color: var(--dim) !important; }
  .swagger-ui .prop-format { color: var(--dim); }
  /* Status codes are numerals — monospace at 16px/bold makes 200 vs 429 vs 500
     instantly scannable down the column. */
  .swagger-ui .response-col_status {
    font-size: 16px !important; color: var(--safe); line-height: 1.5; font-weight: 700;
  }
  .swagger-ui .response-col_links { color: var(--dim); font-size: 13px; }
  .swagger-ui .responses-inner > h4 { color: #fff !important; font-size: 11px !important; line-height: 1.9; }
  .swagger-ui .responses-inner h5 {
    font-family: var(--font-ui) !important; color: var(--dim) !important;
    font-size: 12px !important; font-weight: 700;
    text-transform: uppercase; letter-spacing: 1px; line-height: 1.5;
  }
  /* Swagger sets these two labels at 10.5px via its own rules; bring them up to
     the 12px floor the rest of the page uses. */
  .swagger-ui .response-control-media-type__title,
  .swagger-ui .response-control-media-type__accept-message,
  .swagger-ui .parameter__name + small,
  .swagger-ui .content-type-wrapper small { font-size: 12px !important; line-height: 1.5; }
  .swagger-ui .response-control-media-type__accept-message { color: var(--safe) !important; }
  .swagger-ui .responses-table .response-col_description__inner div.renderedMarkdown p { color: var(--ink); }
  .swagger-ui .response .response-col_description__inner div.markdown {
    background: var(--void) !important; color: var(--safe) !important;
    border: 2px solid var(--bevel); padding: 8px 10px;
  }
  .swagger-ui .col_header { color: var(--dim) !important; }
  .swagger-ui .tab li {
    font-family: var(--font-ui) !important; font-size: 13px !important;
    font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;
    color: var(--dim) !important; line-height: 1.5;
  }
  .swagger-ui .tab li.active,
  .swagger-ui .tab li button.tablinks[aria-selected=true] { color: var(--mild) !important; }
  .swagger-ui .tab li:first-of-type::after { background: var(--bevel); }

  /* ---- code samples ----------------------------------------------------- */
  .swagger-ui .highlight-code,
  .swagger-ui .curl-command,
  .swagger-ui .model-example { position: relative; }
  .swagger-ui .highlight-code > .microlight,
  .swagger-ui .microlight {
    background: var(--void) !important; color: var(--safe) !important;
    font-family: var(--font-code) !important; font-size: 13.5px !important;
    line-height: 1.6 !important;
    border-style: solid; border-width: 3px; border-color: transparent;
    border-image-source: var(--px-frame-black); border-image-slice: 2; border-image-repeat: stretch;
    background-clip: padding-box;
    box-shadow: inset 0 0 0 2px var(--bevel);
    padding: 12px 14px !important;
  }
  .swagger-ui .microlight code, .swagger-ui .microlight span { border: 0 !important; padding: 0 !important; background: none !important; }
  .swagger-ui .copy-to-clipboard {
    background: var(--panel2) !important; border: 2px solid #000 !important;
    box-shadow: 2px 2px 0 0 #000 !important; right: 12px; top: 12px; height: 26px; width: 26px;
  }
  .swagger-ui .copy-to-clipboard button { background: var(--ink); }
  .swagger-ui .download-contents {
    background: var(--panel2) !important; color: var(--ink) !important;
    font-family: var(--font-ui) !important; font-size: 12px !important;
    font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;
    border: 2px solid #000 !important; box-shadow: 2px 2px 0 0 #000 !important;
    height: auto; padding: 7px 9px; bottom: 12px; right: 12px;
  }
  .swagger-ui .curl-command .copy-to-clipboard { top: 12px; }
  .swagger-ui .request-url pre.microlight { white-space: pre-wrap; word-break: break-all; }

  /* ---- models ----------------------------------------------------------- */
  .swagger-ui section.models {
    background: var(--panel) !important; margin: 26px 0 0;
    border-style: solid !important; border-width: 4px !important; border-color: transparent !important;
    border-image-source: var(--px-frame-black) !important;
    border-image-slice: 2 !important; border-image-repeat: stretch !important;
    background-clip: padding-box !important;
    box-shadow: inset 0 0 0 3px var(--bevel), 4px 4px 0 0 #000 !important;
  }
  .swagger-ui section.models h4 {
    font-size: 12px !important; color: var(--mild) !important; padding: 16px 14px; line-height: 1.9;
  }
  .swagger-ui section.models.is-open h4 { border-bottom: 4px solid #000; margin: 0; }
  .swagger-ui section.models h4:hover { background: var(--panel2); }
  .swagger-ui section.models .model-container,
  .swagger-ui section.models .model-container:hover {
    background: var(--screen) !important; border: 2px solid #000; margin: 14px; padding: 10px;
  }
  .swagger-ui .model-box { background: var(--screen) !important; }
  .swagger-ui .model,
  .swagger-ui .model-title,
  .swagger-ui .model .property { color: var(--ink); }
  .swagger-ui .model-title { font-size: 15px !important; color: #fff; line-height: 1.5; font-weight: 700; }
  .swagger-ui .model { font-size: 14px; line-height: 1.7; }
  .swagger-ui .model .property { color: var(--dim); }
  .swagger-ui .model .property.primitive { color: var(--dim); }
  /* The property name column carries the schema; keep it at full ink. */
  .swagger-ui .model .property-row > td:first-child,
  .swagger-ui .model .prop-name { color: var(--ink); }
  .swagger-ui .prop-type { color: var(--dexblue); }
  .swagger-ui .model .prop-enum { color: var(--mild); }
  .swagger-ui .model-hint {
    background: #000; color: var(--ink); border: 2px solid var(--bevel);
    font-family: var(--font-ui); font-size: 13px;
  }
  /* Swagger ships a dark chevron sprite as a background-image; invert it so it
     reads on the dark screen. */
  .swagger-ui .model-toggle::after { filter: invert(1) brightness(2.2); }
  .swagger-ui .renderedMarkdown p:last-child { margin-bottom: 0; }

  /* ---- buttons: the app's .btn-pixel convex plastic cap ------------------ */
  .swagger-ui .btn {
    font-size: 10px !important; line-height: 1.9;
    color: var(--ink); background: var(--panel2); padding: 12px 14px;
    border-style: solid !important; border-width: 2px !important; border-color: transparent !important;
    border-image-source: var(--px-frame-black) !important;
    border-image-slice: 2 !important; border-image-repeat: stretch !important;
    background-clip: padding-box !important;
    box-shadow:
      inset 0 3px 0 0 rgba(255, 255, 255, 0.28),
      inset 0 -3px 0 0 rgba(0, 0, 0, 0.35),
      3px 3px 0 0 #000 !important;
    transition: transform 0.06s, box-shadow 0.06s, background-color 0.06s;
  }
  .swagger-ui .btn:hover { background: #33335a; }
  .swagger-ui .btn:hover:not(:active) {
    transform: translate(-1px, -1px);
    box-shadow:
      inset 0 3px 0 0 rgba(255, 255, 255, 0.32),
      inset 0 -3px 0 0 rgba(0, 0, 0, 0.35),
      4px 4px 0 0 #000 !important;
  }
  /* Press = the cap sinks into the housing: the highlight band flips to a
     top-inset shadow and the sprite drops into its own drop-shadow. */
  .swagger-ui .btn:active {
    transform: translate(3px, 3px);
    box-shadow:
      inset 0 3px 0 0 rgba(0, 0, 0, 0.45),
      inset 0 -1px 0 0 rgba(255, 255, 255, 0.08) !important;
  }
  .swagger-ui .btn.execute { background: var(--safe) !important; color: #000 !important; }
  .swagger-ui .btn.execute:hover { background: #6bff55 !important; }
  .swagger-ui .btn.cancel { background: var(--venom) !important; color: #fff !important; }
  .swagger-ui .btn.cancel:hover { background: #ff5c7c !important; }
  .swagger-ui .btn.try-out__btn { background: var(--dexblue) !important; color: #000 !important; }
  .swagger-ui .btn.try-out__btn:hover { background: #6bbcec !important; }
  .swagger-ui .btn.authorize { background: var(--mild) !important; color: #000 !important; }
  .swagger-ui .btn.authorize svg { fill: #000 !important; }
  .swagger-ui .btn:disabled,
  .swagger-ui .btn.execute:disabled,
  .swagger-ui .btn.try-out__btn:disabled {
    background: #1c1c30 !important; color: #5a5a78 !important; transform: none;
    box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.3), 2px 2px 0 0 rgba(0, 0, 0, 0.5) !important;
  }
  .swagger-ui .btn-group { padding: 14px; gap: 10px; }
  .swagger-ui .execute-wrapper { padding: 14px; }
  .swagger-ui .btn.btn-clear { background: var(--panel2) !important; color: var(--ink) !important; }
  .swagger-ui .authorization__btn { box-shadow: none !important; background: none !important; border: 0 !important; }
  .swagger-ui .authorization__btn:hover { transform: none; }

  /* ---- loading / errors / dialogs --------------------------------------- */
  .swagger-ui .loading-container .loading::after {
    color: var(--safe); font-family: var(--font-pixel); font-size: 10px; line-height: 1.9;
  }
  .swagger-ui .loading-container .loading::before { border-color: var(--bevel); border-top-color: var(--safe); }
  .swagger-ui .errors-wrapper {
    background: var(--panel) !important; margin: 14px 0; padding: 14px;
    border-style: solid; border-width: 4px; border-color: transparent;
    border-image-source: var(--px-frame-black); border-image-slice: 2; border-image-repeat: stretch;
    background-clip: padding-box;
    box-shadow: inset 0 0 0 3px var(--venom), 4px 4px 0 0 #000;
  }
  /* Only the "Errors" banner is pixel-font. The message itself is a real
     sentence the user has to act on, so it stays in the UI face. */
  .swagger-ui .errors-wrapper hgroup h4 {
    font-family: var(--font-pixel) !important; font-size: 11px !important;
    color: var(--venom) !important; line-height: 1.9;
  }
  .swagger-ui .errors-wrapper .errors h4,
  .swagger-ui .errors-wrapper .error-wrapper .message {
    font-family: var(--font-code) !important; font-size: 14px !important;
    color: var(--venom) !important; line-height: 1.6;
  }
  .swagger-ui .errors-wrapper .errors small { color: var(--dim); font-size: 13px; }
  .swagger-ui .dialog-ux .backdrop-ux { background: rgba(0, 0, 0, 0.85); }
  .swagger-ui .dialog-ux .modal-ux {
    background: var(--panel) !important;
    border-style: solid; border-width: 4px; border-color: transparent;
    border-image-source: var(--px-frame-black); border-image-slice: 2; border-image-repeat: stretch;
    background-clip: padding-box;
    box-shadow: inset 0 0 0 3px var(--bevel), 4px 4px 0 0 #000 !important;
  }
  .swagger-ui .dialog-ux .modal-ux-header { border-bottom: 4px solid #000; background: var(--panel2); }
  .swagger-ui .dialog-ux .modal-ux-header h3 { color: #fff !important; font-size: 11px !important; line-height: 1.7; }
  .swagger-ui .dialog-ux .modal-ux-content h4,
  .swagger-ui .dialog-ux .modal-ux-content p { color: var(--ink); }
  .swagger-ui .dialog-ux .modal-ux-header .close-modal { background: none; border: 0; box-shadow: none; }
  .swagger-ui .dialog-ux .modal-ux-header .close-modal svg { fill: var(--ink) !important; }

  /* Swagger draws a few soft/blurred shadows we never want in a pixel UI. */
  .swagger-ui .opblock-body pre.microlight,
  .swagger-ui .servers > label select,
  .swagger-ui .info .title small { text-shadow: none; }
  </style>
</head>
<body>
  <a class="sd-skip" href="#swagger-ui">Skip to the API reference</a>

  <header class="sd-bar">
    <a class="sd-home" href="/">&#9666; SNAKÉDEX</a>
    <span class="sd-sub">OPEN DATA API</span>
    <nav class="sd-links">
      <a href="__SPEC_URL__">OPENAPI JSON</a>
      <a href="/api/terms">TERMS</a>
      <a href="https://creativecommons.org/licenses/by/4.0/" rel="license noopener" target="_blank">CC BY 4.0</a>
    </nav>
  </header>

  <main class="sd-console">
    <div class="dex-hinge"></div>
    <span class="dex-screw dex-screw-tl"></span>
    <span class="dex-screw dex-screw-tr"></span>
    <span class="dex-screw dex-screw-bl"></span>
    <span class="dex-screw dex-screw-br"></span>

    <div class="dex-header">
      <div>
        <div class="dex-title">API REFERENCE</div>
        <div class="dex-subtitle">admin-verified sightings &middot; no key, no sign-up</div>
      </div>
      <div class="dex-leds" aria-hidden="true">
        <span class="dex-lens"></span>
        <span class="dex-led dex-led-red"></span>
        <span class="dex-led dex-led-amber"></span>
        <span class="dex-led dex-led-green"></span>
      </div>
    </div>

    <div class="dex-screen-wrap">
      <div class="dex-screen">
        <noscript>
          <div class="sd-fallback" style="display:block">
            <h2>&#9670; JAVASCRIPT REQUIRED</h2>
            <p>This interactive reference needs JavaScript. You can still read the raw
            machine-readable spec at <code>__SPEC_URL__</code>.</p>
          </div>
        </noscript>
        <div id="sd-fallback" class="sd-fallback">
          <h2>&#9670; COULD NOT LOAD REFERENCE</h2>
          <p>The Swagger UI assets failed to load. The API itself is unaffected — the
          raw OpenAPI document is available at <code>__SPEC_URL__</code>.</p>
        </div>
        <div id="swagger-ui"></div>
      </div>
    </div>

    <div class="dex-vent"></div>
  </main>

  <script src="${SWAGGER_BASE}/swagger-ui-bundle.js" crossorigin></script>
  <script>
    (function () {
      function showFallback() {
        var el = document.getElementById("sd-fallback");
        if (el) el.style.display = "block";
      }
      // The bundle is a classic blocking script placed before this one, so it
      // is already evaluated here. Guard anyway in case the CDN failed.
      if (!window.SwaggerUIBundle) { showFallback(); return; }
      try {
        window.SwaggerUIBundle({
          url: "__SPEC_URL__",
          dom_id: "#swagger-ui",
          deepLinking: true,
          displayRequestDuration: true,
          filter: true,
          defaultModelsExpandDepth: 1,
          defaultModelExpandDepth: 3,
          docExpansion: "list",
          tryItOutEnabled: true,
          syntaxHighlight: { activate: true, theme: "agate" },
          presets: [window.SwaggerUIBundle.presets.apis],
          onFailure: showFallback,
        });
      } catch (e) {
        showFallback();
      }
    })();
  </script>
</body>
</html>`;

/** Build the Swagger UI HTML for the given spec URL.
 *
 *  The URL is substituted into every placeholder occurrence and escaped for
 *  both HTML-attribute and JS-string-literal contexts. Callers only ever pass
 *  a trusted internal path, but escaping keeps this safe if that changes. */
export function swaggerUiResponse(specUrl: string): Response {
  const safe = specUrl
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const html = HTML.replaceAll("__SPEC_URL__", safe);
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
    },
  });
}
