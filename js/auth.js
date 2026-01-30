// Authentication & Password Management
class Auth {
    constructor() {
        this.storageKeys = {
            passwordHash: 'notepad_password_hash',
            attempts: 'notepad_attempts',
            lockoutUntil: 'notepad_lockout_until',
            resetCode: 'notepad_reset_code',
            resetExpiry: 'notepad_reset_expiry'
        };
    }

    // Simple hash function for password (client-side only)
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + 'notepad_salt_2024');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Check if password is set
    hasPassword() {
        return !!localStorage.getItem(this.storageKeys.passwordHash);
    }

    // Set new password
    async setPassword(password) {
        if (!/^\d{6}$/.test(password)) {
            throw new Error('Password must be exactly 6 digits');
        }
        const hash = await this.hashPassword(password);
        localStorage.setItem(this.storageKeys.passwordHash, hash);
        this.clearAttempts();
    }

    // Verify password
    async verifyPassword(password) {
        const storedHash = localStorage.getItem(this.storageKeys.passwordHash);
        if (!storedHash) return false;

        const inputHash = await this.hashPassword(password);
        return inputHash === storedHash;
    }

    // Get remaining attempts
    getRemainingAttempts() {
        const attempts = parseInt(localStorage.getItem(this.storageKeys.attempts) || '0');
        return Math.max(0, CONFIG.security.maxAttempts - attempts);
    }

    // Record failed attempt
    recordFailedAttempt() {
        const attempts = parseInt(localStorage.getItem(this.storageKeys.attempts) || '0') + 1;
        localStorage.setItem(this.storageKeys.attempts, attempts.toString());

        if (attempts >= CONFIG.security.maxAttempts) {
            const lockoutUntil = Date.now() + (CONFIG.security.lockoutMinutes * 60 * 1000);
            localStorage.setItem(this.storageKeys.lockoutUntil, lockoutUntil.toString());
        }

        return this.getRemainingAttempts();
    }

    // Clear attempts after successful login
    clearAttempts() {
        localStorage.removeItem(this.storageKeys.attempts);
        localStorage.removeItem(this.storageKeys.lockoutUntil);
    }

    // Check if locked out
    isLockedOut() {
        const lockoutUntil = parseInt(localStorage.getItem(this.storageKeys.lockoutUntil) || '0');
        if (lockoutUntil && Date.now() < lockoutUntil) {
            return true;
        }
        if (lockoutUntil && Date.now() >= lockoutUntil) {
            this.clearAttempts();
        }
        return false;
    }

    // Get remaining lockout time in seconds
    getLockoutRemaining() {
        const lockoutUntil = parseInt(localStorage.getItem(this.storageKeys.lockoutUntil) || '0');
        if (!lockoutUntil) return 0;
        return Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
    }

    // Generate reset code
    generateResetCode() {
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();
        const expiry = Date.now() + (15 * 60 * 1000); // 15 minutes
        localStorage.setItem(this.storageKeys.resetCode, code);
        localStorage.setItem(this.storageKeys.resetExpiry, expiry.toString());
        return code;
    }

    // Verify reset code
    verifyResetCode(code) {
        const storedCode = localStorage.getItem(this.storageKeys.resetCode);
        const expiry = parseInt(localStorage.getItem(this.storageKeys.resetExpiry) || '0');

        if (!storedCode || !expiry) return false;
        if (Date.now() > expiry) {
            this.clearResetCode();
            return false;
        }

        return code.toUpperCase() === storedCode;
    }

    // Clear reset code
    clearResetCode() {
        localStorage.removeItem(this.storageKeys.resetCode);
        localStorage.removeItem(this.storageKeys.resetExpiry);
    }

    // Reset password with code
    async resetPassword(code, newPassword) {
        if (!this.verifyResetCode(code)) {
            throw new Error('Invalid or expired reset code');
        }

        await this.setPassword(newPassword);
        this.clearResetCode();
        this.clearAttempts();
    }
}

const auth = new Auth();
