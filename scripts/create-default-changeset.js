const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const changesetDir = path.resolve(__dirname, '../.changeset');
if (!fs.existsSync(changesetDir)) {
  fs.mkdirSync(changesetDir);
}
const changesetFiles = fs
  .readdirSync(changesetDir)
  .filter((file) => file.endsWith('.md'));

if (changesetFiles.length === 0) {
  console.log(
    'No changesets found. Creating a default patch changeset for all packages...'
  );
  const changeset = `
---
"@eweser/db": patch
"@eweser/eslint-config-react-ts": patch
"@eweser/eslint-config-ts": patch
"@eweser/examples-components": patch
"@eweser/shared": patch
---

Default patch bump for all packages.
  `.trim();

  const changesetFilename = `${Date.now()}-default.md`;
  fs.writeFileSync(path.join(changesetDir, changesetFilename), changeset);
  console.log(`Created changeset: ${changesetFilename}`);
} else {
  console.log('Changeset already exists. Skipping creation.');
}
