const https = require('https');

class AIChatService {
    /**
     * Generate empathetic mental wellness response
     * @param {string} userMessage 
     * @param {Array} history 
     * @param {string} userName
     * @returns {Promise<{ reply: string, sentiment: string, isCrisis: boolean }>}
     */
    async generateResponse(userMessage, history = [], userName = 'friend') {
        const text = (userMessage || '').trim();
        const lower = text.toLowerCase();

        // 1. Safety & Crisis Detection (Highest Priority)
        const crisisPatterns = [
            'suicide', 'kill myself', 'end my life', 'want to die', 'end it all',
            'better off dead', 'hurt myself', 'hanging myself', 'cutting myself',
            'overdose', 'no reason to live'
        ];

        const isCrisis = crisisPatterns.some(pattern => lower.includes(pattern));
        if (isCrisis) {
            return {
                reply: `I hear how much pain you're carrying right now, and I want you to know that your life is deeply valuable. Please know you do not have to carry this alone.\n\n` +
                       `🆘 **Immediate Free & Confidential Crisis Support (24/7):**\n` +
                       `• **988 Suicide & Crisis Lifeline:** Call or text **988** • [Visit Official Website](https://988lifeline.org/) • [Live Web Chat](https://988lifeline.org/chat/)\n` +
                       `• **Crisis Text Line:** Text **HOME to 741741** • [Visit crisistextline.org](https://www.crisistextline.org/)\n` +
                       `• **The Trevor Project (LGBTQ+ Youth):** Call **1-866-488-7386** • [Visit thetrevorproject.org](https://www.thetrevorproject.org/)\n` +
                       `• **Veterans Crisis Line:** Call **988 (Press 1)** • [Visit veteranscrisisline.net](https://www.veteranscrisisline.net/)\n` +
                       `• **International Directory (130+ countries):** [findahelpline.com](https://findahelpline.com) & [befrienders.org](https://www.befrienders.org/)\n\n` +
                       `Please click any link above or reach out to a trusted contact right away. Help is always available.`,
                sentiment: 'crisis',
                isCrisis: true
            };
        }

        // 2. Try Gemini API if API key is provided
        if (process.env.GEMINI_API_KEY) {
            try {
                const geminiReply = await this.callGeminiAPI(userMessage, history, userName);
                if (geminiReply) {
                    return {
                        reply: geminiReply,
                        sentiment: this.detectSentiment(lower),
                        isCrisis: false
                    };
                }
            } catch (err) {
                console.warn('[AIChatService] Gemini API call failed, falling back to local wellness engine:', err.message);
            }
        }

        // 3. Empathetic Built-in Mental Wellness Conversational Engine
        const localReply = this.generateLocalWellnessResponse(text, lower, userName);
        return {
            reply: localReply,
            sentiment: this.detectSentiment(lower),
            isCrisis: false
        };
    }

    /**
     * Detect general sentiment category
     */
    detectSentiment(lower) {
        if (lower.includes('happy') || lower.includes('great') || lower.includes('grateful') || lower.includes('joy') || lower.includes('better')) {
            return 'positive';
        }
        if (lower.includes('anxious') || lower.includes('panic') || lower.includes('scared') || lower.includes('nervous')) {
            return 'anxious';
        }
        if (lower.includes('depressed') || lower.includes('sad') || lower.includes('hopeless') || lower.includes('crying') || lower.includes('alone')) {
            return 'sad';
        }
        if (lower.includes('stress') || lower.includes('overwhelmed') || lower.includes('tired') || lower.includes('burnt out')) {
            return 'stressed';
        }
        return 'neutral';
    }

