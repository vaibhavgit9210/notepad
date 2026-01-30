// Notepad Configuration
const CONFIG = {
    // GitHub Repository Settings (update after creating repo)
    github: {
        owner: 'vaibhavgit9210',             // Your GitHub username
        repo: 'notepad',                     // Repository name
        branch: 'main'
    },

    // File paths in repository
    paths: {
        notes: 'data/notes.json',
        settings: 'data/settings.json'
    },

    // EmailJS Configuration (for password reset)
    emailjs: {
        serviceId: 'service_tg0q9ay',        // EmailJS service ID
        templateId: 'template_s5aty7i',      // EmailJS template ID
        publicKey: '0nGU4xoWnC1R72Ku8'       // EmailJS public key
    },

    // User email for password recovery
    userEmail: 'vaibhavpro9210@gmail.com',

    // Security Settings
    security: {
        maxAttempts: 3,                      // Max password attempts
        lockoutMinutes: 60,                  // Lockout duration
        passwordLength: 6                    // Password length (digits only)
    },

    // Autosave Settings
    autosave: {
        enabled: true,
        debounceMs: 2000                     // Save after 2 seconds of inactivity
    }
};
