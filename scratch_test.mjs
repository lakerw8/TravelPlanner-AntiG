async function test() {
    try {
        console.log("Fetching google.com to verify DNS resolution...");
        const res = await fetch("https://www.google.com");
        console.log("Response status:", res.status);
    } catch (e) {
        console.error("Fetch to google.com failed:", e);
    }
}

test();
