import crypto from 'crypto';
import logger from './logger';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits
const TAG_LENGTH = 16; // 128 bits

// Get encryption key from environment or generate one
function getEncryptionKey(): Buffer {
  const keyString = process.env.ENCRYPTION_KEY;
  
  if (!keyString) {
    logger.warn('ENCRYPTION_KEY not set in environment variables. Using default key for development.');
    // In production, this should be a proper 256-bit key
    return crypto.scryptSync('default-encryption-key-change-in-production', 'salt', KEY_LENGTH);
  }
  
  // If key is provided as hex string
  if (keyString.length === KEY_LENGTH * 2) {
    return Buffer.from(keyString, 'hex');
  }
  
  // If key is provided as regular string, derive it
  return crypto.scryptSync(keyString, 'salt', KEY_LENGTH);
}

/**
 * Encrypt sensitive data using AES-256-GCM
 */
export function encrypt(text: string): string {
  if (!text) return '';
  
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from('ewelink-mcp', 'utf8'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine IV + tag + encrypted data
    const combined = iv.toString('hex') + tag.toString('hex') + encrypted;
    return combined;
  } catch (error: any) {
    logger.error('Encryption failed', { error: error.message });
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data using AES-256-GCM
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';
  
  try {
    const key = getEncryptionKey();
    
    // Extract IV, tag, and encrypted data
    const iv = Buffer.from(encryptedText.slice(0, IV_LENGTH * 2), 'hex');
    const tag = Buffer.from(encryptedText.slice(IV_LENGTH * 2, (IV_LENGTH + TAG_LENGTH) * 2), 'hex');
    const encrypted = encryptedText.slice((IV_LENGTH + TAG_LENGTH) * 2);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAAD(Buffer.from('ewelink-mcp', 'utf8'));
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error: any) {
    logger.error('Decryption failed', { error: error.message });
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Generate a secure encryption key for environment variables
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Hash password using bcrypt-compatible method
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(password, 12);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(password, hash);
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}
