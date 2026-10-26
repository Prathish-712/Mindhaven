/**
 * MindCare Mental Wellness Companion - Client Application Logic
 * Integrates with Node.js Express backend and SQLite database
 */

// Application State
let currentUser = null;
let currentExercise = null;
let timerInterval = null;
let timerRemainingSeconds = 0;
let isTimerRunning = false;
let isTyping = false;

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.content-section');

// User Widget & Auth Elements
const userNameEl = document.getElementById('user-name');
const userStatusTagEl = document.getElementById('user-status-tag');
const userAvatarEl = document.getElementById('user-avatar');
const btnAuthToggle = document.getElementById('btn-auth-toggle');
const authModal = document.getElementById('auth-modal');
const closeAuthModal = document.getElementById('close-auth-modal');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');
const btnContinueGuest = document.getElementById('btn-continue-guest');

// Chat Elements
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');
const chatMessages = document.getElementById('chat-messages');
const btnClearChat = document.getElementById('btn-clear-chat');

// Journal Elements
const journalPrompt = document.getElementById('journal-prompt');
const newPromptBtn = document.getElementById('new-prompt');
const journalText = document.getElementById('journal-text');
const journalMoodTag = document.getElementById('journal-mood-tag');
const saveJournalBtn = document.getElementById('save-journal');
const clearJournalBtn = document.getElementById('clear-journal');
const journalSearch = document.getElementById('journal-search');
const journalList = document.getElementById('journal-list');

// Edit Journal Modal Elements
const editJournalModal = document.getElementById('edit-journal-modal');
const closeEditJournalModal = document.getElementById('close-edit-journal-modal');
const editJournalId = document.getElementById('edit-journal-id');
const editJournalPrompt = document.getElementById('edit-journal-prompt');
const editJournalText = document.getElementById('edit-journal-text');
const btnSaveEditJournal = document.getElementById('btn-save-edit-journal');
const btnCancelEditJournal = document.getElementById('btn-cancel-edit-journal');

// Mood Elements
const moodOptions = document.querySelectorAll('.mood-option');
const moodNoteInput = document.getElementById('mood-note-input');
const wellbeingScore = document.getElementById('wellbeing-score');
const totalCheckins = document.getElementById('total-checkins');
const totalExercisesCompleted = document.getElementById('total-exercises-completed');
const totalExercisesMinutes = document.getElementById('total-exercises-minutes');
const moodTimeline = document.getElementById('mood-timeline');

// Exercise Elements
const exercisesGrid = document.getElementById('exercises-grid');
const exerciseModal = document.getElementById('exercise-modal');
const closeModal = document.getElementById('close-modal');
const exerciseContent = document.getElementById('exercise-content');
const exerciseTimerDisplay = document.getElementById('exercise-timer-display');
const btnTimerToggle = document.getElementById('btn-timer-toggle');
const btnExerciseComplete = document.getElementById('btn-exercise-complete');

// Emergency & Contacts Elements
const addContactForm = document.getElementById('add-contact-form');
const contactNameInput = document.getElementById('contact-name');
const contactRelationInput = document.getElementById('contact-relation');
const contactPhoneInput = document.getElementById('contact-phone');
const trustedContactsList = document.getElementById('trusted-contacts-list');
const crisisResourcesList = document.getElementById('crisis-resources-list');
const crisisFilterBtns = document.querySelectorAll('.crisis-filter-btn');

let currentCrisisFilter = 'all';
let cachedCrisisResources = [];

// ==========================================================================
// Initialization & Authentication Lifecycle
// ==========================================================================
async function initApp() {
    try {
        currentUser = await window.mindcareApi.initSession();
        updateUserUI(currentUser);
    } catch (err) {
        console.warn('Session init error:', err);
        showToast('Running in local guest mode', 'info');
    }

    setupEventListeners();
    
    // Load initial section data
    loadChatMessages();
    loadJournalPrompts();
    loadJournalEntries();
    loadMoodAnalytics();
    loadExercises();
    loadEmergencyContacts();
    loadCrisisResources('all');
}

