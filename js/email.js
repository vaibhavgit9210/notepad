// EmailJS Integration for Password Reset
class EmailService {
    constructor() {
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        // Load EmailJS SDK
        if (typeof emailjs === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
            script.onload = () => {
                emailjs.init(CONFIG.emailjs.publicKey);
                this.initialized = true;
            };
            document.head.appendChild(script);
        } else {
            emailjs.init(CONFIG.emailjs.publicKey);
            this.initialized = true;
        }
    }

    async sendResetCode(code) {
        if (!this.initialized) {
            // Wait for SDK to load
            await new Promise(resolve => {
                const check = setInterval(() => {
                    if (typeof emailjs !== 'undefined') {
                        clearInterval(check);
                        emailjs.init(CONFIG.emailjs.publicKey);
                        this.initialized = true;
                        resolve();
                    }
                }, 100);
            });
        }

        try {
            const response = await emailjs.send(
                CONFIG.emailjs.serviceId,
                CONFIG.emailjs.templateId,
                {
                    to_email: CONFIG.userEmail,
                    reset_code: code,
                    app_name: 'Notepad'
                }
            );

            if (response.status === 200) {
                return true;
            }
            throw new Error('Failed to send email');
        } catch (error) {
            console.error('Email error:', error);
            throw error;
        }
    }
}

const emailService = new EmailService();
