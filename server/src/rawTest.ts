
import { Client } from 'pg';
import 'dotenv/config';

async function testConnection() {
    console.log('--- RAW DB CONNECTION TEST ---');
    console.log('URL:', process.env.DATABASE_URL?.replace(/:[^:]+@/, ':****@'));

    const url = process.env.DATABASE_URL;
    const urlWith443 = url?.replace(':5432', ':443') || url + ':443';

    console.log('Trying Port 443 fallback...');
    const client443 = new Client({
        connectionString: urlWith443,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('Connecting via port 443...');
        await client443.connect();
        console.log('SUCCESS: Connection on Port 443 established!');
        await client443.end();
        return;
    } catch (err: any) {
        console.warn('Port 443 failed:', err.message);
    }

    const client = new Client({
        connectionString: url,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('Connecting via node-postgres (pg)...');
        await client.connect();
        console.log('SUCCESS: Raw connection established!');

        const res = await client.query('SELECT NOW(), version()');
        console.log('QUERY SUCCESS:', res.rows[0]);

        await client.end();
    } catch (err: any) {
        console.error('FAILURE: Raw connection failed!');
        console.error('Error Name:', err.name);
        console.error('Error Code:', err.code);
        console.error('Message:', err.message);
    }
}

testConnection();
