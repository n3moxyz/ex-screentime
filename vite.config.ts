// @ts-nocheck
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const judges = ["sam-altman", "andrej-karpathy", "ilya-sutskever", "brian-chesky", "harrison-chase"];
const criteria = {
  impact: { max: 20, label: "Impact" },
  technical_execution: { max: 20, label: "Technical Execution" },
  originality: { max: 15, label: "Originality" },
  demo_quality: { max: 15, label: "Demo Quality" },
  harness_agent_engineering: { max: 30, label: "Harness / Agent Engineering" },
};
const bias = {
  "sam-altman": {
    impact: 1.3,
    technical_execution: 0.9,
    originality: 1.1,
    demo_quality: 0.95,
    harness_agent_engineering: 1,
  },
  "andrej-karpathy": {
    impact: 0.85,
    technical_execution: 1.35,
    originality: 0.95,
    demo_quality: 1,
    harness_agent_engineering: 1.1,
  },
  "ilya-sutskever": {
    impact: 0.95,
    technical_execution: 1,
    originality: 1.35,
    demo_quality: 0.85,
    harness_agent_engineering: 1.15,
  },
  "brian-chesky": {
    impact: 1.15,
    technical_execution: 0.95,
    originality: 1,
    demo_quality: 1.35,
    harness_agent_engineering: 0.9,
  },
  "harrison-chase": {
    impact: 0.95,
    technical_execution: 1.1,
    originality: 1,
    demo_quality: 0.85,
    harness_agent_engineering: 1.4,
  },
};

