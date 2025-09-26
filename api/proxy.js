import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.LUNAR_API_KEY;
const MCP_URL = `https://lunarcrush.ai/mcp?key=${API_KEY}`;

let sessionId = null;

async function sendMCPRequest(payload) {
  const headers = {
    'Content-Type': 'application/json'
  };

  // Only add session ID if method is NOT initialize and we have a session
  if (payload.method !== 'initialize' && sessionId) {
    headers['Mcp-Session-Id'] = sessionId;
  }

  const response = await fetch(MCP_URL, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const result = await response.json();

  // Store session ID from initialize response
  if (payload.method === 'initialize' && result.sessionId) {
    sessionId = result.sessionId;
  }

  return result;
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
      console.log('Received request:', requestPayload.method, requestPayload);

      const response = await sendMCPRequest(requestPayload);
      console.log('Response:', response);

      return res.json(response);
    } catch (error) {
      console.error("MCP proxy error:", error.message);
      return res.status(500).json({
        error: "MCP proxy internal error",
        details: error.message
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}