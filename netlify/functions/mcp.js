import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import serverless from "serverless-http";
import axios from "axios";

const app = express();
app.use(express.json());

const server = new McpServer({
  name: "LinkedinBot",
  version: "1.0.0"
});

// FIX: This tells the Agent "Yes, I support OAuth"
app.get("/.well-known/oauth-protected-resource", (req, res) => {
  res.json({
    authorizations: ["https://www.linkedin.com/oauth/v2/authorization"],
    tokens: ["https://www.linkedin.com/oauth/v2/accessToken"]
  });
});

// TOOL: Check connection
server.tool("get_linkedin_userinfo", "Check LinkedIn Connection", {}, async (_args, extra) => {
  const token = extra.headers?.authorization;
  const res = await axios.get("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: token }
  });
  return { content: [{ type: "text", text: JSON.stringify(res.data) }] };
});

// TOOL: Post to LinkedIn
server.tool("publish_to_linkedin", "Post to LinkedIn", { text: { type: "string" }, imageUrl: { type: "string" } }, 
async ({ text, imageUrl }, extra) => {
  const token = extra.headers?.authorization;
  const user = await axios.get("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: token } });
  const author = `urn:li:person:${user.data.sub}`;
  
  const init = await axios.post('https://api.linkedin.com/rest/images?action=initializeUpload', 
    { initializeUploadRequest: { owner: author } }, 
    { headers: { 'Authorization': token, 'Linkedin-Version': '202604' } });
  
  const { uploadUrl, image: imageUrn } = init.data.value;
  const img = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  await axios.put(uploadUrl, img.data, { headers: { 'Content-Type': 'image/png' } });

  await axios.post('https://api.linkedin.com/rest/posts', {
    author: author, commentary: text, visibility: "PUBLIC", 
    content: { media: { title: "Update", id: imageUrn } }, lifecycleState: "PUBLISHED"
  }, { headers: { 'Authorization': token, 'Linkedin-Version': '202604', 'X-Restli-Protocol-Version': '2.0.0' } });

  return { content: [{ type: "text", text: "Done." }] };
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