    /**
     * Built-in intelligent empathetic wellness response generator
     */
    generateLocalWellnessResponse(text, lower, userName) {
        // Greetings & Introductions
        if (/^(hi|hello|hey|greetings|good morning|good evening|good afternoon)/.test(lower)) {
            return `Hello ${userName}! 🌿 I'm so glad you stopped by. Take a slow, deep breath. How are you feeling in your mind and body right now?`;
        }

        // Anxiety & Panic
        if (lower.includes('anxious') || lower.includes('anxiety') || lower.includes('panic') || lower.includes('racing heart') || lower.includes('worried') || lower.includes('fear') || lower.includes('nervous')) {
            return `Anxiety can feel so intense and uncomfortable in the body, but remember: you are safe right now, and this feeling will pass. 🌊\n\n` +
                   `Let's try a quick grounding exercise together:\n` +
                   `1. Plant both feet flat on the ground.\n` +
                   `2. Inhale slowly for 4 seconds, hold for 4, and exhale smoothly for 6.\n` +
                   `3. Name 3 things in your room you can see right now.\n\n` +
                   `You can also check the **Exercises** tab for the *5-4-3-2-1 Grounding Practice*. Would you like to tell me more about what's bringing up this worry?`;
        }

        // Depression, Sadness & Hopelessness
        if (lower.includes('depressed') || lower.includes('sad') || lower.includes('hopeless') || lower.includes('empty') || lower.includes('crying') || lower.includes('lonely') || lower.includes('down') || lower.includes('unhappy')) {
            return `I hear how heavy things feel right now, ${userName}. Your feelings are completely valid, and it's okay not to feel okay. 💜\n\n` +
                   `When everything feels cloudy, small steps matter most. Even just drinking a glass of water, wrapping yourself in a warm blanket, or typing these words is a meaningful act of self-care.\n\n` +
                   `Have you tried writing down some of these thoughts in the **Daily Journal** section? Getting them out of your head onto the page can often provide a little breathing room. I'm right here with you.`;
        }

        // Stress & Overwhelm
        if (lower.includes('stress') || lower.includes('overwhelmed') || lower.includes('too much') || lower.includes('busy') || lower.includes('burnout') || lower.includes('pressure') || lower.includes('exhausted')) {
            return `It sounds like you're carrying a very heavy cognitive load today. When everything demands our attention at once, our nervous system can go into overload. 🌱\n\n` +
                   `Let's gently pause for just one minute:\n` +
                   `• Drop your shoulders away from your ears.\n` +
                   `• Unclench your jaw.\n` +
                   `• What is **one single small thing** you can take off your plate today or postpone until tomorrow?\n\n` +
                   `Try our *Progressive Relaxation* in the Exercises section to release the tension stored in your muscles.`;
        }

        // Sleep & Insomnia
        if (lower.includes('sleep') || lower.includes('insomnia') || lower.includes('can\'t sleep') || lower.includes('nightmare') || lower.includes('awake') || lower.includes('tired')) {
            return `Sleep struggles can really drain our emotional energy and resilience. 🌙\n\n` +
                   `Here are a couple of gentle sleep cues that may help:\n` +
                   `• Dim the lights and avoid stimulating screens 30 minutes before resting.\n` +
                   `• Try the *Box Breathing* exercise: slow, equal breaths signal to your brain that it is safe to rest.\n` +
                   `• Write down a "worry dump" in the Daily Journal to get lingering thoughts out of your mind.\n\n` +
                   `Be gentle with yourself tonight. Rest is restorative even if sleep comes slowly.`;
        }

        // Positive, Gratitude & Good News
        if (lower.includes('happy') || lower.includes('great') || lower.includes('better') || lower.includes('good') || lower.includes('grateful') || lower.includes('accomplished') || lower.includes('proud') || lower.includes('awesome')) {
            return `That is wonderful to hear! ✨ Celebrating and savoring these bright moments helps wire our brains for optimism and resilience.\n\n` +
                   `What is one specific thing that contributed to this good feeling today? Don't forget to log a high mood check-in on the **Mood Tracker** to build your wellbeing history!`;
        }

        // Anger / Frustration
        if (lower.includes('angry') || lower.includes('mad') || lower.includes('frustrated') || lower.includes('annoyed') || lower.includes('irritated')) {
            return `Anger and frustration are natural protective emotions telling us that a boundary may have been crossed or something feels unfair. 🧘\n\n` +
                   `Take a moment to let the physical surge settle before reacting. Try a deep diaphragmatic exhale with a sigh. What do you think is underneath the frustration right now?`;
        }

        // Thank you
        if (lower.includes('thank') || lower.includes('thanks') || lower.includes('appreciate')) {
            return `You are so very welcome, ${userName}! 💛 I am always here to support your journey toward inner peace and wellbeing. Take good care of yourself today!`;
        }

        // Default open-ended empathetic reflection
        return `Thank you for sharing that with me, ${userName}. It takes vulnerability and courage to acknowledge our inner world. 🌸\n\n` +
               `Remember that wellbeing is not about being happy every second—it's about giving yourself compassion through all the seasons of life.\n\n` +
               `Would you like to try a guided calming exercise, reflect with a journal prompt, or explore more of what's on your mind?`;
    }

    /**
     * Optional Gemini API integration
     */
    async callGeminiAPI(prompt, history, userName) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return null;

        const systemPrompt = `You are MindCare AI, a compassionate, supportive, and empathetic mental wellness companion. 
Your purpose is to provide warm active listening, evidence-based coping techniques (CBT/mindfulness/grounding), and gentle encouragement.
Keep answers concise, warm, formatted with clean markdown, and easy to read (under 150 words unless providing an exercise).
Never diagnose medical conditions or prescribe medications. If the user mentions self-harm or suicide, provide crisis lifeline 988 immediately.
The user's display name is: ${userName}.`;

        const contents = [
            {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\nUser: ${prompt}` }]
            }
        ];

        const payload = JSON.stringify({
            contents: contents,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 300
            }
        });

        return new Promise((resolve, reject) => {
            const req = https.request({
                hostname: 'generativelanguage.googleapis.com',
                path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload)
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.candidates && parsed.candidates[0]?.content?.parts?.[0]?.text) {
                            resolve(parsed.candidates[0].content.parts[0].text.trim());
                        } else {
                            resolve(null);
                        }
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            req.on('error', (err) => reject(err));
            req.setTimeout(6000, () => {
                req.destroy();
                resolve(null);
            });

            req.write(payload);
            req.end();
        });
    }
}

module.exports = new AIChatService();
