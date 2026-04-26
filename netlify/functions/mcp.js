import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import serverless from "serverless-http";
import axios from "axios";

const app = express();
const server = new McpServer({ name: "LinkedinBot", version: "1.0.0" });

// Discovery path for the Agent
app.get("/.well-known/oauth-authorization-server/mcp", (req, res) => {
  res.json({
    issuer: "https://jfbsmm.netlify.app",
    authorization_endpoint: "https://www.linkedin.com/oauth/v2/authorization",
    token_endpoint: "https://www.linkedin.com/oauth/v2/accessToken",
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    scopes_supported: ["openid", "profile", "email", "w_member_social"]
  });
});

// Tool definition
server.tool("get_linkedin_userinfo", "Check LinkedIn Connection", {}, async (_args, extra) => {
  const token = extra.headers?.authorization;
  const res = await axios.get("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: token } });
  return { content: [{ type: "text", text: JSON.stringify(res.data) }] };
});

// Handshake paths
let transport;
app.get("/sse", (req, res) => {
  transport = new SSEServerTransport("/message", res);
  server.connect(transport);
});
app.post("/message", (req, res) => {
  if (transport) transport.handlePostMessage(req, res);
});

export const handler = serverless(app);
