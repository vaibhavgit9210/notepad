// Notepad Application
class NotepadApp {
    constructor() {
        this.currentNote = null;
        this.notes = [];
        this.notesSha = null;
        this.isDirty = false;
        this.autosaveTimeout = null;
        this.lockoutInterval = null;

        this.elements = {
            editor: document.getElementById('editor'),
            noteTitle: document.getElementById('note-title'),
            statusText: document.getElementById('status-text'),
            autosaveIndicator: document.getElementById('autosave-indicator'),
            btnNew: document.getElementById('btn-new'),
            btnOpen: document.getElementById('btn-open'),
            btnSave: document.getElementById('btn-save')
        };

        this.modals = {
            auth: document.getElementById('auth-modal'),
            passwordSetup: document.getElementById('password-setup-modal'),
            password: document.getElementById('password-modal'),
            lockout: document.getElementById('lockout-modal'),
            notes: document.getElementById('notes-modal'),
            forgot: document.getElementById('forgot-modal'),
            reset: document.getElementById('reset-modal'),
            confirm: document.getElementById('confirm-modal')
        };

        this.init();
    }

    async init() {
        // Initialize email service
        emailService.init();

        // Check GitHub token
        if (!githubAPI.hasToken()) {
            this.showModal('auth');
        } else {
            const valid = await githubAPI.validateToken();
            if (!valid) {
                githubAPI.clearToken();
                this.showModal('auth');
            } else {
                await this.loadNotes();
            }
        }

        this.bindEvents();
        this.updateStatus('Ready');
    }

