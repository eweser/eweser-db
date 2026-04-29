import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import inquirer from 'inquirer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const runCommand = (cmd, cwd = process.cwd()) => {
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
  if (!fs.existsSync(packageJsonPath)) {
    console.error(`Error: package.json not found at ${packageJsonPath}`);
    return;
  }

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

const updateOtherProjectIfAvailable = (
  packageName,
  newVersion,
  projectPath
) => {
  if (process.env.EWESER_RELEASE_UPDATE_OTHER_PROJECT !== 'true') {
    console.log(
      'Skipping external project update: set EWESER_RELEASE_UPDATE_OTHER_PROJECT=true to update another checkout.'
    );
    return;
  }

  const packageJsonPath = path.join(projectPath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.log(
      `Skipping external project update: package.json not found at ${packageJsonPath}`
    );
    return;
  }

  updateDependencyInOtherProject(packageName, newVersion, projectPath);

  console.log('Installing updated dependencies in the other project...');
  runCommand('npm install', projectPath);

  commitAndPushChanges(projectPath, packageName, newVersion);
};
const commitAndPushChanges = (projectPath, packageName, newVersion) => {
  console.log('Committing and pushing changes to the other project...');
  runCommand('git add package.json package-lock.json', projectPath);
  runCommand(
    `git commit -m "chore: update ${packageName} to version ^${newVersion}"`,
    projectPath
  );
  runCommand('git push', projectPath);
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

  // Get the new version of @eweser/db
  const packageJsonPath = path.resolve(
    __dirname,
    '../packages/db/package.json'
  );
  if (!fs.existsSync(packageJsonPath)) {
    console.error(`Error: package.json not found at ${packageJsonPath}`);
    process.exit(1);
  }
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const newVersion = packageJson.version;

  console.log(`New version of @eweser/db: ${newVersion}`);

  // Update @eweser/db in the other project
  const otherProjectPath = '/home/jacob/ewe-note';
  updateOtherProjectIfAvailable('@eweser/db', newVersion, otherProjectPath);

  console.log('Dependency update completed.');
})();
