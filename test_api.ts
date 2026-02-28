async function test() {
    try {
        const res = await fetch("http://localhost:5001/api/license/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                licenseKey: "LEMON-EDFFDB54-7B5EDF20",
                deviceId: "test"
            })
        });
        const text = await res.text();
        console.log("Status:", res.status);
        console.log("Response:", text);
    } catch (e: any) {
        console.error("Fetch failed:", e.message);
    }
}
test();
