import { seedAllDemoData } from "./server/seedAllDemoData";

async function main() {
    try {
        await seedAllDemoData();
        console.log("Seeding process finished.");
        process.exit(0);
    } catch (err) {
        console.error("Seeding failed:", err);
        process.exit(1);
    }
}

main();
