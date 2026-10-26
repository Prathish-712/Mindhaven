const db = require('../config/database');

const CRISIS_RESOURCES = [
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

class EmergencyController {
    /**
     * Get global crisis hotlines & resources
     */
    async getResources(req, res, next) {
        try {
            return res.json({
                success: true,
                resources: CRISIS_RESOURCES
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Get user's personal emergency contacts
     */
    async getContacts(req, res, next) {
        try {
            const userId = req.user.id;
            const contacts = db.all(
                'SELECT id, name, relationship, phone, created_at FROM emergency_contacts WHERE user_id = ? ORDER BY created_at DESC',
                userId
            );

            return res.json({
                success: true,
                contacts
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Add personal emergency contact
     */
    async addContact(req, res, next) {
        try {
            const userId = req.user.id;
            const { name, relationship = 'Friend', phone } = req.body;

            if (!name || !phone) {
                return res.status(400).json({
                    success: false,
                    error: 'Contact name and phone number are required.'
                });
            }

            const insertRes = db.run(
                `INSERT INTO emergency_contacts (user_id, name, relationship, phone)
                 VALUES (?, ?, ?, ?)`,
                userId,
                name.trim(),
                relationship.trim(),
                phone.trim()
            );

            const newContact = db.get(
                'SELECT id, name, relationship, phone, created_at FROM emergency_contacts WHERE id = ?',
                insertRes.lastInsertRowid
            );

            return res.status(201).json({
                success: true,
                message: 'Emergency contact added successfully.',
                contact: newContact
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Delete personal emergency contact
     */
    async deleteContact(req, res, next) {
        try {
            const userId = req.user.id;
            const contactId = req.params.id;

            const result = db.run('DELETE FROM emergency_contacts WHERE id = ? AND user_id = ?', contactId, userId);

            if (result.changes === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Contact not found.'
                });
            }

            return res.json({
                success: true,
                message: 'Emergency contact removed.'
            });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new EmergencyController();
