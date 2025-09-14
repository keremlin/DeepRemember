/**
 * translationService.js - API service for translation functionality
 * Handles Ollama API calls for word translation
 */

const OLLAMA_BASE_URL = 'http://localhost:11434/api/generate';

const translationService = {
    /**
     * Translate a word using Ollama API
     * @param {string} word - Word to translate
     * @returns {Promise<Object>} Translation result
     */
    async translateWord(word) {
        try {
            const response = await fetch(OLLAMA_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama3.2',
                    prompt: `answer in this format {"translation":"string", "word":"realWord"} , what is the translation of "${word}"`,
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`Translation API error: ${response.status}`);
            }

            const data = await response.json();
            
            // Extract translation from response
            let translation = 'No translation found.';
            if (data.response) {
                try {
                    const match = data.response.match(/\{[^}]+\}/);
                    if (match) {
                        const parsed = JSON.parse(match[0]);
                        translation = parsed.translation || translation;
                    }
                } catch (e) {
                    console.warn('Failed to parse translation response:', e);
                }
            }
            
            return {
                success: true,
                translation,
                word
            };
        } catch (error) {
            console.error('Translation service error:', error);
            return {
                success: false,
                translation: 'Error fetching translation.',
                word,
                error: error.message
            };
        }
    },

    /**
     * Get detailed translation with sample sentences
     * @param {string} word - Word to translate
     * @returns {Promise<Object>} Detailed translation result
     */
    async getDetailedTranslation(word) {
        try {
            const response = await fetch('/deepRemember/translate-word', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word })
            });

            if (!response.ok) {
                throw new Error(`Detailed translation API error: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Detailed translation service error:', error);
            return {
                success: false,
                translation: 'Translation failed',
                sampleSentence: 'Please try again or enter manually',
                error: error.message
            };
        }
    }
};

// Export for global access
window.translationService = translationService;
