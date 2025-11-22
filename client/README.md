# DeepRemember Client

A React-based web application for language learning through spaced repetition flashcards and multimedia content. The client provides an intuitive interface for managing flashcards, reviewing vocabulary, and learning from audio/video content with subtitle support.

## Overview

DeepRemember Client is the frontend application for the DeepRemember learning platform. It implements a spaced repetition system (SRS) for efficient vocabulary retention, combined with multimedia playback capabilities for immersive language learning. The application features user authentication, flashcard management, review sessions, and an integrated media player.

## Features

### Core Functionality

- **Spaced Repetition System (SRS)**: Intelligent flashcard review scheduling based on user performance
- **Flashcard Management**: Create, edit, delete, and organize vocabulary cards with labels
- **Review Sessions**: Interactive card review with difficulty rating (1-5) affecting next review time
- **Dashboard View**: Statistics display showing total cards, due cards, learning cards, and review cards
- **Media Player**: Audio and video playback with subtitle support for contextual learning
- **File Upload**: Upload media files (audio/video) and generate subtitles automatically
- **User Authentication**: Secure login and registration with email confirmation
- **User Management**: Profile management and user administration features
- **Theme Support**: Light and dark theme switching
- **Toast Notifications**: User feedback for actions and errors

### Technical Features

- Modern React 19 with functional components and hooks
- Vite build tool for fast development and optimized production builds
- Component-based architecture with reusable UI elements
- Context API for global state management (authentication, theme, toasts)
- Responsive design with CSS3 styling
- API integration with centralized configuration
- Development proxy for seamless backend communication

## Project Structure

```
client/
├── public/                 # Static assets
├── dist/                  # Production build output
├── src/
│   ├── components/        # React components
│   │   ├── welcome/      # Welcome screen and navigation
│   │   ├── player/       # Media player and file upload
│   │   ├── security/     # Authentication components
│   │   ├── header/       # Header and navigation
│   │   ├── labels/       # Label management
│   │   ├── ManageCards/  # Card management interface
│   │   ├── ReviewSection/# Review and sample sentences
│   │   ├── users/        # User management
│   │   ├── management/   # Admin management
│   │   ├── DeepRemember.jsx    # Main SRS component
│   │   ├── DashboardView.jsx   # Card review dashboard
│   │   ├── AuthContext.jsx     # Authentication context
│   │   ├── ThemeContext.jsx    # Theme context
│   │   └── ToastProvider.jsx   # Toast notification system
│   ├── config/
│   │   └── api.js        # API configuration and utilities
│   ├── assets/           # Images and icons
│   ├── App.jsx           # Main application component
│   ├── App.css           # Application styles
│   ├── main.jsx          # Application entry point
│   └── index.css         # Global styles
├── package.json          # Dependencies and scripts
├── vite.config.js        # Vite configuration
├── API_CONFIGURATION.md  # API setup documentation
└── README.md            # This file
```

## Prerequisites

