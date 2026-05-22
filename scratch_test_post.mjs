async function run() {
    const tripId = "3d16ea03-0bb5-449a-8d50-9bee5a6df3a5";
    const place = {
        name: "Test Place " + Date.now(),
        googlePlaceId: "test-place-id-" + Date.now(),
        type: "restaurant",
        address: "123 Main St",
        lat: 35.6,
        lng: 139.7
    };
    
    console.log("Calling API to add place...");
    try {
        const res = await fetch(`http://localhost:3000/api/trips/${tripId}/places`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(place)
        });
        
        console.log("Response status:", res.status);
        const text = await res.text();
        console.log("Response body:", text);
    } catch (err) {
        console.error("Error:", err);
    }
}

run();
