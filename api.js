/**
 * MindCare Frontend API Client
 * Manages JWT tokens, automatic guest sessions, and RESTful communication with backend
 */
const API_BASE = window.location.origin;

class MindCareAPI {
    constructor() {
        this.tokenKey = 'mindcare_token';
        this.userKey = 'mindcare_user';
        this.token = localStorage.getItem(this.tokenKey) || null;
        this.user = JSON.parse(localStorage.getItem(this.userKey) || 'null');
    }

    setSession(token, user) {
        this.token = token;
        this.user = user;
        if (token) {
            localStorage.setItem(this.tokenKey, token);
        } else {
            localStorage.removeItem(this.tokenKey);
        }
        if (user) {
            localStorage.setItem(this.userKey, JSON.stringify(user));
        } else {
            localStorage.removeItem(this.userKey);
        }
    }

    clearSession() {
        this.token = null;
        this.user = null;
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
    }

    isAuthenticated() {
        return !!this.token;
    }

    getUser() {
        return this.user;
    }

    async request(path, options = {}) {
        const url = `${API_BASE}${path}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                if (response.status === 401 && !path.includes('/auth/')) {
                    // Token expired or invalid - clear and trigger re-auth
                    this.clearSession();
                    window.dispatchEvent(new CustomEvent('mindcare:auth_required'));
                }
                throw new Error(data.error || `HTTP error ${response.status}`);
            }

            return data;
        } catch (err) {
            console.error(`API Error on ${path}:`, err.message);
            throw err;
        }
    }

    // --- Authentication ---
    async initSession() {
        if (this.token && this.user) {
            try {
                const res = await this.request('/api/auth/me');
                if (res.user) {
                    this.user = res.user;
                    localStorage.setItem(this.userKey, JSON.stringify(this.user));
                    return this.user;
                }
            } catch (e) {
                // If token invalid, proceed to guest login
            }
        }
        return await this.loginGuest();
    }

    async loginGuest() {
        const guestId = this.user?.is_guest ? this.user.id : undefined;
        const res = await this.request('/api/auth/guest', {
            method: 'POST',
            body: JSON.stringify({ guestId })
        });
        if (res.success && res.token) {
            this.setSession(res.token, res.user);
            return res.user;
        }
        throw new Error(res.error || 'Failed to initialize session.');
    }

    async login(usernameOrEmail, password) {
        const res = await this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ usernameOrEmail, password })
        });
        if (res.success && res.token) {
            this.setSession(res.token, res.user);
            return res.user;
        }
        throw new Error(res.error || 'Login failed.');
    }

    async register(username, email, password, display_name) {
        const res = await this.request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password, display_name })
        });
        if (res.success && res.token) {
            this.setSession(res.token, res.user);
            return res.user;
        }
        throw new Error(res.error || 'Registration failed.');
    }

    async getProfile() {
        return await this.request('/api/auth/me');
    }

    // --- Chat Support ---
    async getChatMessages() {
        return await this.request('/api/chat/messages');
    }

    async sendChatMessage(content) {
        return await this.request('/api/chat/send', {
            method: 'POST',
            body: JSON.stringify({ content })
        });
    }

    async clearChatMessages() {
        return await this.request('/api/chat/messages', {
            method: 'DELETE'
        });
    }

    // --- Daily Journal ---
    async getJournalEntries(searchQuery = '') {
        const path = searchQuery ? `/api/journal?q=${encodeURIComponent(searchQuery)}` : '/api/journal';
        return await this.request(path);
    }

    async createJournalEntry(prompt, content, mood_tag = null, tags = null) {
        return await this.request('/api/journal', {
            method: 'POST',
            body: JSON.stringify({ prompt, content, mood_tag, tags })
        });
    }

    async updateJournalEntry(id, prompt, content, mood_tag = null, tags = null) {
        return await this.request(`/api/journal/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ prompt, content, mood_tag, tags })
        });
    }

    async deleteJournalEntry(id) {
        return await this.request(`/api/journal/${id}`, {
            method: 'DELETE'
        });
    }

    async getJournalPrompts() {
        return await this.request('/api/journal/prompts');
    }

    // --- Mood Tracker ---
    async logMood(mood_name, mood_value, note = '') {
        return await this.request('/api/mood/logs', {
            method: 'POST',
            body: JSON.stringify({ mood_name, mood_value, note })
        });
    }

    async getMoodAnalytics() {
        return await this.request('/api/mood/analytics');
    }

    async deleteMoodLog(id) {
        return await this.request(`/api/mood/logs/${id}`, {
            method: 'DELETE'
        });
    }

    // --- Exercises ---
    async getExercises() {
        return await this.request('/api/exercises');
    }

    async getExerciseById(id) {
        return await this.request(`/api/exercises/${id}`);
    }

    async completeExercise(id, duration_spent_seconds = 0) {
        return await this.request(`/api/exercises/${id}/complete`, {
            method: 'POST',
            body: JSON.stringify({ duration_spent_seconds })
        });
    }

    async getExerciseStats() {
        return await this.request('/api/exercises/stats');
    }

    // --- Emergency & Contacts ---
    async getEmergencyResources() {
        return await this.request('/api/emergency/resources');
    }

    async getEmergencyContacts() {
        return await this.request('/api/emergency/contacts');
    }

    async addEmergencyContact(name, relationship, phone) {
        return await this.request('/api/emergency/contacts', {
            method: 'POST',
            body: JSON.stringify({ name, relationship, phone })
        });
    }

    async deleteEmergencyContact(id) {
        return await this.request(`/api/emergency/contacts/${id}`, {
            method: 'DELETE'
        });
    }
}

// Global API instance
window.mindcareApi = new MindCareAPI();
