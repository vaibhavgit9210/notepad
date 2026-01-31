// Encryption utilities using Web Crypto API (AES-256-GCM)
class CryptoService {
    constructor() {
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
        this.iterations = 100000;
    }

    // Derive encryption key from password using PBKDF2
    async deriveKey(password, salt) {
        const encoder = new TextEncoder();
        const passwordBuffer = encoder.encode(password);

        const baseKey = await crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            'PBKDF2',
            false,
            ['deriveKey']
        );

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: this.iterations,
                hash: 'SHA-256'
            },
            baseKey,
            { name: this.algorithm, length: this.keyLength },
            false,
            ['encrypt', 'decrypt']
        );
    }

    // Encrypt data with password
    async encrypt(plaintext, password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(plaintext);

        // Generate random salt and IV
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));

        const key = await this.deriveKey(password, salt);

        const encrypted = await crypto.subtle.encrypt(
            { name: this.algorithm, iv: iv },
            key,
            data
        );

        // Combine salt + iv + ciphertext
        const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
        combined.set(salt, 0);
        combined.set(iv, salt.length);
        combined.set(new Uint8Array(encrypted), salt.length + iv.length);

        // Return as base64
        return btoa(String.fromCharCode(...combined));
    }

    // Decrypt data with password
    async decrypt(ciphertext, password) {
        try {
            // Decode base64
            const combined = new Uint8Array(
                atob(ciphertext).split('').map(c => c.charCodeAt(0))
            );

            // Extract salt, iv, and encrypted data
            const salt = combined.slice(0, 16);
            const iv = combined.slice(16, 28);
            const data = combined.slice(28);

            const key = await this.deriveKey(password, salt);

            const decrypted = await crypto.subtle.decrypt(
                { name: this.algorithm, iv: iv },
                key,
                data
            );

            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Decryption failed - incorrect password or corrupted data');
        }
    }

    // Check if data appears to be encrypted (base64 with minimum length)
    isEncrypted(data) {
        if (typeof data !== 'string') return false;
        // Encrypted data is base64 and has at least salt(16) + iv(12) + some data
        const minLength = Math.ceil((16 + 12 + 1) * 4 / 3);
        return data.length >= minLength && /^[A-Za-z0-9+/]+=*$/.test(data);
    }
}

const cryptoService = new CryptoService();