- Node.js version 14 or higher
- npm or yarn package manager
- Backend API server running (default: http://localhost:4004)

## Installation

1. Navigate to the client directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure API endpoint (optional):
   - For development: No configuration needed, uses Vite proxy
   - For production: Set `VITE_API_BASE_URL` environment variable or create `.env.production` file
   - See `API_CONFIGURATION.md` for detailed instructions

## Development

### Start Development Server

```bash
npm run dev
```

The development server will start on `http://localhost:9000` (configured in `vite.config.js`). The browser will open automatically.

### Development Features

- Hot Module Replacement (HMR) for instant updates
- Vite proxy configuration for API requests:
  - `/api` -> Backend API
  - `/deepRemember` -> DeepRemember endpoints
  - `/upload-files` -> File upload endpoint
  - `/files-list` -> File listing endpoint
  - `/files` -> File serving endpoint
  - `/voice` -> Voice/audio endpoint

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build production-ready application
- `npm run preview` - Preview production build locally

## API Configuration

The application uses a centralized API configuration located in `src/config/api.js`. This ensures consistent API endpoint handling across the application.

### Development Mode

In development, the Vite proxy automatically routes API requests to the backend server at `http://localhost:4004`. No additional configuration is required.

### Production Mode

For production builds, set the `VITE_API_BASE_URL` environment variable:

```bash
VITE_API_BASE_URL=https://api.yourdomain.com npm run build
```

Or create a `.env.production` file:

```
VITE_API_BASE_URL=https://api.yourdomain.com
```

The API configuration functions:
- `getApiBaseUrl()` - Returns the base URL for API requests
- `getApiUrl(endpoint)` - Returns the full URL for a specific endpoint

## Application Architecture

### Component Hierarchy

```
App
├── ThemeProvider
├── ToastProvider
├── AuthProvider
└── AuthWrapper
    └── View Router
        ├── Welcome (Home)
        ├── DeepRemember (SRS)
        ├── PlayerPage (Media Player)
        ├── UserManagement
        └── ManagementPage
```

### State Management

- **Authentication**: Managed via `AuthContext` with localStorage persistence
- **Theme**: Global theme state via `ThemeContext`
- **Notifications**: Toast system via `ToastProvider`
- **Component State**: Local state using React hooks (useState, useEffect)

### Key Components

- **DeepRemember**: Main spaced repetition component with card review logic
- **DashboardView**: Displays current card, statistics, and review controls
- **PlayerPage**: Media player with subtitle support and file upload
- **AuthWrapper**: Handles authentication flow and route protection
- **Welcome**: Landing page with navigation to main features

## Technologies Used

- **React 19.1.1**: UI library with modern hooks and functional components
- **React DOM 19.1.1**: React rendering for web
- **Vite 7.1.5**: Build tool and development server
- **@vitejs/plugin-react 5.0.2**: React plugin for Vite
- **CSS3**: Styling with modern CSS features

## Build and Deployment

### Production Build

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

Preview the production build locally before deployment.

### Deployment Considerations

1. Set `VITE_API_BASE_URL` environment variable for production API endpoint
2. Ensure backend CORS is configured to allow requests from the frontend domain
3. Configure web server to serve the `dist/` directory
4. Set up proper routing for single-page application (SPA) - all routes should serve `index.html`

## Development Workflow

1. Start backend API server (default: http://localhost:4004)
2. Start frontend development server: `npm run dev`
3. Application opens at http://localhost:9000
4. Make changes to source files - HMR will update automatically
5. Test features and verify API integration
6. Build for production when ready: `npm run build`

## API Integration

The application communicates with the backend API for:
- User authentication and authorization
- Flashcard CRUD operations
- Card review and spaced repetition scheduling
- File upload and media management
- User profile and settings management

All API calls use the centralized configuration from `src/config/api.js`, ensuring consistent endpoint handling and easy environment-specific configuration.

## Development
### AI development instructions
in /client/readme.md in development section, you can find description how to use reusable components and use them if its needed , use always same style for new components, check night and light theme for new components, and always use mobile first design approach like old components.
Do not use emoji , only use google-icon like other component, for example google-icon is used in topMenu.jsx

### Reusable Components

The application provides several reusable components for consistent UI patterns across the codebase. These components should be used when creating new features or modals to maintain design consistency and reduce code duplication.

#### Page Component

The Page component located at `src/components/Page.jsx` serves as a layout wrapper that provides consistent page structure across the application. It automatically includes a Header component at the top and a Footer component at the bottom, with the main content area in between. This component should be used to wrap all main page views to ensure consistent navigation and layout.

The component accepts navigation callback props that are passed down to the Header component, allowing users to navigate between different sections of the application. These include callbacks for navigating to the welcome page, player page, user management, and management pages. The component also accepts an `isCardsView` prop to indicate the current view state, an `onUserSetup` callback for user configuration, an `onToggleCardsView` callback for switching between card views, an `onShowCards` callback, and an `isReviewMode` boolean that applies review-specific styling. The main page content should be passed as children to the component.

#### Button Component

The Button component at `src/components/Button.jsx` is a standardized button implementation that provides consistent styling and behavior across the application. It supports multiple visual variants including primary, secondary, and danger styles, and three size options: small, medium, and large. The component supports icon integration through either Material icon names or custom icon elements, with configurable icon positioning on the left or right side of the button text.

The component handles click events through an onClick prop, supports disabled state for preventing interactions during loading or invalid states, and can be configured for full-width display. It accepts standard HTML button attributes and additional CSS classes for customization. When using Material icons, provide the icon name as a string to the `iconName` prop, and the component will automatically render the appropriate Material Symbols icon. The button prevents clicks when disabled and properly handles event propagation.

#### Modal Component

The Modal component at `src/components/Modal.jsx` is the base modal template used throughout the application. It provides a reusable overlay and modal container structure with built-in accessibility features and user interaction handling. The component automatically manages body scroll locking when open, handles ESC key press to close the modal, and supports closing by clicking the overlay background.

The modal accepts an `isOpen` boolean prop to control visibility, an `onClose` callback function that is triggered when the modal should close, an optional `title` string that displays in the header, and `children` for the main modal content. It also accepts an optional `footer` prop for custom footer content such as action buttons. The component supports four size variants: small, medium, large, and full. The `closeOnOverlayClick` prop controls whether clicking the overlay closes the modal, and `closeOnEsc` controls ESC key behavior. Additional CSS classes can be applied to both the modal container and overlay through `className` and `overlayClassName` props. The modal automatically includes a CloseButton in the header when a title is provided, and prevents closing when clicking inside the modal content area.

#### CloseButton Component

The CloseButton component at `src/components/CloseButton.jsx` is a reusable close button that displays an X icon and provides consistent close functionality. It is commonly used in modals, but can be used anywhere a close action is needed. The component automatically handles click events and can optionally respond to the ESC key press to trigger the close action.

The component accepts an `onClick` callback that is executed when the button is clicked or when ESC is pressed if enabled. It supports size variants (small, medium, large) and visual variants (default and others) through props. The `enableEscKey` prop controls whether the component should listen for ESC key presses to trigger the close action. When ESC key handling is enabled, the component sets up and cleans up event listeners automatically. The button includes proper ARIA labels for accessibility and prevents event propagation to avoid unintended side effects. Note that when used inside the Modal component, the CloseButton's ESC key handling should be disabled since the Modal handles ESC key events separately.

#### AreYouSureModal Component

The AreYouSureModal component at `src/components/AreYouSureModal.jsx` is a specialized confirmation dialog built on top of the Modal component. It provides a standardized way to request user confirmation for destructive or important actions, replacing browser `window.confirm()` with a more customizable and user-friendly interface.

The component accepts an `isOpen` boolean to control visibility, a `title` string for the modal header, a `question` string that serves as the main confirmation prompt, and an optional `description` string for additional context. It provides customizable button labels through `confirmLabel` and `cancelLabel` props, with default values of "Yes" and "Cancel" respectively. The component accepts `onConfirm` and `onCancel` callback functions that are triggered when the user clicks the respective buttons. The `isConfirming` boolean prop is used to show a loading state, typically disabling buttons and updating the confirm button label to indicate processing. The `confirmButtonVariant` prop allows customization of the confirm button style, supporting primary, secondary, and danger variants, with danger being the default for destructive actions. The component automatically handles button states during confirmation and prevents multiple submissions.

These components work together to create consistent user interfaces. The Modal component serves as the foundation for dialogs, the CloseButton is integrated into modals and can be used standalone, the Button component provides consistent action buttons throughout the application, the AreYouSureModal builds on Modal for confirmation dialogs, and the Page component provides the overall page structure. When creating new features, use these components to maintain design consistency and reduce development time.

## Additional Documentation

- See `API_CONFIGURATION.md` for detailed API setup instructions
- Backend API documentation should be consulted for endpoint specifications

## License

MIT License

## Author

Arash Yeganehrad
