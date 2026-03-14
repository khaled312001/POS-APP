import * as dotenv from 'dotenv';
dotenv.config();
import { whatsappService } from './server/whatsappService';

async function testWhatsApp() {
    console.log("Starting WhatsApp Service Test...");

    console.log("Connecting...");
    const connResult = await whatsappService.connect();
    console.log("Connection Result:", connResult);

    // Wait for the connection phase to reach ready state
    console.log("Waiting for connection to fully stabilize...");
    let waitCount = 0;
    while (whatsappService.getStatus().status !== 'connected' && waitCount < 30) {
        await new Promise(r => setTimeout(r, 1000));
        waitCount++;
        const status = whatsappService.getStatus();
        console.log(`Current Status: ${status.status}, Phase: ${status.lastError ? "Error: " + status.lastError : 'Connecting...'}`);
        if (status.status === 'qr_ready') {
            console.log("QR Code is ready, please scan to login.");
            console.log("QR Base64:", whatsappService.getQrCode());
            // Can't auto test if QR is needed
            break;
        }
    }

    if (whatsappService.getStatus().status === 'connected') {
        const testPhone = "201204593124"; // Admin phone
        console.log(`Sending test message to: ${testPhone}`);
        const sendResult = await whatsappService.sendText(
            testPhone,
            "🧪 *Direct Test Message*\n\nThis is a test from the Barmagly POS debugging script."
        );
        console.log("Send Result:", sendResult);
    } else {
        console.log("Failed to reach 'connected' status within the timeout. Current status:", whatsappService.getStatus().status);
    }

    console.log("Finished script.");
    process.exit(0);
}

testWhatsApp().catch(e => {
    console.error("Fatal error:", e);
    process.exit(1);
});