const docFiles = [
  "README.md",
  "SPEC.md",
  "AGENTS.md",
  "CLAUDE.md",
  "FORET.md",
  "SUBMISSION.md",
  "AGENT_PROMPT.md",
  "EVAL_RUBRIC.md",
];
const manifestFiles = [
  "package.json",
  "vite.config.ts",
  "vite.config.js",
  "vite.config.mjs",
  "tsconfig.json",
  "pyproject.toml",
  "Cargo.toml",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
];
const layoutDirs = ["src", "app", "pages", "tests", "test", "fixtures", "scripts", "judges"];

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 20_000) {
        reject(new Error("Request body too large."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });

const exists = (target) => fs.existsSync(target);
const readSmall = (target) => {
  try {
    const stat = fs.statSync(target);
    if (!stat.isFile() || stat.size > 120_000) return "";
    return fs.readFileSync(target, "utf8");
  } catch {
    return "";
  }
};
const hasAny = (haystack, needles) =>
  needles.some((needle) => haystack.toLowerCase().includes(needle.toLowerCase()));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const scoreCriterion = (base, criterion, judge) => {
  const max = criteria[criterion].max;
  return Number(clamp((base / max) * bias[judge][criterion] * max, 0, max).toFixed(1));
};

const buildLocalFixture = (inputPath) => {
  const root = path.resolve(inputPath);
  if (!exists(root) || !fs.statSync(root).isDirectory()) {
    const error = new Error("Local path must be an existing directory.");
    error.statusCode = 400;
    throw error;
  }

  const foundDocs = docFiles.filter((file) => exists(path.join(root, file)));
  const foundManifests = manifestFiles.filter((file) => exists(path.join(root, file)));
  const foundDirs = layoutDirs.filter((dir) => exists(path.join(root, dir)));
  const packageText = readSmall(path.join(root, "package.json"));
  let packageJson = {};
  try {
    packageJson = packageText ? JSON.parse(packageText) : {};
  } catch {
    packageJson = {};
  }
  const scripts = packageJson.scripts ?? {};
  const docText = foundDocs.map((file) => readSmall(path.join(root, file))).join("\n\n");
  const hasReadme = foundDocs.includes("README.md");
  const hasSpec = foundDocs.includes("SPEC.md");
  const hasAgentPrompt = foundDocs.includes("AGENT_PROMPT.md") || foundDocs.includes("AGENTS.md");
  const hasForet = foundDocs.includes("FORET.md");
  const hasSubmission = foundDocs.includes("SUBMISSION.md");
  const hasRubric = foundDocs.includes("EVAL_RUBRIC.md");
  const hasPackage = foundManifests.includes("package.json");
  const hasTsconfig = foundManifests.includes("tsconfig.json");
  const hasVite = foundManifests.some((file) => file.startsWith("vite.config"));
  const hasSrc = foundDirs.includes("src");
  const hasFixtures = foundDirs.includes("fixtures") || exists(path.join(root, "src", "fixtures"));
  const hasScriptsDir = foundDirs.includes("scripts");
  const hasJudges = foundDirs.includes("judges");
  const hasTests = foundDirs.includes("tests") || foundDirs.includes("test");
  const hasBuild = Boolean(scripts.build);
  const hasTest = Boolean(scripts.test) || hasTests;
  const hasValidate = Boolean(scripts.validate);
  const hasSmoke = Boolean(scripts["smoke:visual"]) || Boolean(scripts.smoke);
  const mentionsUsers = hasAny(docText, ["user", "judge", "organizer", "team", "audience"]);
  const mentionsDemo = hasAny(docText, ["demo", "fixture", "screenshot", "report"]);
  const mentionsAgent = hasAny(docText, ["agent", "autonomous", "loop", "tool", "recover"]);
  const mentionsRubric = hasAny(docText, ["rubric", "score", "evidence", "confidence"]);

  const base = {
    impact:
      (hasReadme ? 4 : 0) +
      (hasSpec ? 5 : 0) +
      (hasSubmission ? 3 : 0) +
      (mentionsUsers ? 4 : 0) +
      (mentionsRubric ? 2 : 0),
    technical_execution:
      (hasPackage ? 3 : 0) +
      (hasSrc ? 4 : 0) +
      (hasTsconfig ? 2 : 0) +
      (hasVite ? 2 : 0) +
      (hasBuild ? 4 : 0) +
      (hasTest ? 3 : 0) +
      (hasValidate ? 2 : 0),
    originality:
      (hasSpec ? 4 : 0) +
      (hasRubric ? 3 : 0) +
      (hasJudges ? 3 : 0) +
      (hasFixtures ? 2 : 0) +
      (mentionsAgent && mentionsRubric ? 2 : 0),
    demo_quality:
      (hasReadme ? 3 : 0) +
      (mentionsDemo ? 3 : 0) +
      (hasFixtures ? 3 : 0) +
      (hasSubmission ? 3 : 0) +
      (hasSmoke ? 2 : 0),
    harness_agent_engineering:
      (hasSpec ? 4 : 0) +
      (hasAgentPrompt ? 6 : 0) +
      (hasForet ? 4 : 0) +
      (hasSubmission ? 3 : 0) +
      (hasValidate ? 4 : 0) +
      (hasFixtures ? 4 : 0) +
      (hasScriptsDir ? 2 : 0) +
      (hasJudges ? 2 : 0),
  };

  const events = [];
  const started = Date.now();
  const add = (type, stage, message, severity = "info", details = {}) => {
    const event = {
      id: `local-${String(events.length + 1).padStart(3, "0")}`,
      timestamp: new Date(started + events.length * 1000).toISOString(),
      type,
      stage,
      message,
      severity,
      details,
    };
    events.push(event);
    return event;
  };
  const score = (criterion, judge, delta, reason, evidence, confidence, kind, artifact, clause) =>
    add(
      "score_delta",
      "scoring",
      `${judge.replace(/-/g, " ")} scores ${criteria[criterion].label}.`,
      delta < 0 || kind === "missing" ? "warning" : "success",
      {
        criterion,
        judge,
        delta,
        reason,
        evidence: [evidence],
        confidence,
        evidence_kind: kind,
        artifact_ref: artifact,
        rubric_clause_ref: clause,
      },
    );

  add("stage_started", "intake", `Static local inspection created for ${root}.`, "info", {
    mode: "local-static",
    sourcePath: root,
  });
  add("stage_completed", "intake", "Local path accepted; no commands will be executed.", "success", {
    commandExecution: false,
  });
  add("track_selected", "track_panel", "Harness / Skills Track selected for local inspection.", "info", {
    track: "Harness / Skills Track",
  });
  add("panel_selected", "track_panel", "Five-lens panel selected for local static inspection.", "success", {
    panel: judges,
  });
  add("stage_completed", "track_panel", "Track and panel selection complete.", "success", {
    panel_size: judges.length,
  });
  add("stage_started", "stack_detection", "Detecting stack from safe manifest files.", "info", {
    files: manifestFiles,
  });
  add(foundManifests.length ? "stack_detected" : "file_missing", "stack_detection", foundManifests.length ? `Found ${foundManifests.join(", ")}.` : "No recognized manifest files found.", foundManifests.length ? "success" : "warning", {
    found: foundManifests,
  });
  add("stage_completed", "stack_detection", "Stack detection complete.", foundManifests.length ? "success" : "warning");
  add("stage_started", "documentation_review", "Reading safe documentation files.", "info", {
    files: docFiles,
  });
  foundDocs.forEach((file) => add("file_found", "documentation_review", `${file} found.`, "success", {
    artifact_ref: `file:${file}`,
  }));
  docFiles
    .filter((file) => !foundDocs.includes(file))
    .slice(0, 4)
    .forEach((file) => add("file_missing", "documentation_review", `${file} not found.`, "warning", {
      artifact_ref: `missing:${file}`,
    }));
  add("stage_completed", "documentation_review", "Documentation review complete.", foundDocs.length ? "success" : "warning");
  add("stage_started", "prompt_discovery", "Looking for autonomous prompt and harness evidence.", "info");
  add(hasAgentPrompt ? "file_found" : "file_missing", "prompt_discovery", hasAgentPrompt ? "Agent instructions or prompt file found." : "No autonomous prompt evidence found.", hasAgentPrompt ? "success" : "warning", {
    artifact_ref: hasAgentPrompt ? "file:AGENTS.md" : "missing:agent-prompt",
  });
  add("stage_completed", "prompt_discovery", "Prompt discovery complete.", hasAgentPrompt ? "success" : "warning");
  add("stage_started", "structure_inspection", "Inspecting source, scripts, fixtures, tests, and judges directories.", "info");
  add(foundDirs.length ? "evidence_found" : "file_missing", "structure_inspection", foundDirs.length ? `Found directories: ${foundDirs.join(", ")}.` : "No recognized source directories found.", foundDirs.length ? "success" : "warning", {
    found: foundDirs,
  });
  add("stage_completed", "structure_inspection", "Project structure inspection complete.", foundDirs.length ? "success" : "warning");
  add("stage_started", "verification", "Checking documented command availability without running commands.", "info");
  Object.entries(scripts).slice(0, 6).forEach(([name, command]) =>
    add("evidence_found", "verification", `Script "${name}" is documented.`, "success", {
      command,
      artifact_ref: `script:${name}`,
    }),
  );
  if (!hasBuild) add("file_missing", "verification", "No build script found.", "warning", { artifact_ref: "missing:build-script" });
  if (!hasTest) add("file_missing", "verification", "No test script or tests directory found.", "warning", { artifact_ref: "missing:test-evidence" });
  add("stage_completed", "verification", "Static verification complete; no commands executed.", "warning", {
    commandExecution: false,
  });
  add("stage_started", "scoring", "Applying five-lens static rubric scoring.", "info", {
    math: "observed static evidence with judge bias multipliers",
  });

  Object.keys(criteria).forEach((criterion) => {
    judges.forEach((judge) => {
      const value = scoreCriterion(base[criterion], criterion, judge);
      const kind = value > 0 ? (criterion === "impact" || criterion === "originality" ? "inferred" : "observed") : "missing";
      score(
        criterion,
        judge,
        value,
        value > 0
          ? `${criteria[criterion].label} received static-inspection credit for the files and signals found.`
          : `${criteria[criterion].label} could not be supported by static inspection evidence.`,
        value > 0
          ? `Signals found: docs=${foundDocs.length}, manifests=${foundManifests.length}, dirs=${foundDirs.length}`
          : "Expected evidence was not found during static inspection.",
        value > 0 ? (kind === "observed" ? 1 : 0.7) : 0,
        kind,
        value > 0 ? `local:${root}` : `missing:${criterion}`,
        `${criterion}.local_static_inspection`,
      );
    });
  });
  if (!hasAgentPrompt) {
    judges.forEach((judge) =>
      score(
        "harness_agent_engineering",
        judge,
        -1,
        "No autonomous prompt was found, so harness confidence is reduced.",
        "AGENT_PROMPT.md or strong AGENTS.md evidence was absent.",
        0,
        "missing",
        "missing:agent-prompt",
        "harness_agent_engineering.autonomous_prompt_quality",
      ),
    );
  }
  add("stage_completed", "scoring", "Five-lens static scoring complete.", "success");
  add("stage_started", "panel_interpretation", "Computing panel spread from static evidence.", "info", {
    panel: judges,
  });
  add("stage_completed", "panel_interpretation", "Panel interpretation complete for static inspection.", "success", {
    note: "Use evidence inspector for per-judge rationale.",
  });
  add("stage_started", "report_generation", "Generating static local inspection report.", "info");
  add("report_generated", "report_generation", "Report generated from observed local files and missing evidence.", "success", {
    commandExecution: false,
  });
  add("stage_completed", "report_generation", "Report generation complete.", "success");
  add("evaluation_completed", "report_generation", "Static local inspection complete.", "success", {
    inspectedOnly: true,
  });

  return {
    meta: {
      id: `local-static-${Buffer.from(root).toString("base64url").slice(0, 12)}`,
      name: "Local Static Inspection",
      mode: "local-static",
      track: "Harness / Skills Track",
      panel: judges,
      repoLabel: path.basename(root) || root,
      sourcePath: root,
      summary:
        "Read-only static inspection of safe docs, manifests, source layout, scripts, fixtures, and harness evidence. No commands were executed.",
    },
    events,
  };
};

const localInspectPlugin = () => ({
  name: "ralph-ledger-local-inspect",
  configureServer(server) {
    server.middlewares.use("/api/local-inspect", async (req, res) => {
      if (req.method !== "POST") {
        res.statusCode = 405;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ error: "POST required." }));
        return;
      }
      try {
        const body = JSON.parse((await readBody(req)) || "{}");
        const fixture = buildLocalFixture(String(body.path ?? ""));
        res.statusCode = 200;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(fixture));
      } catch (error) {
        res.statusCode = error.statusCode ?? 500;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ error: error.message ?? "Local inspection failed." }));
      }
    });
  },
});

export default defineConfig({
  plugins: [react(), localInspectPlugin()],
});
