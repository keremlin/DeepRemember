/**
 * playlistService.js - API service for playlist management
 * Handles playlist operations like loading, playing, and deleting files
 */

const playlistService = {
    /**
     * Load playlist from server
     * @returns {Promise<Object>} Playlist data
     */
    async loadPlaylist() {
        try {
            const response = await fetch('/files-list');
            
            if (!response.ok) {
                throw new Error(`Playlist API error: ${response.status}`);
            }
            
            const data = await response.json();
            return {
                success: true,
                playlist: data.playlist || [],
                ...data
            };
        } catch (error) {
            console.error('Playlist service error:', error);
            return {
                success: false,
                playlist: [],
                error: error.message
            };
        }
    },

    /**
     * Delete files from playlist
     * @param {string} media - Media file name
     * @param {string} subtitle - Subtitle file name
     * @returns {Promise<Object>} Delete result
     */
    async deleteFiles(media, subtitle) {
        try {
            const response = await fetch('/delete-files', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ media, subtitle })
            });

            if (!response.ok) {
                throw new Error(`Delete API error: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Delete service error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Upload files to server
     * @param {FormData} formData - Form data with files
     * @returns {Promise<Object>} Upload result
     */
    async uploadFiles(formData) {
        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Upload API error: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Upload service error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
};

// Export for global access
window.playlistService = playlistService;