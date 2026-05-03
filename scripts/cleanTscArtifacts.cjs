#!/usr/bin/env node

/**
 * Cleans TS artifacts from amidst TS files in the repo.
 * Useful if you (our your AI agent) ran a TS build without the --noEmit flag.
 */
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const cwd = process.cwd();
const args = new Set(process.argv.slice(2));
const shouldDelete = args.has("--delete");
const verbose = args.has("--verbose");

const configPath = ts.findConfigFile(cwd, ts.sys.fileExists, "tsconfig.json");

if (!configPath) {
  console.error("Could not find tsconfig.json");
  process.exit(1);
}

const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

if (configFile.error) {
  console.error(
    ts.formatDiagnosticsWithColorAndContext([configFile.error], formatHost),
  );
  process.exit(1);
}

const parsedConfig = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  path.dirname(configPath),
);

if (parsedConfig.errors.length > 0) {
  console.error(
    ts.formatDiagnosticsWithColorAndContext(parsedConfig.errors, formatHost),
  );
  process.exit(1);
}

const artifactPaths = parsedConfig.fileNames
  .filter((filePath) => !filePath.endsWith(".d.ts"))
  .flatMap(getArtifactPaths)
  .filter((filePath, index, allPaths) => allPaths.indexOf(filePath) === index)
  .filter((filePath) => fs.existsSync(filePath));

if (artifactPaths.length === 0) {
  console.log("No emitted TypeScript artifacts found.");
  process.exit(0);
}

artifactPaths.forEach((filePath) => {
  const relativePath = path.relative(cwd, filePath);

  if (shouldDelete) {
    fs.unlinkSync(filePath);
    console.log(`deleted ${relativePath}`);
    return;
  }

  console.log(`would delete ${relativePath}`);
});

console.log(
  shouldDelete
    ? `Deleted ${artifactPaths.length} file(s).`
    : `Dry run only. Re-run with --delete to remove ${artifactPaths.length} file(s).`,
);

if (verbose && !shouldDelete) {
  console.log(
    `Resolved ${parsedConfig.fileNames.length} TypeScript source file(s) from ${path.relative(cwd, configPath)}.`,
  );
}

function getArtifactPaths(sourcePath) {
  if (sourcePath.endsWith(".ts")) {
    return [
      replaceExtension(sourcePath, ".ts", ".js"),
      replaceExtension(sourcePath, ".ts", ".d.ts"),
    ];
  }

  if (sourcePath.endsWith(".tsx")) {
    return [
      replaceExtension(sourcePath, ".tsx", ".js"),
      replaceExtension(sourcePath, ".tsx", ".d.ts"),
    ];
  }

  if (sourcePath.endsWith(".mts")) {
    return [
      replaceExtension(sourcePath, ".mts", ".mjs"),
      replaceExtension(sourcePath, ".mts", ".d.mts"),
    ];
  }

  if (sourcePath.endsWith(".cts")) {
    return [
      replaceExtension(sourcePath, ".cts", ".cjs"),
      replaceExtension(sourcePath, ".cts", ".d.cts"),
    ];
  }

  return [];
}

function replaceExtension(filePath, fromExtension, toExtension) {
  return `${filePath.slice(0, -fromExtension.length)}${toExtension}`;
}

function getCanonicalFileName(fileName) {
  return ts.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase();
}

const formatHost = {
  getCanonicalFileName,
  getCurrentDirectory: () => cwd,
  getNewLine: () => ts.sys.newLine,
};
