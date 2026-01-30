// GitHub API Handler
class GitHubAPI {
    constructor() {
        this.token = localStorage.getItem('notepad_github_token');
        this.baseUrl = 'https://api.github.com';
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('notepad_github_token', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('notepad_github_token');
    }

    hasToken() {
        return !!this.token;
    }

    async validateToken() {
        if (!this.token) return false;

        try {
            const response = await fetch(`${this.baseUrl}/user`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    async getFile(path) {
        const { owner, repo, branch } = CONFIG.github;
        const url = `${this.baseUrl}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;

        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.status === 404) {
                return null;
            }

            if (!response.ok) {
                throw new Error(`Failed to get file: ${response.status}`);
            }

            const data = await response.json();
            const content = atob(data.content.replace(/\n/g, ''));

            return {
                content: content,
                sha: data.sha
            };
        } catch (error) {
            console.error('Error getting file:', error);
            throw error;
        }
    }

    async saveFile(path, content, message, sha = null) {
        const { owner, repo, branch } = CONFIG.github;
        const url = `${this.baseUrl}/repos/${owner}/${repo}/contents/${path}`;

        const body = {
            message: message,
            content: btoa(unescape(encodeURIComponent(content))),
            branch: branch
        };

        if (sha) {
            body.sha = sha;
        }

        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `Failed to save file: ${response.status}`);
            }

            const data = await response.json();
            return data.content.sha;
        } catch (error) {
            console.error('Error saving file:', error);
            throw error;
        }
    }

    async deleteFile(path, message, sha) {
        const { owner, repo, branch } = CONFIG.github;
        const url = `${this.baseUrl}/repos/${owner}/${repo}/contents/${path}`;

        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    sha: sha,
                    branch: branch
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to delete file: ${response.status}`);
            }

            return true;
        } catch (error) {
            console.error('Error deleting file:', error);
            throw error;
        }
    }
}

const githubAPI = new GitHubAPI();
