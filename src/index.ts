import express, { Express, Request, Response } from "express";
import fs from "fs";
import { config } from "@dotenvx/dotenvx";
import cors from "cors";

config();

const app: Express = express();
const port = process.env.PORT;
const PRINTER_PATH: string = process.env.PRINTER_PATH
  ? process.env.PRINTER_PATH
  : "/dev/usb/lp2";

app.use(express.text({ type: "*/*" }));

app.use(cors());

app.get("/health", async (_, res) => {
  res.status(200).json({
    status: "UP",
    timestamp: new Date(),
    uptime: process.uptime(),
  });
});

app.post("/", async (req: Request, res: Response) => {
  const zplData = req.body;

  if (!zplData) {
    res.status(400).send("No ZPL data received");
    return;
  }

  try {
    fs.writeFileSync(PRINTER_PATH, zplData, { encoding: "utf-8" });
    console.log("Print job sent successfully!");
  } catch (error) {
    console.error("Failed to print:", error);
  }

  res.status(200).send();
});

const server = app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});

process.on("SIGTERM", shutDown);
process.on("SIGINT", shutDown);

function shutDown() {
  console.log("Received kill signal, shutting down gracefully");
  server.close(async () => {
    console.log("exiting");
    process.exit(0);
  });
}
