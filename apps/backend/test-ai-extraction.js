const fs = require("fs");
const path = require("path");

// const endpoint = 'http://localhost:8000/api'; // Use local if needed
const endpoint = process.env.API_BASE_URL || "http://localhost:3001/api";

const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  console.error("Missing ADMIN_EMAIL or ADMIN_PASSWORD env vars.");
  process.exit(1);
}
async function testAIExtraction() {
  try {
    console.log("1. Login admin...");
    const loginRes = await fetch(`${endpoint}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
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