function updateUserUI(user) {
    if (!user) return;
    userNameEl.textContent = user.display_name || user.username || 'Friend';
    userAvatarEl.textContent = user.avatar || '🧘‍♀️';
    if (user.is_guest) {
        userStatusTagEl.textContent = 'Guest Mode (Click to Sign In)';
    } else {
        userStatusTagEl.textContent = `@${user.username} • Account Active`;
    }
}

function setupEventListeners() {
    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => switchSection(item.dataset.section));
    });

    // Auth Modal
    btnAuthToggle.addEventListener('click', () => openAuthModal());
    closeAuthModal.addEventListener('click', () => authModal.classList.remove('active'));
    tabLogin.addEventListener('click', () => switchAuthTab('login'));
    tabRegister.addEventListener('click', () => switchAuthTab('register'));

    formLogin.addEventListener('submit', handleLogin);
    formRegister.addEventListener('submit', handleRegister);
    btnContinueGuest.addEventListener('click', handleGuestLogin);

    // Chat
    chatSend.addEventListener('click', handleSendChatMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSendChatMessage();
        }
    });
    btnClearChat.addEventListener('click', handleClearChat);

    // Journal
    saveJournalBtn.addEventListener('click', handleSaveJournal);
    clearJournalBtn.addEventListener('click', () => { journalText.value = ''; });
    newPromptBtn.addEventListener('click', handleNewPrompt);
    journalSearch.addEventListener('input', debounce((e) => {
        loadJournalEntries(e.target.value);
    }, 300));

    // Edit Journal Modal
    closeEditJournalModal.addEventListener('click', () => editJournalModal.classList.remove('active'));
    btnCancelEditJournal.addEventListener('click', () => editJournalModal.classList.remove('active'));
    btnSaveEditJournal.addEventListener('click', handleSaveEditedJournal);

    // Mood Tracker
    moodOptions.forEach(btn => {
        btn.addEventListener('click', () => {
            handleLogMood(btn.dataset.mood, parseInt(btn.dataset.value));
        });
    });

    // Exercise Modal & Timers
    closeModal.addEventListener('click', closeExerciseModal);
    btnTimerToggle.addEventListener('click', toggleExerciseTimer);
    btnExerciseComplete.addEventListener('click', handleCompleteExercise);

    // Emergency Contacts & Crisis Filters
    addContactForm.addEventListener('submit', handleAddContact);
    crisisFilterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            crisisFilterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCrisisFilter = btn.dataset.filter || 'all';
            renderCrisisResources(cachedCrisisResources, currentCrisisFilter);
        });
    });

    // Modal background clicks
    [exerciseModal, authModal, editJournalModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    });
}

function switchSection(sectionName) {
    navItems.forEach(item => item.classList.remove('active'));
    sections.forEach(section => section.classList.remove('active'));
    
    const targetNav = document.querySelector(`[data-section="${sectionName}"]`);
    const targetSection = document.getElementById(`${sectionName}-section`);
    
    if (targetNav) targetNav.classList.add('active');
    if (targetSection) targetSection.classList.add('active');

    // Refresh section data when switching
    if (sectionName === 'journal') loadJournalEntries();
    if (sectionName === 'mood') loadMoodAnalytics();
    if (sectionName === 'exercises') loadExercises();
    if (sectionName === 'emergency') {
        loadEmergencyContacts();
        loadCrisisResources(currentCrisisFilter);
    }
}

// ==========================================================================
// Authentication Handling
// ==========================================================================
function openAuthModal() {
    authModal.classList.add('active');
}

