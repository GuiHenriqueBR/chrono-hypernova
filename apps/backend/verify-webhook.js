const fetch = require("node-fetch");

const API_URL =
  "https://chrono-backend-production.up.railway.app/api/whatsapp/webhook";

async function verifyWebhook() {
  console.log("Testing Webhook Public Access...");
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event: "test",
        data: {},
        instance: "corretora",
      }),
    });

    console.log(`Response Status: ${response.status}`);
    const text = await response.text();
    console.log(`Response Body: ${text}`);

    if (response.status === 200) {
      console.log("SUCCESS: Webhook is publicly accessible!");
    } else {
      console.log("FAILURE: Webhook returned unexpected status.");
    }
  } catch (error) {
    console.error("ERROR:", error);
  }
}

verifyWebhook();
