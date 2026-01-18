

async function test() {
    try {
        console.log("Logging in...");
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@company.com', password: 'password123' })
        });

        if (!loginRes.ok) {
            console.error("Login failed status:", loginRes.status);
            console.error("Login failed body:", await loginRes.text());
            return;
        }

        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log("Got token.");

        console.log("Fetching Inventory...");
        const invRes = await fetch('http://localhost:5000/api/inventory', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log(`Inventory Status: ${invRes.status} ${invRes.statusText}`);
        if (!invRes.ok) {
            console.log("Error Body:", await invRes.text());
        } else {
            const data = await invRes.json();
            console.log(`Success! Retrieved ${data.length} items.`);
        }

    } catch (e) {
        console.error("Test failed:", e);
    }
}

test();