function switchAuthTab(tab) {
    if (tab === 'login') {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        formLogin.classList.add('active');
        formRegister.classList.remove('active');
    } else {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        formRegister.classList.add('active');
        formLogin.classList.remove('active');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const usernameOrEmail = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    try {
        const user = await window.mindcareApi.login(usernameOrEmail, password);
        currentUser = user;
        updateUserUI(user);
        authModal.classList.remove('active');
        showToast(`Welcome back, ${user.display_name}! 🌿`, 'success');
        refreshAllData();
    } catch (err) {
        showToast(err.message || 'Login failed', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const displayName = document.getElementById('reg-name').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;

    try {
        const user = await window.mindcareApi.register(username, email, password, displayName);
        currentUser = user;
        updateUserUI(user);
        authModal.classList.remove('active');
        showToast(`Account created! Welcome to MindCare, ${displayName}! 🌟`, 'success');
        refreshAllData();
    } catch (err) {
        showToast(err.message || 'Registration failed', 'error');
    }
}

async function handleGuestLogin() {
    try {
        const user = await window.mindcareApi.loginGuest();
        currentUser = user;
        updateUserUI(user);
        authModal.classList.remove('active');
        showToast('Continuing as Guest.', 'info');
        refreshAllData();
    } catch (err) {
        showToast(err.message || 'Guest session error', 'error');
    }
}

function refreshAllData() {
    loadChatMessages();
    loadJournalEntries();
    loadMoodAnalytics();
    loadEmergencyContacts();
}

// ==========================================================================
// Chat Section
// ==========================================================================
async function loadChatMessages() {
    try {
        const res = await window.mindcareApi.getChatMessages();
        chatMessages.innerHTML = '';
        if (res.messages && res.messages.length > 0) {
            res.messages.forEach(msg => renderChatMessage(msg.role, msg.content, new Date(msg.created_at)));
        }
    } catch (err) {
        console.error('Failed to load chat:', err);
    }
}

function renderChatMessage(role, content, timestamp = new Date()) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    
    const text = document.createElement('div');
    text.className = 'message-text';
    text.innerHTML = formatMarkdown(content);
    
    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = formatTime(timestamp);
    
    bubble.appendChild(text);
    bubble.appendChild(time);
    messageDiv.appendChild(bubble);
    chatMessages.appendChild(messageDiv);
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function handleSendChatMessage() {
    const text = chatInput.value.trim();
    if (!text || isTyping) return;

    renderChatMessage('user', text);
    chatInput.value = '';
    showTyping();

    try {
        const res = await window.mindcareApi.sendChatMessage(text);
        hideTyping();
        if (res.assistantMessage) {
            renderChatMessage('assistant', res.assistantMessage.content, new Date(res.assistantMessage.created_at));
        }
        if (res.isCrisis) {
            showToast('Urgent Crisis Support Resources are displayed above.', 'error');
        }
    } catch (err) {
        hideTyping();
        showToast('Error communicating with MindCare assistant', 'error');
    }
}

async function handleClearChat() {
    if (!confirm('Are you sure you want to clear your conversation history?')) return;
    try {
        await window.mindcareApi.clearChatMessages();
        chatMessages.innerHTML = '';
        loadChatMessages();
        showToast('Chat history cleared', 'info');
    } catch (err) {
        showToast('Failed to clear chat', 'error');
    }
}

function showTyping() {
    isTyping = true;
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
        <div class="message-bubble">
            <div style="display: flex; gap: 6px; align-items: center; padding: 4px 8px;">
                <span style="font-size: 13px; color: #64748b;">MindCare is reflecting</span>
                <span class="status-dot" style="animation: pulse 1s infinite;"></span>
            </div>
        </div>
    `;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTyping() {
    isTyping = false;
    const typing = document.getElementById('typing-indicator');
    if (typing) typing.remove();
}

// ==========================================================================
// Daily Journal Section
// ==========================================================================
async function loadJournalPrompts() {
    try {
        const res = await window.mindcareApi.getJournalPrompts();
        if (res.prompt) {
            journalPrompt.textContent = res.prompt;
        }
    } catch (err) {
        console.error('Failed to load prompts:', err);
    }
}

async function handleNewPrompt() {
    await loadJournalPrompts();
}

async function loadJournalEntries(searchQuery = '') {
    try {
        const res = await window.mindcareApi.getJournalEntries(searchQuery);
        if (!res.entries || res.entries.length === 0) {
            journalList.innerHTML = `<p class="no-entries">${searchQuery ? 'No matching entries found.' : 'No entries yet. Start writing above to save your first reflection!'}</p>`;
            return;
        }

        journalList.innerHTML = '';
        res.entries.forEach(entry => {
            const item = document.createElement('div');
            item.className = 'journal-item';
            item.innerHTML = `
                <div class="journal-item-header">
                    <div>
                        <span class="journal-item-title">${escapeHtml(entry.prompt || 'Reflection')}</span>
                        ${entry.mood_tag ? `<span class="journal-tag-badge">${escapeHtml(entry.mood_tag)}</span>` : ''}
                    </div>
                    <div class="journal-item-controls">
                        <span class="journal-date">${formatDate(new Date(entry.created_at))}</span>
                        <button class="btn-action edit" onclick="openEditJournal(${entry.id}, '${escapeQuote(entry.prompt)}', '${escapeQuote(entry.content)}')">✏️</button>
                        <button class="btn-action delete" onclick="deleteJournal(${entry.id})">🗑️</button>
                    </div>
                </div>
                <p class="journal-item-text">${escapeHtml(entry.content)}</p>
            `;
            journalList.appendChild(item);
        });
    } catch (err) {
        journalList.innerHTML = '<p class="no-entries">Could not load journal entries from server.</p>';
    }
}

async function handleSaveJournal() {
    const content = journalText.value.trim();
    if (!content) {
        showToast('Please write some thoughts before saving.', 'error');
        return;
    }

    const prompt = journalPrompt.textContent;
    const moodTag = journalMoodTag.value;

    try {
        await window.mindcareApi.createJournalEntry(prompt, content, moodTag);
        journalText.value = '';
        showToast('Journal entry safely saved to database! 📝', 'success');
        loadJournalEntries();
    } catch (err) {
        showToast(err.message || 'Failed to save journal entry', 'error');
    }
}

window.deleteJournal = async function(id) {
    if (!confirm('Are you sure you want to delete this journal entry?')) return;
    try {
        await window.mindcareApi.deleteJournalEntry(id);
        showToast('Journal entry deleted.', 'info');
        loadJournalEntries(journalSearch.value);
    } catch (err) {
        showToast('Failed to delete entry', 'error');
    }
};

window.openEditJournal = function(id, prompt, content) {
    editJournalId.value = id;
    editJournalPrompt.value = prompt;
    editJournalText.value = content;
    editJournalModal.classList.add('active');
};

async function handleSaveEditedJournal() {
    const id = editJournalId.value;
    const prompt = editJournalPrompt.value.trim();
    const content = editJournalText.value.trim();

    if (!content) {
        showToast('Content cannot be empty', 'error');
        return;
    }

    try {
        await window.mindcareApi.updateJournalEntry(id, prompt, content);
        editJournalModal.classList.remove('active');
        showToast('Journal entry updated!', 'success');
        loadJournalEntries(journalSearch.value);
    } catch (err) {
        showToast('Failed to update journal entry', 'error');
    }
}

// ==========================================================================
// Mood Tracker Section
// ==========================================================================
async function handleLogMood(moodName, moodValue) {
    const note = moodNoteInput.value.trim();
    try {
        const res = await window.mindcareApi.logMood(moodName, moodValue, note);
        moodNoteInput.value = '';
        showToast(`Logged mood: ${moodName} 😊`, 'success');
        
        if (res.supportiveMessage) {
            renderChatMessage('assistant', res.supportiveMessage);
        }

        loadMoodAnalytics();
    } catch (err) {
        showToast('Failed to log mood', 'error');
    }
}

async function loadMoodAnalytics() {
    try {
        const res = await window.mindcareApi.getMoodAnalytics();
        if (res.analytics) {
            const { wellbeingScore: score, totalCheckins: total, recentTimeline } = res.analytics;
            wellbeingScore.textContent = score > 0 ? score.toFixed(1) : '0.0';
            totalCheckins.textContent = total;

            // Render Timeline
            if (!recentTimeline || recentTimeline.length === 0) {
                moodTimeline.innerHTML = '<p class="no-entries">Log your first mood to see your progress history!</p>';
            } else {
                moodTimeline.innerHTML = '';
                recentTimeline.forEach(entry => {
                    const item = document.createElement('div');
                    item.className = 'mood-timeline-item';
                    item.innerHTML = `
                        <div>
                            <span style="font-weight: 600; color: #1e293b;">${escapeHtml(entry.mood_name)}</span>
                            <span class="mood-score-badge">(${entry.mood_value}/5)</span>
                            ${entry.note ? `<div style="font-size: 13px; color: #64748b; margin-top: 2px;">"${escapeHtml(entry.note)}"</div>` : ''}
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="color: #94a3b8; font-size: 12px;">${formatDate(new Date(entry.logged_at))}</span>
                            <button class="btn-action delete" onclick="deleteMood(${entry.id})">🗑️</button>
                        </div>
                    `;
                    moodTimeline.appendChild(item);
                });
            }
        }

        // Also fetch exercise stats
        const statsRes = await window.mindcareApi.getExerciseStats();
        if (statsRes.stats) {
            totalExercisesCompleted.textContent = statsRes.stats.totalCompletions;
            totalExercisesMinutes.textContent = `${statsRes.stats.totalMinutes} minutes practiced`;
        }
    } catch (err) {
        console.error('Failed to load mood analytics:', err);
    }
}

window.deleteMood = async function(id) {
    try {
        await window.mindcareApi.deleteMoodLog(id);
        showToast('Mood check-in deleted', 'info');
        loadMoodAnalytics();
    } catch (err) {
        showToast('Failed to delete mood log', 'error');
    }
};

// ==========================================================================
// Wellness Exercises Section
// ==========================================================================
async function loadExercises() {
    try {
        const res = await window.mindcareApi.getExercises();
        if (res.exercises && res.exercises.length > 0) {
            exercisesGrid.innerHTML = '';
            res.exercises.forEach(ex => {
                const card = document.createElement('div');
                card.className = 'exercise-card';
                card.innerHTML = `
                    <div class="exercise-icon">${ex.icon || '🌱'}</div>
                    <span class="exercise-category-tag">${escapeHtml(ex.category)} • ${Math.round(ex.duration_seconds / 60)} min</span>
                    <h3>${escapeHtml(ex.title)}</h3>
                    <p>${escapeHtml(ex.description)}</p>
                    <button class="btn-primary" onclick="openExerciseModal('${ex.id}')">Start Practice</button>
                `;
                exercisesGrid.appendChild(card);
            });
        }
    } catch (err) {
        exercisesGrid.innerHTML = '<p class="no-entries">Could not load exercises.</p>';
    }
}

window.openExerciseModal = async function(exerciseId) {
    try {
        const res = await window.mindcareApi.getExerciseById(exerciseId);
        if (res.exercise) {
            currentExercise = res.exercise;
            exerciseContent.innerHTML = res.exercise.content_html;
            timerRemainingSeconds = res.exercise.duration_seconds || 300;
            updateTimerDisplay();
            resetTimer();
            exerciseModal.classList.add('active');
        }
    } catch (err) {
        showToast('Failed to load exercise content', 'error');
    }
};

function closeExerciseModal() {
    resetTimer();
    exerciseModal.classList.remove('active');
}

function updateTimerDisplay() {
    const mins = Math.floor(timerRemainingSeconds / 60);
    const secs = timerRemainingSeconds % 60;
    exerciseTimerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function toggleExerciseTimer() {
    if (isTimerRunning) {
        clearInterval(timerInterval);
        isTimerRunning = false;
        btnTimerToggle.textContent = '▶ Resume Timer';
    } else {
        isTimerRunning = true;
        btnTimerToggle.textContent = '⏸ Pause Timer';
        timerInterval = setInterval(() => {
            if (timerRemainingSeconds > 0) {
                timerRemainingSeconds--;
                updateTimerDisplay();
            } else {
                clearInterval(timerInterval);
                isTimerRunning = false;
                btnTimerToggle.textContent = '▶ Completed';
                showToast('Exercise timer complete! Great job! 🎉', 'success');
            }
        }, 1000);
    }
}

function resetTimer() {
    if (timerInterval) clearInterval(timerInterval);
    isTimerRunning = false;
    btnTimerToggle.textContent = '▶ Start Timer';
}

async function handleCompleteExercise() {
    if (!currentExercise) return;
    try {
        const duration = currentExercise.duration_seconds || 300;
        await window.mindcareApi.completeExercise(currentExercise.id, duration);
        showToast(`🎉 Completed: "${currentExercise.title}" saved to your wellness record!`, 'success');
        closeExerciseModal();
        loadMoodAnalytics();
    } catch (err) {
        showToast('Failed to record completion', 'error');
    }
}

// ==========================================================================
// Emergency Contacts & Verified Crisis Resources Section
// ==========================================================================
const DEFAULT_CRISIS_RESOURCES = [
    {
        id: 'lifeline-988',
        name: '988 Suicide & Crisis Lifeline',
        number: 'Call or Text 988',
        description: '24/7 free and confidential support for people in distress, suicidal crisis, or mental health-related distress.',
        actionType: 'call',
        actionUrl: 'tel:988',
        websiteUrl: 'https://988lifeline.org/',
        chatUrl: 'https://988lifeline.org/chat/',
        badge: '24/7 Crisis',
        isPrimary: true,
        region: 'US & Canada'
    },
    {
        id: 'crisis-text-line',
        name: 'Crisis Text Line',
        number: 'Text HOME to 741741',
        description: 'Free, 24/7 high-quality text-based crisis intervention and mental health support with trained crisis counselors.',
        actionType: 'text',
        actionUrl: 'sms:741741?body=HOME',
        websiteUrl: 'https://www.crisistextline.org/',
        chatUrl: 'https://www.crisistextline.org/',
        badge: 'Text & Online',
        isPrimary: false,
        region: 'US, UK, Canada'
    },
    {
        id: 'samhsa-helpline',
        name: 'SAMHSA National Helpline',
        number: '1-800-662-4357',
        description: '365-day-a-year treatment referral and information service for individuals facing mental health and substance use disorders.',
        actionType: 'call',
        actionUrl: 'tel:18006624357',
        websiteUrl: 'https://www.samhsa.gov/find-help/national-helpline',
        chatUrl: 'https://www.samhsa.gov/find-help',
        badge: 'Referrals & Support',
        isPrimary: false,
        region: 'United States'
    },
    {
        id: 'trevor-project',
        name: 'The Trevor Project (LGBTQ+ Youth)',
        number: '1-866-488-7386',
        description: '24/7 confidential crisis intervention and suicide prevention services tailored specifically for LGBTQ+ young people.',
        actionType: 'call',
        actionUrl: 'tel:18664887386',
        websiteUrl: 'https://www.thetrevorproject.org/',
        chatUrl: 'https://www.thetrevorproject.org/get-help/',
        badge: 'LGBTQ+ Support',
        isPrimary: false,
        region: 'United States & Global'
    },
    {
        id: 'veterans-crisis',
        name: 'Veterans Crisis Line',
        number: '988 (Press 1) or Text 838255',
        description: '24/7 confidential crisis support for Veterans, active Service members, National Guard, Reserve, and their loved ones.',
        actionType: 'call',
        actionUrl: 'tel:988',
        websiteUrl: 'https://www.veteranscrisisline.net/',
        chatUrl: 'https://www.veteranscrisisline.net/get-help-now/chat/',
        badge: 'Veterans & Family',
        isPrimary: false,
        region: 'United States'
    },
    {
        id: 'find-a-helpline',
        name: 'Find A Helpline (Global 130+ Countries)',
        number: 'Worldwide Directory',
        description: 'Free, confidential support from local crisis centers across 130+ countries. Find phone, text, and chat services near you.',
        actionType: 'website',
        actionUrl: 'https://findahelpline.com/',
        websiteUrl: 'https://findahelpline.com/',
        chatUrl: 'https://findahelpline.com/',
        badge: 'Global / Worldwide',
        isPrimary: false,
        region: 'International'
    },
    {
        id: 'befrienders-worldwide',
        name: 'Befrienders Worldwide',
        number: 'Global Volunteer Network',
        description: 'Worldwide network offering emotional support and suicide prevention centers in 32 countries globally.',
        actionType: 'website',
        actionUrl: 'https://www.befrienders.org/',
        websiteUrl: 'https://www.befrienders.org/',
        chatUrl: 'https://www.befrienders.org/find-support-by-country',
        badge: 'Global Helpline',
        isPrimary: false,
        region: 'International'
    },
    {
        id: 'telemanas-india',
        name: 'Tele-MANAS & Kiran Helpline (India)',
        number: '14416 / 1800-891-4416',
        description: 'Government of India 24/7 comprehensive mental health tele-counseling service available in 20+ regional languages.',
        actionType: 'call',
        actionUrl: 'tel:14416',
        websiteUrl: 'https://telemanas.mohfw.gov.in/',
        chatUrl: 'https://telemanas.mohfw.gov.in/',
        badge: '24/7 India Govt',
        isPrimary: false,
        region: 'India'
    },
    {
        id: 'vandrevala-foundation',
        name: 'Vandrevala Foundation Helpline (India)',
        number: '+91 9999 666 555',
        description: 'Free 24/7 confidential mental health counseling and crisis support provided by experienced clinical psychologists.',
        actionType: 'call',
        actionUrl: 'tel:+919999666555',
        websiteUrl: 'https://www.vandrevalafoundation.com/',
        chatUrl: 'https://www.vandrevalafoundation.com/free-counseling',
        badge: 'Counseling India',
        isPrimary: false,
        region: 'India'
    }
];

async function loadCrisisResources(filter = 'all') {
    try {
        const res = await window.mindcareApi.getEmergencyResources();
        if (res && res.resources && res.resources.length > 0) {
            cachedCrisisResources = res.resources;
        } else {
            cachedCrisisResources = DEFAULT_CRISIS_RESOURCES;
        }
    } catch (err) {
        console.warn('Could not fetch online emergency resources, using verified defaults:', err);
        cachedCrisisResources = DEFAULT_CRISIS_RESOURCES;
    }
    renderCrisisResources(cachedCrisisResources, filter);
}

function renderCrisisResources(resources, filter = 'all') {
    if (!crisisResourcesList) return;

    let filtered = resources;
    if (filter === 'us') {
        filtered = resources.filter(r => (r.region && (r.region.includes('US') || r.region.includes('United States') || r.region.includes('Canada'))));
    } else if (filter === 'india') {
        filtered = resources.filter(r => (r.region && r.region.includes('India')));
    } else if (filter === 'global') {
        filtered = resources.filter(r => (r.region && (r.region.includes('International') || r.region.includes('Global'))));
    }

    if (!filtered || filtered.length === 0) {
        crisisResourcesList.innerHTML = '<p class="no-entries" style="grid-column: 1/-1;">No resources found matching this filter.</p>';
        return;
    }

    crisisResourcesList.innerHTML = '';
    filtered.forEach(res => {
        const card = document.createElement('div');
        card.className = `crisis-card ${res.isPrimary ? 'urgent' : ''}`;
        
        let icon = '📞';
        if (res.actionType === 'text') icon = '💬';
        if (res.region && res.region.includes('India')) icon = '🇮🇳';
        if (res.region && res.region.includes('International')) icon = '🌍';
        if (res.id === 'trevor-project') icon = '🌈';

        let domain = '';
        try {
            if (res.websiteUrl) {
                const parsedUrl = new URL(res.websiteUrl);
                domain = parsedUrl.hostname.replace('www.', '');
            }
        } catch (e) {
            domain = res.websiteUrl || '';
        }

        card.innerHTML = `
            <div class="crisis-card-header">
                <div class="crisis-icon">${icon}</div>
                <div class="crisis-badges">
                    <span class="crisis-badge ${res.isPrimary ? 'badge-urgent' : 'badge-info'}">${escapeHtml(res.badge || 'Verified')}</span>
                    ${res.region ? `<span class="crisis-region">${escapeHtml(res.region)}</span>` : ''}
                </div>
            </div>
            <h3>${escapeHtml(res.name)}</h3>
            <div class="crisis-number-row">
                <span class="crisis-number">${escapeHtml(res.number)}</span>
                ${res.actionUrl && res.actionUrl.startsWith('tel:') ? `
                    <button class="btn-copy-num" onclick="copyToClipboard('${escapeHtml(res.number.replace(/[^0-9+]/g, ''))}', '${escapeHtml(res.name)}')" title="Copy Phone Number">📋</button>
                ` : ''}
            </div>
            <p>${escapeHtml(res.description)}</p>
            
            ${res.websiteUrl ? `
                <div class="crisis-website-row">
                    <span class="verified-tag">Official Website:</span>
                    <a href="${escapeHtml(res.websiteUrl)}" target="_blank" rel="noopener noreferrer" class="website-link" title="Open ${escapeHtml(res.name)} Website in new tab">
                        ${escapeHtml(domain)} ↗
                    </a>
                </div>
            ` : ''}

            <div class="crisis-actions">
                ${res.websiteUrl ? `
                    <a href="${escapeHtml(res.websiteUrl)}" target="_blank" rel="noopener noreferrer" class="btn-website">
                        🌐 Official Website ↗
                    </a>
                ` : ''}
                ${res.chatUrl ? `
                    <a href="${escapeHtml(res.chatUrl)}" target="_blank" rel="noopener noreferrer" class="btn-chat">
                        💬 Live Web Chat ↗
                    </a>
                ` : ''}
                ${res.actionType === 'call' ? `
                    <a href="${escapeHtml(res.actionUrl)}" class="${res.isPrimary ? 'btn-urgent' : 'btn-secondary'}">
                        📞 Call Now
                    </a>
                ` : res.actionType === 'text' ? `
                    <a href="${escapeHtml(res.actionUrl)}" class="btn-secondary">
                        💬 Text Now
                    </a>
                ` : ''}
            </div>
        `;
        crisisResourcesList.appendChild(card);
    });
}

async function loadEmergencyContacts() {
    try {
        const res = await window.mindcareApi.getEmergencyContacts();
        if (!res.contacts || res.contacts.length === 0) {
            trustedContactsList.innerHTML = '<p class="no-entries" style="grid-column: 1/-1;">No trusted contacts added yet. Add a trusted friend, family member, or counselor above.</p>';
            return;
        }

        trustedContactsList.innerHTML = '';
        res.contacts.forEach(contact => {
            const card = document.createElement('div');
            card.className = 'contact-card';
            card.innerHTML = `
                <div class="contact-info">
                    <div class="contact-name">${escapeHtml(contact.name)}</div>
                    <div class="contact-relation">${escapeHtml(contact.relationship || 'Support Contact')}</div>
                    <div class="contact-links-row">
                        <a href="tel:${escapeHtml(contact.phone)}" class="contact-phone-link">📞 ${escapeHtml(contact.phone)}</a>
                        <button class="btn-copy-num small" onclick="copyToClipboard('${escapeHtml(contact.phone)}', '${escapeHtml(contact.name)}')" title="Copy Phone Number">📋</button>
                    </div>
                </div>
                <button class="btn-action delete" onclick="deleteContact(${contact.id})" title="Delete Contact">🗑️</button>
            `;
            trustedContactsList.appendChild(card);
        });
    } catch (err) {
        console.error('Failed to load contacts:', err);
    }
}

async function handleAddContact(e) {
    e.preventDefault();
    const name = contactNameInput.value.trim();
    const relation = contactRelationInput.value.trim() || 'Support Contact';
    const phone = contactPhoneInput.value.trim();

    if (!name || !phone) {
        showToast('Name and phone number are required', 'error');
        return;
    }

    try {
        await window.mindcareApi.addEmergencyContact(name, relation, phone);
        contactNameInput.value = '';
        contactRelationInput.value = '';
        contactPhoneInput.value = '';
        showToast('Personal trusted contact added! 🤝', 'success');
        loadEmergencyContacts();
    } catch (err) {
        showToast(err.message || 'Failed to add contact', 'error');
    }
}

window.deleteContact = async function(id) {
    if (!confirm('Remove this trusted contact?')) return;
    try {
        await window.mindcareApi.deleteEmergencyContact(id);
        showToast('Contact removed', 'info');
        loadEmergencyContacts();
    } catch (err) {
        showToast('Failed to delete contact', 'error');
    }
};

window.copyToClipboard = function(text, label = 'Contact') {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(`📋 Copied ${label} (${text}) to clipboard!`, 'success');
        }).catch(() => {
            fallbackCopy(text, label);
        });
    } else {
        fallbackCopy(text, label);
    }
};

function fallbackCopy(text, label) {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    showToast(`📋 Copied ${label} (${text}) to clipboard!`, 'success');
}

// ==========================================================================
// Toast Notification & Helper Functions
// ==========================================================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';
    
    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function formatMarkdown(text) {
    if (!text) return '';
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" style="color: #6366f1; text-decoration: underline;">$1</a>')
        .replace(/\n/g, '<br/>');
}

function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date) {
    return date.toLocaleDateString() + ' ' + formatTime(date);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeQuote(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, ' ');
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Start application
document.addEventListener('DOMContentLoaded', initApp);