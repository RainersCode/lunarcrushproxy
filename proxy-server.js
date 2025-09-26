import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const API_KEY = process.env.LUNAR_API_KEY;
const MCP_URL = `https://lunarcrush.ai/mcp?key=${API_KEY}`;

let sessionId = null;

async function sendMCPRequest(payload) {
  console.log(`Sending ${payload.method} request`, { hasSessionId: !!sessionId });

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream'
  };

  // CRITICAL: Never add session ID for initialize requests
  if (payload.method !== 'initialize' && sessionId) {
    headers['Mcp-Session-Id'] = sessionId;
    console.log('Adding session ID to headers:', sessionId);
  } else if (payload.method === 'initialize') {
    console.log('Skipping session ID for initialize request');
  }

  console.log('Request headers:', headers);
  console.log('Request payload:', JSON.stringify(payload, null, 2));

  const response = await fetch(MCP_URL, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(payload)
  });

  const responseText = await response.text();
  console.log('Raw response:', response.status, responseText);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${responseText}`);
  }

  let result;
  try {
    // Check if response is in SSE format (starts with "event:")
    if (responseText.startsWith('event:')) {
      // Parse SSE format - extract JSON from "data:" line
      const lines = responseText.split('\n');
      const dataLine = lines.find(line => line.startsWith('data:'));
      if (dataLine) {
        const jsonData = dataLine.substring(5).trim(); // Remove "data:" prefix
        result = JSON.parse(jsonData);
      } else {
        throw new Error(`No data line found in SSE response: ${responseText}`);
      }
    } else {
      // Regular JSON response
      result = JSON.parse(responseText);
    }
  } catch (e) {
    throw new Error(`Invalid response format: ${responseText}`);
  }

  // Extract session ID from initialize response headers or body
  if (payload.method === 'initialize') {
    // Check response headers first
    const sessionFromHeader = response.headers.get('Mcp-Session-Id');
    if (sessionFromHeader) {
      sessionId = sessionFromHeader;
      console.log('Session ID from header:', sessionId);
    } else if (result.sessionId) {
      sessionId = result.sessionId;
      console.log('Session ID from body:', sessionId);
    } else {
      console.log('No session ID found in response');
    }
  }

  return result;
}

app.get("/", (req, res) => {
  res.json({ message: "LunarCrush MCP Proxy Server is running", endpoint: "/mcp-proxy" });
});

app.post("/mcp-proxy", async (req, res) => {
  try {
    const requestPayload = req.body;
    console.log('Received request:', requestPayload.method, requestPayload);

    const response = await sendMCPRequest(requestPayload);
    console.log('Response:', response);

    res.json(response);
  } catch (error) {
    console.error("MCP proxy error:", error.message);
    res.status(500).json({
      error: "MCP proxy internal error",
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Proxy server listening on http://localhost:${PORT}`);
});
