import dotenv from "dotenv";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

dotenv.config();

const API_KEY = process.env.LUNAR_API_KEY;
const MCP_URL = `https://lunarcrush.ai/mcp?key=${API_KEY}`;

let client;

async function getClient() {
  if (!client) {
    const clientTransport = new StreamableHTTPClientTransport(new URL(MCP_URL));
    client = new Client({ name: "LunarCrush", version: "1.0.0" });
    await client.connect(clientTransport);
  }
  return client;
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.json({
      message: "LunarCrush MCP Proxy Server is running",
      endpoint: "/api"
    });
  }

  if (req.method === 'POST') {
    try {
      const requestPayload = req.body;
      const mcpClient = await getClient();
      const response = await mcpClient.request(requestPayload);
      return res.json(response);
    } catch (error) {
      console.error("MCP proxy error:", error);
      return res.status(500).json({ error: "MCP proxy internal error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}