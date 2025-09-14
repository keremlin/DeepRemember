/**
 * SubtitleDisplay.jsx - React component for displaying subtitles with word interactions
 * This replaces the vanilla JS subtitle display functionality
 */

const { useState, useRef } = React;

const SubtitleDisplay = ({ subtitles, currentSubtitleIndex, onWordClick }) => {
    const [showTooltip, setShowTooltip] = useState(null);
    const [tooltipContent, setTooltipContent] = useState('');
    const subtitleTextRef = useRef(null);

    // Handle word click with translation fetching
    const handleWordClick = async (word) => {
        setShowTooltip(word);
        setTooltipContent('Loading...');
        
        try {
            const result = await window.translationService.translateWord(word);
            setTooltipContent(result.translation);
        } catch (err) {
            setTooltipContent('Error fetching translation.');
        }
    };

    // Auto-hide tooltip effect
    React.useEffect(() => {
        if (showTooltip) {
            const timeoutId = setTimeout(() => {
                setShowTooltip(null);
            }, 5000);
            
            return () => clearTimeout(timeoutId);
        }
    }, [showTooltip]);

    // Handle add to cards button click
    const handleAddToCards = (word) => {
        if (onWordClick) {
            onWordClick(word);
        }
    };

    // Render subtitle words with tooltips
    const renderSubtitleWords = (text) => {
        if (!text) return '';
        
        const words = text.split(/(\s+)/);
        return words.map((word, index) => {
            if (word.trim() === '') return word;
            
            return (
                <span 
                    key={index}
                    className="subtitle-word" 
                    data-word={word}
                    onClick={() => handleWordClick(word)}
                    style={{ cursor: 'pointer', position: 'relative' }}
                >
                    {word}
                    {showTooltip === word && (
                        <span className="subtitle-tooltip">
                            {tooltipContent}
                            <span 
                                className="add-to-cards-btn" 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddToCards(word);
                                }}
                                title="Add to learning cards"
                            >
                                ➕
                            </span>
                        </span>
                    )}
                </span>
            );
        });
    };

    const currentSubtitle = currentSubtitleIndex >= 0 ? subtitles[currentSubtitleIndex] : null;

    return (
        <div className="subtitle-display" id="subtitleDisplay">
            <div className="subtitle-text">
                {currentSubtitle ? renderSubtitleWords(currentSubtitle.text) : 'Subtitles will appear here when playing media'}
            </div>
        </div>
    );
};

// Export for use in other components
window.SubtitleDisplay = SubtitleDisplay;
