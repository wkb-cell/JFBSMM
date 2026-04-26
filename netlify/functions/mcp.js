import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import serverless from "serverless-http";

const app = express();
const server = new McpServer({ name: "LinkedinBot", version: "1.0.0" });

// TEST ROUTE: If you go to https://jfbsmm.netlify.app/ you should see "SERVER ALIVE"
app.get("/", (req, res) => res.send("SERVER ALIVE"));

// IDENTITY CARD: This fixes the "Does not implement OAuth" error
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

let transport;
app.get("/sse", (req, res) => {
  transport = new SSEServerTransport("/message", res);
  server.connect(transport);
});
app.post("/message", (req, res) => {
  if (transport) transport.handlePostMessage(req, res);
});

export const handler = serverless(app);
