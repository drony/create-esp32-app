#!/usr/bin/env node
const inquirer = require("inquirer");
const path = require("path");
const fs = require("fs");
inquirer.registerPrompt("fuzzypath", require("inquirer-fuzzy-path"));

const CURR_DIR = process.cwd();

var rootPath;
if (process.platform === "win32") {
  rootPath = "c:\\";
} else {
  rootPath = require("os").homedir();
}

const defaultIDFPath = path.join(rootPath, "esp", "esp-idf");
const defaultExtensiaToolsPath = path.join(rootPath, "esp", "tools", ".espressif");

const questions = [
  {
    name: "projectName",
    type: "input",
    message: "Project Name",
    validate: function(input) {
      if (/^([A-Za-z]+[A-Za-z\-\_\d])+$/.test(input)) return true;
      else return "Project name must be alphanumeric and start with a letter";
    }
  },
  {
    name: "iDFPath",
    type: "fuzzypath",
    itemType: "directory",
    rootPath: rootPath,
    message: "Select directory to ESP-IDF",
    default: defaultIDFPath,
    suggestOnly: true,
    depthLimit: 1
  },
  {
    name: "toolsPath",
    type: "fuzzypath",
    itemType: "directory",
    rootPath: rootPath,
    message: "Select directory to Extensia Tools",
    default: defaultExtensiaToolsPath,
    suggestOnly: true,
    depthLimit: 1
  }
];

async function generate() {
  const answers = await inquirer.prompt(questions);
  fs.mkdirSync(`${CURR_DIR}/${answers.projectName}`);
  const templatePath = `${__dirname}/esp-idf-template/`;
  createDirectoryContents(templatePath, answers.projectName, answers);
}

function createDirectoryContents(templatePath, newProjectPath, answers) {
  const filesToCreate = fs.readdirSync(templatePath);
  filesToCreate.forEach(file => {
    const origFilePath = `${templatePath}/${file}`;
    const stats = fs.statSync(origFilePath);
    if (stats.isFile()) {
      const contents = fs.readFileSync(origFilePath, "utf8");
      const updatedContents = replaceFileTokens(contents, answers);
      if (file === '.npmignore') file = '.gitignore';
      const writePath = `${CURR_DIR}/${newProjectPath}/${file}`;
      fs.writeFileSync(writePath, updatedContents, "utf8");
    } else if (stats.isDirectory()) {
      fs.mkdirSync(`${CURR_DIR}/${newProjectPath}/${file}`);
      createDirectoryContents(`${templatePath}/${file}`, `${newProjectPath}/${file}`, answers);
    }
  });
}

function replaceFileTokens(contents, answers) {
  const { iDFPath, toolsPath, projectName } = answers;
  const forwardSlash_idfPath = iDFPath.replace(/\\/g, "/");
  const forwardSlash_toolsPath = toolsPath.replace(/\\/g, "/");
  const forwardSlash_elf_Path = `${CURR_DIR.replace(/\\/g, "/")}/${projectName}/build/${projectName}.elf`;
  const backSlash_idf_path_escaped = forwardSlash_idfPath.replace(/\//g, "\\\\");

  return contents
    .replace(/{{IDF-TOOLS-PATH}}/g, forwardSlash_toolsPath)
    .replace(/{{IDF-PATH}}/g, forwardSlash_idfPath)
    .replace(/{{ELF-PATH}}/g, forwardSlash_elf_Path)
    .replace(/{{PROJECT-NAME}}/g, projectName)
    .replace(/{{IDF-PATH-BACK_SLASH_ESCAPED}}/g, backSlash_idf_path_escaped);
}

generate();