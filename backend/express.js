import "dotenv/config";
import express from "express";
import { resolve } from "node:path";
import { closeDatabase, getDatabaseStatus } from "./database.js";
import membersRouter from "./routes/members.js";

const app = express();
const port = Number(process.env.PORT || 4242);
const distDirectory = resolve("dist");

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", async (_request, response) => {
  const database = await getDatabaseStatus();
  response.status(database.connected ? 200 : 503).json({
    status: database.connected ? "ok" : "degraded",
    database,
  });
});

app.use("/api/members", membersRouter);

app.use(express.static(distDirectory));

app.get(/.*/, (_request, response) => {
  response.sendFile(resolve(distDirectory, "index.html"));
});

app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received; closing MongoDB connection.`);
  await closeDatabase();
  process.exit(0);
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
