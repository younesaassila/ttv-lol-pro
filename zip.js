const { execSync } = require('child_process');
const { mkdirSync } = require('node:fs');
const { version } = require('./package.json');

const SUPPORTED_BROWSERS = new Set(["chromium", "firefox"]);

try {
  const args = process.argv.slice(2);
  const [browser] = args;
  console.log(browser)
  if (!SUPPORTED_BROWSERS.has(browser)) {
    throw TypeError("Invalid browser. Valid browsers are: firefox, chromium")
  }

  execSync(`npm run build:${browser}`, { stdio: "inherit" });
  mkdirSync("releases", { recursive: true });
  const zipName = `v${version}-${browser}.zip`;
  execSync(`tar -caf releases/${zipName} -C dist/webext-prod .`, { stdio: "inherit" });
  console.log(`Generated releases/${zipName} successfully!`);
} catch (error) {
  console.error('Script failed:', error.message);
  process.exit(1);
}
