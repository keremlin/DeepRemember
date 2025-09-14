/**
 * deepRememberService.js - API service for DeepRemember functionality
 * Handles card operations, reviews, and user management
 */

export const deepRememberService = {
    /**
     * Load user data
     * @param {string} userId - User ID
     * @returns {Promise<Object>} User data
     */
    async loadUserData(userId) {
        try {
            const response = await fetch(`/deepRemember/user/${userId}`);
            
            if (!response.ok) {
                throw new Error(`User data API error: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('User data service error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Load review cards for user
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Review cards data
     */
    async loadReviewCards(userId) {
        try {
            const response = await fetch(`/deepRemember/review/${userId}`);
            
            if (!response.ok) {
                throw new Error(`Review cards API error: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Review cards service error:', error);
            return {
                success: false,
                cards: [],
                error: error.message
            };
        }
    },

    /**
     * Answer a card (rate it)
     * @param {string} userId - User ID
     * @param {string} cardId - Card ID
     * @param {number} rating - Rating (1-5)
     * @returns {Promise<Object>} Answer result
     */
    async answerCard(userId, cardId, rating) {
        try {
            const response = await fetch('/deepRemember/answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, cardId, rating })
            });

            if (!response.ok) {
                throw new Error(`Answer API error: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Answer service error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Create a new card
     * @param {string} userId - User ID
     * @param {Object} cardData - Card data
     * @returns {Promise<Object>} Create result
     */
    async createCard(userId, cardData) {
        try {
            const response = await fetch('/deepRemember/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, ...cardData })
            });

            if (!response.ok) {
                throw new Error(`Create card API error: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Create card service error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Search for similar words
     * @param {string} userId - User ID
     * @param {string} query - Search query
     * @returns {Promise<Object>} Search result
     */
    async searchSimilarWords(userId, query) {
        try {
            const response = await fetch(`/deepRemember/search-similar/${userId}/${encodeURIComponent(query)}`);
            
            if (!response.ok) {
                throw new Error(`Search API error: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Search service error:', error);
            return {
                success: false,
                words: [],
                error: error.message
            };
        }
    }
};

export default deepRememberService;
