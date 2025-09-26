import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const API_KEY = process.env.LUNAR_API_KEY
const MCP_URL = `https://lunarcrush.ai/mcp?key=${API_KEY}`;

const clientTransport = new StreamableHTTPClientTransport(new URL(MCP_URL));
const client = new Client({ name: "LunarCrush", version: "1.0.0" });

async function start() {
  await client.connect(clientTransport);
  console.log("MCP Proxy server connected");
}

app.get("/", (req, res) => {
  res.json({ message: "LunarCrush MCP Proxy Server is running", endpoint: "/mcp-proxy" });
});

app.post("/mcp-proxy", async (req, res) => {
  try {
    const requestPayload = req.body;
    const response = await client.request(requestPayload);
    res.json(response);
  } catch (error) {
    console.error("MCP proxy error:", error);
    res.status(500).json({ error: "MCP proxy internal error" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  await start();
  console.log(`Proxy server listening on http://localhost:${PORT}`);
});
