import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

let pubClient: any = null;
let subClient: any = null;

if (process.env.REDIS_URL) {
    let cleanUrl = process.env.REDIS_URL;
    if (cleanUrl.endsWith(':')) cleanUrl = cleanUrl.slice(0, -1);
    
    pubClient = createClient({ url: cleanUrl });
    subClient = pubClient.duplicate();
    
    Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
        console.log("Redis Pub/Sub Adapter securely activated for Distributed WebSockets.");
    }).catch(err => {
        console.error("Failed to connect Redis for WebSockets", err);
    });
}

export { pubClient, subClient };
