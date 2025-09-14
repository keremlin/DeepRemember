/**
 * App.jsx - Main React application component
 * Routes to different components based on props
 */

import React from 'react';
import SubtitleDisplay from './components/SubtitleDisplay';
import PlaylistComponent from './components/PlaylistComponent';
import CardReviewComponent from './components/CardReviewComponent';
import CreateCardModal from './components/CreateCardModal';

const App = ({ component, ...props }) => {
    // Route to the appropriate component
    switch (component) {
        case 'SubtitleDisplay':
            return <SubtitleDisplay {...props} />;
        case 'PlaylistComponent':
            return <PlaylistComponent {...props} />;
        case 'CardReviewComponent':
            return <CardReviewComponent {...props} />;
        case 'CreateCardModal':
            return <CreateCardModal {...props} />;
        default:
            return <div>Component not found: {component}</div>;
    }
};

export default App;
