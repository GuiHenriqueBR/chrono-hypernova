const endpoint = "http://localhost:3333/api";

async function testLoginAndAccess() {
  try {
    console.log("1. Attempting login with admin@chrono.com...");
    const loginRes = await fetch(`${endpoint}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@chrono.com", password: "admin123" }),
    });

    if (!loginRes.ok) {
      console.error(`Login failed: ${loginRes.status} ${loginRes.statusText}`);
      const text = await loginRes.text();
      console.error("Response:", text);
      return;
    }

    const loginData = await loginRes.json();
    console.log("Login successful!");
    console.log("Token received:", loginData.token ? "YES" : "NO");

    if (!loginData.token) {
      console.error("No token received.");
      return;
    }

    console.log(
      "\n2. Attempting to access protected route (/dashboard/stats) with token..."
    );
    const statsRes = await fetch(`${endpoint}/dashboard/stats`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${loginData.token}`,
        "Content-Type": "application/json",
      },
    });

    if (statsRes.ok) {
      const statsData = await statsRes.json();
      console.log("Access successful! Status:", statsRes.status);
      console.log("Stats received:", Object.keys(statsData));
    } else {
      console.error(`Access failed: ${statsRes.status} ${statsRes.statusText}`);
      const text = await statsRes.text();
      console.error("Response:", text);
    }
  } catch (error) {
    console.error("Test failed with error:", error);
  }
}

testLoginAndAccess();
