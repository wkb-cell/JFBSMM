server.addTool({
  name: "publish_to_linkedin",
  description: "Publishes text and image to LinkedIn using the 2026 Posts API.",
  schema: {
    type: "object",
    properties: {
      text: { type: "string" },
      imageUrn: { type: "string" } // We will get this from the upload tool
    }
  },
  handler: async ({ text, imageUrn }) => {
    const response = await axios.post('https://api.linkedin.com/rest/posts', {
      author: process.env.LINKEDIN_PERSON_ID,
      commentary: text,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: []
      },
      content: {
        media: {
          title: "Daily AI Update",
          id: imageUrn
        }
      },
      lifecycleState: "PUBLISHED"
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
        'Linkedin-Version': '202604',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });
    return { result: "Post Live!" };
  }
});
