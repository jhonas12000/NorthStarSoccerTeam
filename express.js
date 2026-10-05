import express from "express";
import { resolve } from "node:path";

const app = express();
const port = Number(process.env.PORT || 4242);
const distDirectory = resolve("dist");

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(express.static(distDirectory));

app.get(/.*/, (_request, response) => {
  response.sendFile(resolve(distDirectory, "index.html"));
});

app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});