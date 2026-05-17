import type { IncomingMessage, ServerResponse } from "node:http";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { buildLocalFixture, LocalInspectError } from "./src/evaluator/local-inspect";

const readBody = (req: IncomingMessage) =>
  new Promise<string>((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString("utf8");
      if (body.length > 20_000) {
        reject(new LocalInspectError("Request body too large.", 413));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });

const sendJson = (res: ServerResponse, statusCode: number, payload: unknown) => {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(payload));
};

const localInspectPlugin = (): Plugin => ({
  name: "ralph-ledger-local-inspect",
  configureServer(server) {
    server.middlewares.use("/api/local-inspect", async (req, res) => {
      if (req.method !== "POST") {
        sendJson(res, 405, { error: "POST required." });
        return;
      }

      try {
        const body = JSON.parse((await readBody(req)) || "{}") as { path?: unknown };
        const fixture = buildLocalFixture(String(body.path ?? ""));
        sendJson(res, 200, fixture);
      } catch (error) {
        const statusCode = error instanceof LocalInspectError ? error.statusCode : 500;
        const message = error instanceof Error ? error.message : "Local inspection failed.";
        sendJson(res, statusCode, { error: message });
      }
    });
  },
});

export default defineConfig({
  plugins: [react(), localInspectPlugin()],
});
