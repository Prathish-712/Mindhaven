const http = require('http');
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:'; // Use in-memory DB for test isolation

const app = require('../server');

let server;
const PORT = 3999;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function request(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, body: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(`[Assertion Failed] ${message}`);
    }
}

async function runTests() {
    console.log('🚀 Starting MindCare Backend API Verification Suite...\n');

    server = app.listen(PORT);

    let testUserToken = '';
    let guestToken = '';
    let createdJournalId = null;
    let createdContactId = null;

    try {
        // 1. Health check
        console.log('Testing 1: GET /api/health');
        const health = await request('GET', '/api/health');
        assert(health.status === 200, 'Health status should be 200');
        assert(health.body.status === 'healthy', 'Health body should report healthy');
        console.log('✅ Health check passed.');

        // 2. Auth - Guest Login
        console.log('\nTesting 2: POST /api/auth/guest');
        const guestRes = await request('POST', '/api/auth/guest', {});
        assert(guestRes.status === 201, 'Guest response should be 201');
        assert(guestRes.body.token, 'Guest token should be present');
        assert(guestRes.body.user.is_guest === 1, 'User should be marked as guest');
        guestToken = guestRes.body.token;
        console.log('✅ Guest login passed.');

        // 3. Auth - User Registration
        console.log('\nTesting 3: POST /api/auth/register');
        const regRes = await request('POST', '/api/auth/register', {
            username: 'mindful_user',
            email: 'user@mindcare.example',
            password: 'password123',
            display_name: 'Mindful User'
        });
        assert(regRes.status === 201, 'Register response should be 201');
        assert(regRes.body.token, 'Register token should be returned');
        testUserToken = regRes.body.token;
        console.log('✅ User registration passed.');

        // 4. Auth - User Login
        console.log('\nTesting 4: POST /api/auth/login');
        const loginRes = await request('POST', '/api/auth/login', {
            usernameOrEmail: 'mindful_user',
            password: 'password123'
        });
        assert(loginRes.status === 200, 'Login response should be 200');
        assert(loginRes.body.user.username === 'mindful_user', 'Username should match');
        console.log('✅ User login passed.');

        // 5. Auth - Profile Me
        console.log('\nTesting 5: GET /api/auth/me');
        const meRes = await request('GET', '/api/auth/me', null, {
            Authorization: `Bearer ${testUserToken}`
        });
        assert(meRes.status === 200, 'Get profile should be 200');
        assert(meRes.body.stats !== undefined, 'Stats should be present in profile');
        console.log('✅ Profile me passed.');

        // 6. Chat - Initial Messages & Send Message
        console.log('\nTesting 6: GET /api/chat/messages and POST /api/chat/send');
        const initChat = await request('GET', '/api/chat/messages', null, {
            Authorization: `Bearer ${testUserToken}`
        });
        assert(initChat.status === 200, 'Chat messages should return 200');
        assert(initChat.body.messages.length > 0, 'Welcome message should exist');

        const sendChat = await request('POST', '/api/chat/send', {
            content: 'I have been feeling stressed with work lately.'
        }, {
            Authorization: `Bearer ${testUserToken}`
        });
        assert(sendChat.status === 200, 'Send chat should return 200');
        assert(sendChat.body.assistantMessage?.content, 'Assistant reply should be generated');
        assert(sendChat.body.isCrisis === false, 'Should not be flagged as crisis');
        console.log('✅ Chat support and empathetic response generation passed.');

        // 7. Safety Crisis Detection Check
        console.log('\nTesting 7: Safety crisis detection in Chat');
        const crisisChat = await request('POST', '/api/chat/send', {
            content: 'I want to kill myself'
        }, {
            Authorization: `Bearer ${testUserToken}`
        });
        assert(crisisChat.status === 200, 'Crisis chat should return 200');
        assert(crisisChat.body.isCrisis === true, 'Should be flagged as crisis');
        assert(crisisChat.body.assistantMessage.content.includes('988'), 'Should mention 988 Lifeline');
        console.log('✅ Safety crisis detection passed.');

        // 8. Journal - Prompts & CRUD
        console.log('\nTesting 8: Journal Prompts and CRUD operations');
        const promptsRes = await request('GET', '/api/journal/prompts');
        assert(promptsRes.status === 200, 'Prompts should return 200');
        assert(promptsRes.body.prompts.length > 0, 'Prompt list should not be empty');

        const createJournal = await request('POST', '/api/journal', {
            prompt: 'What made you smile today?',
            content: 'I took a peaceful morning walk and enjoyed the warm sunshine.',
            mood_tag: 'Joyful',
            tags: 'nature,morning,peace'
        }, {
            Authorization: `Bearer ${testUserToken}`
        });
        assert(createJournal.status === 201, 'Create journal should be 201');
        createdJournalId = createJournal.body.entry.id;

        const listJournal = await request('GET', '/api/journal?q=sunshine', null, {
            Authorization: `Bearer ${testUserToken}`
        });
        assert(listJournal.status === 200, 'List journal should be 200');
        assert(listJournal.body.entries.length === 1, 'Search query should find created entry');

        const updateJournal = await request('PUT', `/api/journal/${createdJournalId}`, {
            content: 'Updated reflection: Morning walk was truly restorative.'
        }, {
            Authorization: `Bearer ${testUserToken}`
        });
        assert(updateJournal.status === 200, 'Update journal should be 200');

        console.log('✅ Journal CRUD operations passed.');

        // 9. Mood - Log & Analytics
        console.log('\nTesting 9: Mood check-in and analytics');
        const logMoodRes = await request('POST', '/api/mood/logs', {
            mood_name: 'Content',
            mood_value: 4,
            note: 'Had a calm and productive afternoon.'
        }, {
            Authorization: `Bearer ${testUserToken}`
        });
        assert(logMoodRes.status === 201, 'Log mood should be 201');

        await request('POST', '/api/mood/logs', {
            mood_name: 'Joyful',
            mood_value: 5
        }, {
            Authorization: `Bearer ${testUserToken}`
        });

        const analyticsRes = await request('GET', '/api/mood/analytics', null, {
            Authorization: `Bearer ${testUserToken}`
        });
        assert(analyticsRes.status === 200, 'Mood analytics should return 200');
        assert(analyticsRes.body.analytics.totalCheckins === 2, 'Total check-ins should be 2');
        assert(analyticsRes.body.analytics.wellbeingScore === 4.5, 'Average score should be 4.5');
        console.log('✅ Mood logging & analytics passed.');

        // 10. Exercises - Catalog, Completion & Stats
        console.log('\nTesting 10: Wellness exercises catalog and completion tracking');
        const exercisesRes = await request('GET', '/api/exercises');
        assert(exercisesRes.status === 200, 'Exercises should return 200');
        assert(exercisesRes.body.exercises.length >= 6, 'Should have at least 6 default exercises');

        const completeRes = await request('POST', '/api/exercises/breathing/complete', {
            duration_spent_seconds: 240
        }, {
            Authorization: `Bearer ${testUserToken}`
        });
        assert(completeRes.status === 201, 'Complete exercise should return 201');

        const statsRes = await request('GET', '/api/exercises/stats', null, {
            Authorization: `Bearer ${testUserToken}`
        });
        assert(statsRes.status === 200, 'Stats should return 200');
        assert(statsRes.body.stats.totalCompletions >= 1, 'Total completions should be recorded');
        console.log('✅ Wellness exercises catalog & completion tracking passed.');

        // 11. Emergency - Resources & Personal Contacts
        console.log('\nTesting 11: Emergency resources and trusted contacts');
        const emergRes = await request('GET', '/api/emergency/resources');
        assert(emergRes.status === 200, 'Emergency resources should return 200');
        assert(emergRes.body.resources.length > 0, 'Hotline resources should exist');

        const addContact = await request('POST', '/api/emergency/contacts', {
            name: 'Dr. Sarah Smith',
            relationship: 'Therapist',
            phone: '555-0199'
        }, {
            Authorization: `Bearer ${testUserToken}`
        });
        assert(addContact.status === 201, 'Add contact should return 201');
        createdContactId = addContact.body.contact.id;

        const getContacts = await request('GET', '/api/emergency/contacts', null, {
            Authorization: `Bearer ${testUserToken}`
        });
        assert(getContacts.status === 200, 'Get contacts should return 200');
        assert(getContacts.body.contacts.length === 1, 'Should have 1 contact');

        const delContact = await request('DELETE', `/api/emergency/contacts/${createdContactId}`, null, {
            Authorization: `Bearer ${testUserToken}`
        });
        assert(delContact.status === 200, 'Delete contact should return 200');
        console.log('✅ Emergency resources & custom trusted contacts passed.');

        console.log('\n========================================================');
        console.log('🎉 ALL 11 API & DATABASE TEST SUITES PASSED PERFECTLY!');
        console.log('========================================================\n');
    } catch (err) {
        console.error('\n❌ Verification Failed:', err);
        process.exitCode = 1;
    } finally {
        if (server) {
            server.close();
        }
    }
}

runTests();
