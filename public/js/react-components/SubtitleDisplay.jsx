/**
 * SubtitleDisplay.jsx - React component for displaying subtitles with word interactions
 * This replaces the vanilla JS subtitle display functionality
 */

const { useState, useEffect, useRef } = React;

const SubtitleDisplay = ({ subtitles, currentSubtitleIndex, onWordClick }) => {
    const [showTooltip, setShowTooltip] = useState(null);
    const [tooltipContent, setTooltipContent] = useState('');
    const subtitleTextRef = useRef(null);

    // Handle word click with translation fetching
    const handleWordClick = async (word) => {
        // Hide all other tooltips
        setShowTooltip(word);
        setTooltipContent('Loading...');
        
        try {
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama3.2',
                    prompt: `answer in this format {"translation":"string", "word":"realWord"} , what is the translation of "${word}"`,
                    stream: false
                })
            });
            const data = await response.json();
            
            // Try to extract translation from the response
            let translation = 'No translation found.';
            if (data.response) {
                try {
                    const match = data.response.match(/\{[^}]+\}/);
                    if (match) {
                        const parsed = JSON.parse(match[0]);
                        translation = parsed.translation || translation;
                    }
                } catch (e) {}
            }
            
            setTooltipContent(translation);
            
        } catch (err) {
            setTooltipContent('Error fetching translation.');
        }
    };

    // Auto-hide tooltip effect (componentDidMount/componentDidUpdate pattern)
    useEffect(() => {
        if (showTooltip) {
            const timeoutId = setTimeout(() => {
                setShowTooltip(null);
            }, showTooltip ? 5000 : 3000);
            
            // Cleanup function (componentWillUnmount pattern)
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
