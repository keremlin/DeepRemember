/**
 * main.jsx - Main entry point for React application
 * Initializes React and mounts components
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Initialize React components when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Mount SubtitleDisplay component if container exists
    const subtitleContainer = document.getElementById('subtitleDisplay');
    if (subtitleContainer) {
        const root = ReactDOM.createRoot(subtitleContainer);
        root.render(<App component="SubtitleDisplay" />);
    }

    // Mount PlaylistComponent if container exists
    const playlistContainer = document.getElementById('playlistSection');
    if (playlistContainer) {
        const root = ReactDOM.createRoot(playlistContainer);
        root.render(<App component="PlaylistComponent" />);
    }

    // Mount CardReviewComponent if container exists
    const reviewContainer = document.getElementById('reviewSection');
    if (reviewContainer) {
        const root = ReactDOM.createRoot(reviewContainer);
        root.render(<App component="CardReviewComponent" />);
    }

    // Mount CreateCardModal if container exists
    const modalContainer = document.getElementById('createCardModal');
    if (modalContainer) {
        const root = ReactDOM.createRoot(modalContainer);
        root.render(<App component="CreateCardModal" />);
    }
});

// Export for global access
window.ReactApp = {
    mount: (containerId, componentName, props = {}) => {
        const container = document.getElementById(containerId);
        if (container) {
            const root = ReactDOM.createRoot(container);
            root.render(<App component={componentName} {...props} />);
        }
    },
    unmount: (containerId) => {
        const container = document.getElementById(containerId);
        if (container) {
            ReactDOM.unmountComponentAtNode(container);
        }
    }
};
