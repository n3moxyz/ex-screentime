import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildLocalFixture, LocalInspectError } from "./local-inspect";
import type { ReplayFixture } from "./types";

const GITHUB_SUGGESTIONS = [
  "https://github.com/n3moxyz/ralph-ledger",
  "https://github.com/n3moxyz/etskills",
  "https://github.com/anthropics/claude-code",
];

const CLONE_TIMEOUT_MS = 25_000;
const MAX_CLONE_BYTES = 50 * 1024 * 1024;

const normalizeUrl = (raw: string) => {
  const trimmed = raw.trim().replace(/\.git$/, "").replace(/\/$/, "");
  if (!/^https:\/\/github\.com\/[^/]+\/[^/]+$/.test(trimmed)) {
    throw new LocalInspectError(
      "Only public https://github.com/<org>/<repo> URLs are accepted.",
      400,
    );
  }
  return trimmed;
};

const removeDir = (target: string) => {
  try {
    fs.rmSync(target, { recursive: true, force: true });
  } catch {
    /* swallow */
  }
};

const dirSize = (target: string): number => {
  let total = 0;
  const walk = (current: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      try {
        if (entry.isDirectory()) {
          if (entry.name === ".git") continue;
          walk(fullPath);
        } else if (entry.isFile()) {
          total += fs.statSync(fullPath).size;
          if (total > MAX_CLONE_BYTES) return;
        }
      } catch {
        /* skip unreadable */
      }
    }
  };
  walk(target);
  return total;
};

const cloneRepo = (url: string, target: string) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(
      "git",
      [
        "-c",
        "protocol.file.allow=never",
        "-c",
        "protocol.ext.allow=never",
        "-c",
        "core.symlinks=false",
        "clone",
        "--depth",
        "1",
        "--no-tags",
        "--no-recurse-submodules",
        "--filter=blob:none",
        "--single-branch",
        url,
        target,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
      if (stderr.length > 4_000) stderr = stderr.slice(-4_000);
    });

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new LocalInspectError("Clone timed out after 25 seconds.", 504));
    }, CLONE_TIMEOUT_MS);

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(new LocalInspectError(`git clone failed: ${error.message}`, 502));
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new LocalInspectError(
          stderr.trim() ? `git clone exited ${code}: ${stderr.trim()}` : `git clone exited ${code}.`,
          502,
        ),
      );
    });
  });

export const GITHUB_SUGGESTION_VALUES = [...GITHUB_SUGGESTIONS];

export const buildGithubFixture = async (rawUrl: string): Promise<ReplayFixture> => {
  const url = normalizeUrl(rawUrl);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ralph-ledger-clone-"));
  try {
    await cloneRepo(url, tempDir);
    if (dirSize(tempDir) > MAX_CLONE_BYTES) {
      throw new LocalInspectError(
        `Cloned tree exceeds the ${MAX_CLONE_BYTES / 1024 / 1024} MB ceiling for static inspection.`,
        413,
      );
    }
    const fixture = buildLocalFixture(tempDir);
    const repoLabel = url.replace(/^https:\/\/github\.com\//, "");
    return {
      ...fixture,
      meta: {
        ...fixture.meta,
        id: `github-clone-${Buffer.from(url).toString("base64url").slice(0, 12)}`,
        name: `GitHub Clone — ${repoLabel}`,
        repoLabel,
        submittedRepoUrl: url,
        summary: `Read-only static inspection of ${repoLabel} cloned from GitHub. Ralph Ledger inspected safe files only and did not run install, build, or test commands.`,
      },
    };
  } finally {
    removeDir(tempDir);
  }
};
