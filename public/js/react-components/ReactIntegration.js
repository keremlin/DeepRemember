/**
 * ReactIntegration.js - Integration script for mounting React components
 * This script handles the hybrid approach by mounting React components into existing HTML
 */

// React Integration Helper
class ReactIntegration {
    constructor() {
        this.mountedComponents = new Map();
        this.isInitialized = false;
    }

    // Initialize React integration
    init() {
        if (this.isInitialized) return;
        
        // Wait for React to be available
        if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
            console.error('React or ReactDOM not loaded. Make sure to include React scripts.');
            return;
        }

        this.isInitialized = true;
        console.log('React Integration initialized');
    }

    // Mount a React component to a DOM element
    mountComponent(component, containerId, props = {}) {
        if (!this.isInitialized) {
            this.init();
        }

        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container with id "${containerId}" not found`);
            return null;
        }

        // Create a wrapper div for the React component
        const wrapper = document.createElement('div');
        wrapper.id = `${containerId}-react-wrapper`;
        container.appendChild(wrapper);

        // Mount the React component
        const root = ReactDOM.createRoot(wrapper);
        root.render(React.createElement(component, props));

        // Store reference for cleanup
        this.mountedComponents.set(containerId, { root, wrapper, component, props });

        return { root, wrapper };
    }

    // Update props of a mounted component
    updateComponent(containerId, newProps) {
        const mounted = this.mountedComponents.get(containerId);
        if (!mounted) {
            console.error(`No component mounted at "${containerId}"`);
            return;
        }

        const { root, component } = mounted;
        root.render(React.createElement(component, newProps));
        
        // Update stored props
        mounted.props = newProps;
    }

    // Unmount a React component
    unmountComponent(containerId) {
        const mounted = this.mountedComponents.get(containerId);
        if (!mounted) {
            console.error(`No component mounted at "${containerId}"`);
            return;
        }

        const { root, wrapper } = mounted;
        root.unmount();
        wrapper.remove();
        this.mountedComponents.delete(containerId);
    }

    // Unmount all components
    unmountAll() {
        for (const [containerId] of this.mountedComponents) {
            this.unmountComponent(containerId);
        }
    }

    // Get mounted component info
    getMountedComponent(containerId) {
        return this.mountedComponents.get(containerId);
    }

    // Check if component is mounted
    isMounted(containerId) {
        return this.mountedComponents.has(containerId);
    }
}

// Create global instance
window.ReactIntegration = new ReactIntegration();

// Helper function to mount components easily
window.mountReactComponent = (component, containerId, props) => {
    return window.ReactIntegration.mountComponent(component, containerId, props);
};

// Helper function to update component props
window.updateReactComponent = (containerId, props) => {
    return window.ReactIntegration.updateComponent(containerId, props);
};

// Helper function to unmount component
window.unmountReactComponent = (containerId) => {
    return window.ReactIntegration.unmountComponent(containerId);
};

console.log('React Integration script loaded');