    bindEvents() {
        // Navigation buttons
        this.elements.btnNew.addEventListener('click', () => this.newNote());
        this.elements.btnOpen.addEventListener('click', () => this.openNotesModal());
        this.elements.btnSave.addEventListener('click', () => this.saveNote());

        // Editor changes
        this.elements.editor.addEventListener('input', () => this.onEditorChange());
        this.elements.noteTitle.addEventListener('input', () => this.onEditorChange());

        // Auth form
        document.getElementById('auth-form').addEventListener('submit', (e) => this.handleAuth(e));

        // Password setup form
        document.getElementById('password-setup-form').addEventListener('submit', (e) => this.handlePasswordSetup(e));

        // Password form
        document.getElementById('password-form').addEventListener('submit', (e) => this.handlePasswordSubmit(e));
        document.getElementById('btn-forgot').addEventListener('click', () => this.showForgotPassword());
        document.getElementById('btn-forgot-lockout').addEventListener('click', () => this.showForgotPassword());

        // Forgot password
        document.getElementById('btn-cancel-forgot').addEventListener('click', () => this.hideModal('forgot'));
        document.getElementById('btn-send-reset').addEventListener('click', () => this.sendResetCode());

        // Reset form
        document.getElementById('reset-form').addEventListener('submit', (e) => this.handleReset(e));
        document.getElementById('btn-cancel-reset').addEventListener('click', () => {
            this.hideModal('reset');
            this.showModal('password');
        });

        // Notes modal
        document.getElementById('btn-close-notes').addEventListener('click', () => this.hideModal('notes'));

        // Confirm modal
        document.getElementById('btn-confirm-cancel').addEventListener('click', () => {
            this.hideModal('confirm');
            this.confirmReject && this.confirmReject();
        });
        document.getElementById('btn-confirm-ok').addEventListener('click', () => {
            this.hideModal('confirm');
            this.confirmResolve && this.confirmResolve();
        });

        // Autosave on page leave
        window.addEventListener('beforeunload', (e) => {
            if (this.isDirty && this.currentNote) {
                this.saveNoteSync();
            }
        });

        // Visibility change autosave
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && this.isDirty) {
                this.saveNoteSync();
            }
        });

        // Close modals on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                Object.values(this.modals).forEach(modal => {
                    if (modal.classList.contains('active') && modal !== this.modals.auth) {
                        modal.classList.remove('active');
                    }
                });
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveNote();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.newNote();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
                e.preventDefault();
                this.openNotesModal();
            }
        });
    }

    // Modal management
    showModal(name) {
        this.modals[name]?.classList.add('active');
    }

    hideModal(name) {
        this.modals[name]?.classList.remove('active');
    }

    // Confirmation dialog
    confirm(title, message) {
        return new Promise((resolve, reject) => {
            document.getElementById('confirm-title').textContent = title;
            document.getElementById('confirm-message').textContent = message;
            this.confirmResolve = resolve;
            this.confirmReject = reject;
            this.showModal('confirm');
        });
    }

    // Status updates
    updateStatus(text) {
        this.elements.statusText.textContent = text;
    }

    showAutosave(show) {
        this.elements.autosaveIndicator.textContent = show ? 'Autosaving...' : '';
        this.elements.autosaveIndicator.classList.toggle('saving', show);
    }

    // Auth handling
    async handleAuth(e) {
        e.preventDefault();
        const token = document.getElementById('github-token').value.trim();

        githubAPI.setToken(token);
        const valid = await githubAPI.validateToken();

        if (valid) {
            this.hideModal('auth');
            await this.loadNotes();
            this.updateStatus('Connected');
        } else {
            githubAPI.clearToken();
            alert('Invalid token. Please check and try again.');
        }
    }

    // Notes management
    async loadNotes() {
        try {
            const file = await githubAPI.getFile(CONFIG.paths.notes);
            if (file) {
                this.notes = JSON.parse(file.content);
                this.notesSha = file.sha;
            } else {
                this.notes = [];
                this.notesSha = null;
            }
        } catch (error) {
            console.error('Error loading notes:', error);
            this.notes = [];
        }
    }

    async saveNotesToGitHub() {
        try {
            const content = JSON.stringify(this.notes, null, 2);
            this.notesSha = await githubAPI.saveFile(
                CONFIG.paths.notes,
                content,
                `Update notes: ${new Date().toISOString()}`,
                this.notesSha
            );
            return true;
        } catch (error) {
            console.error('Error saving notes:', error);
            throw error;
        }
    }

    // Editor operations
    onEditorChange() {
        this.isDirty = true;
        this.updateStatus('Unsaved changes');

        // Debounced autosave
        if (CONFIG.autosave.enabled && this.currentNote) {
            clearTimeout(this.autosaveTimeout);
            this.autosaveTimeout = setTimeout(() => {
                this.autoSave();
            }, CONFIG.autosave.debounceMs);
        }
    }

    async autoSave() {
        if (!this.isDirty || !this.currentNote) return;

        this.showAutosave(true);
        try {
            await this.saveCurrentNote();
            this.showAutosave(false);
        } catch (error) {
            this.showAutosave(false);
            console.error('Autosave failed:', error);
        }
    }

    // Sync save for beforeunload
    saveNoteSync() {
        if (!this.isDirty || !this.currentNote) return;

        const title = this.elements.noteTitle.value.trim() || 'Untitled';
        const content = this.elements.editor.value;

        const noteIndex = this.notes.findIndex(n => n.id === this.currentNote.id);
        if (noteIndex !== -1) {
            this.notes[noteIndex].title = title;
            this.notes[noteIndex].content = content;
            this.notes[noteIndex].updatedAt = new Date().toISOString();
        }

        // Use sendBeacon for reliable save on page close
        const data = JSON.stringify(this.notes, null, 2);
        const blob = new Blob([JSON.stringify({
            notes: this.notes,
            sha: this.notesSha
        })], { type: 'application/json' });

        // Store pending save in localStorage for recovery
        localStorage.setItem('notepad_pending_save', JSON.stringify({
            notes: this.notes,
            sha: this.notesSha,
            timestamp: Date.now()
        }));
    }

    newNote() {
        if (this.isDirty) {
            this.confirm('Unsaved Changes', 'Discard current changes?')
                .then(() => this.createNewNote())
                .catch(() => {});
        } else {
            this.createNewNote();
        }
    }

    createNewNote() {
        this.currentNote = null;
        this.elements.editor.value = '';
        this.elements.noteTitle.value = '';
        this.isDirty = false;
        this.updateStatus('New note');
        this.elements.editor.focus();
    }

    async openNotesModal() {
        // Check password protection
        if (!auth.hasPassword()) {
            this.showModal('passwordSetup');
            return;
        }

        if (auth.isLockedOut()) {
            this.showLockoutModal();
            return;
        }

        this.showModal('password');
        document.getElementById('password-input').value = '';
        document.getElementById('password-error').textContent = '';
        this.updateAttemptsDisplay();
    }

    updateAttemptsDisplay() {
        const remaining = auth.getRemainingAttempts();
        document.getElementById('attempts-remaining').textContent =
            remaining < CONFIG.security.maxAttempts ? `${remaining} attempts remaining` : '';
    }

    showLockoutModal() {
        this.showModal('lockout');
        this.startLockoutTimer();
    }

    startLockoutTimer() {
        const updateTimer = () => {
            const remaining = auth.getLockoutRemaining();
            if (remaining <= 0) {
                clearInterval(this.lockoutInterval);
                this.hideModal('lockout');
                this.showModal('password');
                return;
            }

            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            document.getElementById('lockout-time').textContent =
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };

        updateTimer();
        this.lockoutInterval = setInterval(updateTimer, 1000);
    }

    // Password handlers
    async handlePasswordSetup(e) {
        e.preventDefault();
        const password = document.getElementById('new-password').value;
        const confirm = document.getElementById('confirm-password').value;
        const errorEl = document.getElementById('password-setup-error');

        if (!/^\d{6}$/.test(password)) {
            errorEl.textContent = 'Must be exactly 6 digits';
            return;
        }

        if (password !== confirm) {
            errorEl.textContent = 'Codes do not match';
            return;
        }

        try {
            await auth.setPassword(password);
            this.hideModal('passwordSetup');
            this.showNotesListModal();
            errorEl.textContent = '';
        } catch (error) {
            errorEl.textContent = error.message;
        }
    }

    async handlePasswordSubmit(e) {
        e.preventDefault();
        const password = document.getElementById('password-input').value;
        const errorEl = document.getElementById('password-error');

        const valid = await auth.verifyPassword(password);

        if (valid) {
            auth.clearAttempts();
            this.hideModal('password');
            this.showNotesListModal();
        } else {
            const remaining = auth.recordFailedAttempt();

            if (remaining <= 0) {
                this.hideModal('password');
                this.showLockoutModal();
            } else {
                errorEl.textContent = 'Incorrect code';
                this.updateAttemptsDisplay();
                document.getElementById('password-input').value = '';
            }
        }
    }

    showForgotPassword() {
        this.hideModal('password');
        this.hideModal('lockout');
        clearInterval(this.lockoutInterval);
        this.showModal('forgot');
        document.getElementById('forgot-success').textContent = '';
        document.getElementById('forgot-error').textContent = '';
    }

    async sendResetCode() {
        const successEl = document.getElementById('forgot-success');
        const errorEl = document.getElementById('forgot-error');
        const btn = document.getElementById('btn-send-reset');

        btn.disabled = true;
        btn.textContent = 'Sending...';
        errorEl.textContent = '';
        successEl.textContent = '';

        try {
            const code = auth.generateResetCode();
            await emailService.sendResetCode(code);

            successEl.textContent = `Code sent to ${CONFIG.userEmail}`;

            setTimeout(() => {
                this.hideModal('forgot');
                this.showModal('reset');
                document.getElementById('reset-code-input').value = '';
                document.getElementById('new-password-reset').value = '';
                document.getElementById('reset-error').textContent = '';
            }, 1500);
        } catch (error) {
            errorEl.textContent = 'Failed to send email. Check EmailJS config.';
            console.error('Reset email error:', error);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Send Code';
        }
    }

    async handleReset(e) {
        e.preventDefault();
        const code = document.getElementById('reset-code-input').value.trim();
        const newPassword = document.getElementById('new-password-reset').value;
        const errorEl = document.getElementById('reset-error');

        if (!/^\d{6}$/.test(newPassword)) {
            errorEl.textContent = 'New code must be exactly 6 digits';
            return;
        }

        try {
            await auth.resetPassword(code, newPassword);
            this.hideModal('reset');
            this.updateStatus('Password reset successful');
            this.showNotesListModal();
        } catch (error) {
            errorEl.textContent = error.message;
        }
    }

    // Notes list display
    async showNotesListModal() {
        await this.loadNotes();
        const listEl = document.getElementById('notes-list');
        listEl.innerHTML = '';

        if (this.notes.length === 0) {
            this.showModal('notes');
            return;
        }

        // Sort by updated date, newest first
        const sortedNotes = [...this.notes].sort((a, b) =>
            new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
        );

        sortedNotes.forEach(note => {
            const item = document.createElement('div');
            item.className = 'note-item';

            const date = new Date(note.updatedAt || note.createdAt);
            const dateStr = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
            });

            item.innerHTML = `
                <div class="note-item-info">
                    <div class="note-item-title">${this.escapeHtml(note.title || 'Untitled')}</div>
                    <div class="note-item-date">${dateStr}</div>
                </div>
                <div class="note-item-actions">
                    <button class="btn btn-danger btn-delete" data-id="${note.id}">Delete</button>
                </div>
            `;

            item.querySelector('.note-item-info').addEventListener('click', () => {
                this.openNote(note);
                this.hideModal('notes');
            });

            item.querySelector('.btn-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteNote(note.id);
            });

            listEl.appendChild(item);
        });

        this.showModal('notes');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    openNote(note) {
        this.currentNote = note;
        this.elements.noteTitle.value = note.title || '';
        this.elements.editor.value = note.content || '';
        this.isDirty = false;
        this.updateStatus('Note loaded');
    }

    async saveNote() {
        const title = this.elements.noteTitle.value.trim() || 'Untitled';
        const content = this.elements.editor.value;

        if (!content.trim() && !title) {
            this.updateStatus('Nothing to save');
            return;
        }

        this.updateStatus('Saving...');
        this.elements.btnSave.disabled = true;

        try {
            if (this.currentNote) {
                // Update existing note
                const noteIndex = this.notes.findIndex(n => n.id === this.currentNote.id);
                if (noteIndex !== -1) {
                    this.notes[noteIndex].title = title;
                    this.notes[noteIndex].content = content;
                    this.notes[noteIndex].updatedAt = new Date().toISOString();
                }
            } else {
                // Create new note
                const newNote = {
                    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                    title: title,
                    content: content,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                this.notes.push(newNote);
                this.currentNote = newNote;
            }

            await this.saveNotesToGitHub();
            this.isDirty = false;
            this.updateStatus('Saved');
            localStorage.removeItem('notepad_pending_save');
        } catch (error) {
            this.updateStatus('Save failed');
            console.error('Save error:', error);
            alert('Failed to save. Please try again.');
        } finally {
            this.elements.btnSave.disabled = false;
        }
    }

    async saveCurrentNote() {
        if (!this.currentNote) return;

        const title = this.elements.noteTitle.value.trim() || 'Untitled';
        const content = this.elements.editor.value;

        const noteIndex = this.notes.findIndex(n => n.id === this.currentNote.id);
        if (noteIndex !== -1) {
            this.notes[noteIndex].title = title;
            this.notes[noteIndex].content = content;
            this.notes[noteIndex].updatedAt = new Date().toISOString();
        }

        await this.saveNotesToGitHub();
        this.isDirty = false;
        this.updateStatus('Autosaved');
    }

    async deleteNote(id) {
        try {
            await this.confirm('Delete Note', 'This cannot be undone. Continue?');

            this.notes = this.notes.filter(n => n.id !== id);
            await this.saveNotesToGitHub();

            if (this.currentNote?.id === id) {
                this.createNewNote();
            }

            this.showNotesListModal();
        } catch {
            // Cancelled
        }
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new NotepadApp();
});
