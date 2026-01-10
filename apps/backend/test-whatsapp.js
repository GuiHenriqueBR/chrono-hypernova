const endpoint = "https://chrono-backend-production.up.railway.app/api";

async function testWhatsApp() {
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

    console.log("2. Running Diagnostics...");
    const diagRes = await fetch(`${endpoint}/whatsapp/diagnose`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("Diagnostics:", await diagRes.text());

    console.log("3. Checking WhatsApp Status...");
    const statusRes = await fetch(`${endpoint}/whatsapp/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const statusData = await statusRes.json();
    console.log(
      "WhatsApp Status Response:",
      JSON.stringify(statusData, null, 2)
    );

    if (!statusData.conectado) {
      console.log(
        "3. Status disconnected/error. Triggering Auto-Creation via /qrcode..."
      );
      const qrRes = await fetch(`${endpoint}/whatsapp/qrcode`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const qrData = await qrRes.json();
      console.log(
        "QR Code Initialization Response:",
        JSON.stringify(qrData, null, 2)
      );

      console.log("4. Checking Status again...");
      await new Promise((r) => setTimeout(r, 2000)); // Wait for creation
      const statusRes2 = await fetch(`${endpoint}/whatsapp/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Final WhatsApp Status:", await statusRes2.json());
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

testWhatsApp();
