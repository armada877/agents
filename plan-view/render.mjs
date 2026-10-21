import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";

const [sourcePath, outputPath, installDir, colorsPath, windowTitle] = process.argv.slice(2);
const modulesDir = join(installDir, "node_modules");
const mermaidPath = join(modulesDir, "mermaid/dist/mermaid.min.js");
const { Marked } = await import(pathToFileURL(join(modulesDir, "marked/lib/marked.esm.js")));

const fallbackColors = {
  background: "#1e1e2e",
  dark_background: "#181825",
  lighter_background: "#313244",
  foreground: "#cdd6f4",
  dark_foreground: "#7f849c",
  accent: "#89b4fa",
  selection: "#45475a",
  muted: "#6c7086",
  yellow: "#f9e2af",
  green: "#a6e3a1",
  red: "#f38ba8",
};

function readThemeColors(path) {
  if (!path || !existsSync(path)) return fallbackColors;
  const colors = { ...fallbackColors };
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^\s*([a-z_]+)\s*=\s*"(#[0-9a-fA-F]{3,8})"/);
    if (match) colors[match[1]] = match[2];
  }
  return colors;
}

function escapeHtml(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

const marked = new Marked({
  gfm: true,
  renderer: {
    code({ text, lang }) {
      if (lang === "mermaid") return `<pre class="mermaid">${escapeHtml(text)}</pre>\n`;
      const language = lang ? ` class="language-${escapeHtml(lang)}"` : "";
      return `<pre><code${language}>${escapeHtml(text)}</code></pre>\n`;
    },
  },
});

const diagramFont = "Inter, \"Noto Sans\", \"DejaVu Sans\", sans-serif";

function mermaidThemeVariables(c) {
  return {
    darkMode: true,
    background: c.background,
    fontFamily: diagramFont,
    fontSize: "15px",
    primaryColor: c.lighter_background,
    primaryTextColor: c.foreground,
    nodeTextColor: c.foreground,
    stateLabelColor: c.foreground,
    primaryBorderColor: c.accent,
    secondaryColor: c.selection,
    tertiaryColor: c.dark_background,
    lineColor: c.dark_foreground,
    textColor: c.foreground,
    mainBkg: c.lighter_background,
    nodeBorder: c.accent,
    clusterBkg: c.dark_background,
    clusterBorder: c.muted,
    edgeLabelBackground: c.background,
    labelBackgroundColor: c.background,
    stateBkg: c.lighter_background,
    stateBorder: c.accent,
    transitionColor: c.dark_foreground,
    transitionLabelColor: c.foreground,
    compositeBackground: c.dark_background,
  };
}

function stylesheet(c) {
  return `
:root { color-scheme: dark; }
body {
  margin: 0; background: ${c.background}; color: ${c.foreground};
  font: 16px/1.6 system-ui, sans-serif;
}
main { max-width: 960px; margin: 0 auto; padding: 32px 24px 64px; }
h1, h2, h3, h4 { line-height: 1.25; margin: 1.6em 0 0.6em; }
h1 { font-size: 1.9em; border-bottom: 1px solid ${c.selection}; padding-bottom: 0.3em; }
h2 { font-size: 1.45em; border-bottom: 1px solid ${c.selection}; padding-bottom: 0.25em; }
a { color: ${c.accent}; }
hr { border: 0; border-top: 1px solid ${c.selection}; margin: 2em 0; }
blockquote { margin: 1em 0; padding: 0.2em 1em; border-left: 4px solid ${c.accent}; color: ${c.dark_foreground}; }
code, pre { font-family: "JetBrainsMono Nerd Font", "JetBrains Mono", ui-monospace, monospace; font-size: 0.9em; }
:not(pre) > code { background: ${c.lighter_background}; padding: 0.15em 0.4em; border-radius: 4px; }
pre { background: ${c.dark_background}; border: 1px solid ${c.selection}; border-radius: 6px; padding: 14px 16px; overflow-x: auto; line-height: 1.45; }
pre.mermaid { background: transparent; border: 0; text-align: center; }
table { border-collapse: collapse; margin: 1em 0; display: block; overflow-x: auto; max-width: 100%; }
th, td { border: 1px solid ${c.selection}; padding: 6px 12px; text-align: left; vertical-align: top; }
th { background: ${c.lighter_background}; }
tr:nth-child(even) td { background: ${c.dark_background}; }
img { max-width: 100%; }
`;
}

const colors = readThemeColors(colorsPath);
const body = marked.parse(readFileSync(sourcePath, "utf8"));
const mermaidConfig = { startOnLoad: true, theme: "base", securityLevel: "strict", themeVariables: mermaidThemeVariables(colors) };

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src file: 'unsafe-inline'; style-src 'unsafe-inline'; img-src file: data:; font-src file: data:">
<title>${escapeHtml(windowTitle || basename(sourcePath))}</title>
<style>${stylesheet(colors)}</style>
</head>
<body>
<main>
${body}
</main>
<script src="${pathToFileURL(mermaidPath)}"></script>
<script>mermaid.initialize(${JSON.stringify(mermaidConfig)});</script>
</body>
</html>
`;

writeFileSync(outputPath, html);
