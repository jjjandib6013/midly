import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const raw = process.env.ENCRYPTION_KEY;
if (!raw || raw.length !== 64) {
    throw new Error('[BOOT FATAL] ENCRYPTION_KEY env var missing or wrong length. Server refused to start.');
}
const ENCRYPTION_KEY = Buffer.from(raw, 'hex');
const IV_LENGTH = 16;

export function encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(text: string): string {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts[0], 'hex');
    const authTag = Buffer.from(textParts[1], 'hex');
    const encryptedText = Buffer.from(textParts[2], 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

export function encryptForTrade(text: string, tradeId: number): string {
    const salt = `midly-trade-${tradeId}`;
    const derivedKey = crypto.scryptSync(ENCRYPTION_KEY, salt, 32);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
    let enc = cipher.update(text, 'utf8', 'hex');
    enc += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${enc}`;
}

export function decryptForTrade(text: string, tradeId: number): string {
    const salt = `midly-trade-${tradeId}`;
    const derivedKey = crypto.scryptSync(ENCRYPTION_KEY, salt, 32);
    const textParts = text.split(':');
    const iv = Buffer.from(textParts[0], 'hex');
    const authTag = Buffer.from(textParts[1], 'hex');
    const encryptedText = Buffer.from(textParts[2], 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}
