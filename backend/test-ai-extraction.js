const fs = require("fs");
const path = require("path");

const endpoint = "https://chrono-backend-production.up.railway.app/api";
// const endpoint = 'http://localhost:8000/api'; // Use local if needed

async function testAIExtraction() {
  try {
    console.log("1. Login admin...");
    const loginRes = await fetch(`${endpoint}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@chrono.com", password: "admin123" }),
    });

    if (!loginRes.ok) {
      console.error("Login failed:", await loginRes.text());
      return;
    }

    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log("Login OK.");

    console.log("2. Uploading document for extraction...");
    const formData = new FormData();
    const filePath = path.join(__dirname, "sample_policy.png");

    // Read file as blob/buffer
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: "image/png" });

    formData.append("documento", blob, "sample_policy.png");
    formData.append("tipo", "apolice");

    const extractRes = await fetch(`${endpoint}/ia/extrair`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        // Content-Type is set automatically by FormData with boundary
      },
      body: formData,
    });

    const extractData = await extractRes.json();
    console.log("Extraction Result:", JSON.stringify(extractData, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

testAIExtraction();
