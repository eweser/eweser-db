const { execSync } = require('child_process');
const inquirer = require('inquirer');

const runCommand = (cmd) => {
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const args = process.argv.slice(2);
const bumpType =
  args.find((arg) => ['patch', 'minor', 'major'].includes(arg)) || null;

const promptForBump = async () => {
  const prompt = inquirer.createPromptModule();
  const { type } = await prompt([
    {
      type: 'list',
      name: 'type',
      message: 'Select the version bump type:',
      choices: ['patch', 'minor', 'major'],
    },
  ]);
  return type;
};

(async () => {
  // Default to "patch" in CI or use provided bump type
  const bump = bumpType || (process.env.CI ? 'patch' : await promptForBump());

  console.log(`Bumping version with a ${bump} release...`);

  // Apply changeset version bump
  console.log('Applying version changes...');
  runCommand('npx changeset version');

  // Publish updated packages
  console.log('Publishing packages...');
  runCommand('npx changeset publish');
})();
