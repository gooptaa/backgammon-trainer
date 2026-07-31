import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const WORKSPACE_DIRS = ["apps", "packages"];

const FORBIDDEN_EDGES = [
  {
    from: "@backgammon-trainer/backgammon-engine",
    to: "@backgammon-trainer/backgammon-analysis-session",
    reason: "Engine must not depend on analysis-session orchestration."
  },
  {
    from: "@backgammon-trainer/backgammon-engine",
    to: "@backgammon-trainer/web",
    reason: "Engine must not depend on the web app."
  },
  {
    from: "@backgammon-trainer/backgammon-analysis",
    to: "@backgammon-trainer/web",
    reason: "Analysis must not depend on the web app."
  },
  {
    from: "@backgammon-trainer/backgammon-analysis",
    to: "@backgammon-trainer/backgammon-analysis-session",
    reason: "Analysis must remain independent from analysis-session."
  },
  {
    from: "@backgammon-trainer/web",
    to: "@backgammon-trainer/backgammon-evaluator-gnubg",
    reason: "Browser bundle must not depend on the Node-only GNU adapter."
  }
];

const readJson = async (filePath) => {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content);
};

const getAllDependencyNames = (pkg) => {
  const sections = [
    pkg.dependencies ?? {},
    pkg.devDependencies ?? {},
    pkg.optionalDependencies ?? {},
    pkg.peerDependencies ?? {}
  ];

  return new Set(sections.flatMap((section) => Object.keys(section)));
};

const findWorkspacePackages = async () => {
  const result = [];

  for (const workspaceDir of WORKSPACE_DIRS) {
    const absoluteWorkspaceDir = path.join(ROOT, workspaceDir);
    const entries = await readdir(absoluteWorkspaceDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const packageDir = path.join(absoluteWorkspaceDir, entry.name);
      const packageJsonPath = path.join(packageDir, "package.json");

      try {
        const pkg = await readJson(packageJsonPath);
        result.push({
          name: pkg.name,
          packageDir,
          packageJsonPath,
          dependencyNames: getAllDependencyNames(pkg)
        });
      } catch {
        // Ignore directories without package.json.
      }
    }
  }

  return result;
};

const detectCycles = (graph) => {
  const visited = new Set();
  const stack = new Set();
  const cycles = [];

  const visit = (node, trail) => {
    if (stack.has(node)) {
      const cycleStart = trail.indexOf(node);
      if (cycleStart >= 0) {
        cycles.push([...trail.slice(cycleStart), node]);
      }
      return;
    }

    if (visited.has(node)) {
      return;
    }

    visited.add(node);
    stack.add(node);

    for (const next of graph.get(node) ?? []) {
      visit(next, [...trail, node]);
    }

    stack.delete(node);
  };

  for (const node of graph.keys()) {
    visit(node, []);
  }

  return cycles;
};

const main = async () => {
  const workspacePackages = await findWorkspacePackages();
  const packageByName = new Map(workspacePackages.map((pkg) => [pkg.name, pkg]));

  const errors = [];

  for (const edge of FORBIDDEN_EDGES) {
    const sourcePackage = packageByName.get(edge.from);
    if (!sourcePackage) {
      errors.push(`Missing workspace package ${edge.from} while validating architecture rules.`);
      continue;
    }

    if (sourcePackage.dependencyNames.has(edge.to)) {
      errors.push(
        `${edge.from} depends on ${edge.to}. ${edge.reason} (${path.relative(
          ROOT,
          sourcePackage.packageJsonPath
        )})`
      );
    }
  }

  const graph = new Map();
  for (const pkg of workspacePackages) {
    const localDependencies = [...pkg.dependencyNames].filter((name) => packageByName.has(name));
    graph.set(pkg.name, localDependencies);
  }

  const cycles = detectCycles(graph);
  if (cycles.length > 0) {
    for (const cycle of cycles) {
      errors.push(`Workspace dependency cycle detected: ${cycle.join(" -> ")}`);
    }
  }

  if (errors.length > 0) {
    console.error("Architecture validation failed:");
    for (const message of errors) {
      console.error(`- ${message}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("Architecture validation passed.");
};

main().catch((error) => {
  console.error("Architecture validation failed with an unexpected error.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
