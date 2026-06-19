import markdownItGithubAlerts from "https://unpkg.com/markdown-it-github-alerts@^1.0.1/dist/index.mjs";

const app = document.getElementById("app");

const md = markdownit({
  html: true,
  typographer: true,
  quotes: "“”‘’",
}).use(markdownItGithubAlerts);

async function main() {
  const response = await fetch(
    "https://raw.githubusercontent.com/younesaassila/ttv-lol-pro/refs/heads/v2/README.md",
  );
  const text = await response.text();
  const html = md.render(text);
  app.innerHTML = html;
}

main();
