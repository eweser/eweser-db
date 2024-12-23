const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');

const runCommand = (cmd, cwd) => {
  try {
    execSync(cmd, { stdio: 'inherit', cwd });
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

const updateDependencyInOtherProject = (
  packageName,
  newVersion,
  projectPath
) => {
  const packageJsonPath = path.join(projectPath, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  if (packageJson.dependencies && packageJson.dependencies[packageName]) {
    packageJson.dependencies[packageName] = `^${newVersion}`;
    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2),
      'utf-8'
    );
    console.log(
      `Updated ${packageName} to version ^${newVersion} in ${projectPath}/package.json`
    );
  } else {
    console.log(
      `Dependency ${packageName} not found in ${projectPath}/package.json`
    );
  }
};

(async () => {
  const bump = bumpType || (process.env.CI ? 'patch' : await promptForBump());

  console.log(`Bumping version with a ${bump} release...`);

  // Apply changeset version bump
  console.log('Applying version changes...');
  runCommand('npx changeset version');

  // Publish updated packages
  console.log('Publishing packages...');
  runCommand('npx changeset publish');

  if (!process.env.CI) {
    // Update @eweser/db in the other project

    // Get the new version of @eweser/db
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'packages/db/package.json'), 'utf-8')
    );
    const newVersion = packageJson.version;

    const otherProjectPath = '/home/jacob/ewe-note';
    updateDependencyInOtherProject('@eweser/db', newVersion, otherProjectPath);
    // Install updated dependencies in the other project
    console.log('Installing updated dependencies in the other project...');
    runCommand('npm install', otherProjectPath);

    console.log('Dependency update completed.');
  }
})();
