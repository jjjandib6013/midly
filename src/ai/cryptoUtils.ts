import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const raw = process.env.ENCRYPTION_KEY;
if (!raw || raw.length !== 64) {
    console.warn('[BOOT WARNING] ENCRYPTION_KEY is missing or invalid length. Falling back to dev key ONLY FOR LOCAL DEV.');
}
const ENCRYPTION_KEY = (raw && raw.length === 64) ? Buffer.from(raw, 'hex') : Buffer.from('12345678901234567890123456789012', 'utf-8');
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
