import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import serverless from "serverless-http";
import axios from "axios";

const app = express();
const server = new McpServer({
  name: "LinkedinBot",
  version: "1.0.0"
});

// TOOL 1: Discovery Fix (What the Agent is looking for)
server.tool(
  "get_linkedin_userinfo",
  "Fetch the authenticated LinkedIn user's profile info.",
  {}, 
  async (_args, extra) => {
    const authHeader = extra.headers?.authorization;
    if (!authHeader) throw new Error("Missing OAuth Token. Connect your account.");

    const res = await axios.get("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: authHeader }
    });
    
    return {
      content: [{ type: "text", text: JSON.stringify(res.data) }]
    };
  }
);

// TOOL 2: Automation Fix (The part that actually posts)
server.tool(
  "publish_to_linkedin",
  "Automatically posts text and an image to LinkedIn.",
  {
    text: { type: "string" },
    imageUrl: { type: "string" }
  },
  async ({ text, imageUrl }, extra) => {
    const token = extra.headers?.authorization;
    const authorRes = await axios.get("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: token }
    });
    const author = `urn:li:person:${authorRes.data.sub}`;

    // Initialize Image Upload
    const init = await axios.post('https://api.linkedin.com/rest/images?action=initializeUpload', 
      { initializeUploadRequest: { owner: author } },
      { headers: { 'Authorization': token, 'Linkedin-Version': '202604' } }
    );
    
    const { uploadUrl, image: imageUrn } = init.data.value;

    // Upload Binary
    const imageBinary = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    await axios.put(uploadUrl, imageBinary.data, { headers: { 'Content-Type': 'image/png' } });

    // Create Post
    await axios.post('https://api.linkedin.com/rest/posts', {
      author: author,
      commentary: text,
      visibility: "PUBLIC",
      content: { media: { title: "AI Daily Update", id: imageUrn } },
      lifecycleState: "PUBLISHED"
    }, {
      headers: { 'Authorization': token, 'Linkedin-Version': '202604', 'X-Restli-Protocol-Version': '2.0.0' }
    });

    return { content: [{ type: "text", text: "Post successful." }] };
  }
);

// HANDSHAKE SETUP
let transport;
app.get("/sse", (req, res) => {
  transport = new SSEServerTransport("/message", res);
  server.connect(transport);
});

app.post("/message", (req, res) => {
  if (transport) transport.handlePostMessage(req, res);
});

// OAUTH REDIRECT RECEIVER
app.get("/auth/callback", (req, res) => {
  res.send("LinkedIn Connected. Close this and return to your Agent.");
});

export const handler = serverless(app);
