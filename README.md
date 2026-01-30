# Notepad

A minimal, Swiss Design notepad with password protection.

## Setup

### 1. Create GitHub Repository

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/notepad.git
git push -u origin main
```

### 2. Enable GitHub Pages

1. Go to repo Settings > Pages
2. Source: Deploy from branch
3. Branch: main, / (root)
4. Save

### 3. Update Configuration

Edit `js/config.js`:

```javascript
github: {
    owner: 'YOUR_GITHUB_USERNAME',
    repo: 'notepad',
    branch: 'main'
}
```

### 4. Create GitHub Token

1. Go to https://github.com/settings/tokens/new
2. Name: "Notepad"
3. Select scope: `repo` (full control)
4. Generate and copy token

### 5. Setup EmailJS (for password reset)

1. Create account at https://www.emailjs.com
2. Add Gmail service (allow "Send email on your behalf")
3. Create email template with these variables:
   - `{{to_email}}` - Recipient
   - `{{reset_code}}` - The reset code
   - `{{app_name}}` - App name

**Template example:**

Subject: `{{app_name}} - Password Reset Code`

Body:
```
Your password reset code is: {{reset_code}}

This code expires in 15 minutes.

If you didn't request this, ignore this email.
```

4. Update `js/config.js` with:
   - `serviceId` - From Email Services
   - `templateId` - From Email Templates
   - `publicKey` - From Account > API Keys

## Features

- New, Save, Open notes
- 6-digit password protection
- 3 attempts, then 60-minute lockout
- Forgot password sends email reset
- Autosave on typing and page close
- Keyboard shortcuts: Ctrl+S, Ctrl+N, Ctrl+O

## Files

```
notepad/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── config.js
│   ├── github-api.js
│   ├── auth.js
│   ├── email.js
│   └── app.js
└── data/
    └── notes.json
```
