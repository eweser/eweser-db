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
  // Determine bump type: provided via CLI, CI default, or manual prompt
  const bump = bumpType || (process.env.CI ? 'patch' : await promptForBump());

  console.log(`Bumping version with a ${bump} release...`);

  // Skip creating an empty changeset, since it's already handled
  console.log('Applying version changes...');
  runCommand('npx changeset version');

  console.log('Publishing packages...');
  runCommand('npx changeset publish');
})();
