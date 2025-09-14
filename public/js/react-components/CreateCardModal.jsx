/**
 * CreateCardModal.jsx - React component for creating new cards
 * This replaces the vanilla JS create card modal functionality
 */

const { useState, useEffect, useRef } = React;

const CreateCardModal = ({ isOpen, onClose, onCreateCard, currentUserId }) => {
    const [formData, setFormData] = useState({
        word: '',
        translation: '',
        context: ''
    });
    const [similarWords, setSimilarWords] = useState([]);
    const [showSimilarWords, setShowSimilarWords] = useState(false);
    const [translationData, setTranslationData] = useState(null);
    const [showTranslation, setShowTranslation] = useState(false);
    const [loading, setLoading] = useState(false);
    
    const searchTimeoutRef = useRef(null);
    const translationTimeoutRef = useRef(null);

    // Reset form when modal opens/closes (componentDidMount/componentDidUpdate pattern)
    useEffect(() => {
        if (!isOpen) {
            setFormData({ word: '', translation: '', context: '' });
            setSimilarWords([]);
            setShowSimilarWords(false);
            setTranslationData(null);
            setShowTranslation(false);
        }
    }, [isOpen]);

    // Cleanup timeouts on unmount (componentWillUnmount pattern)
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
            if (translationTimeoutRef.current) {
                clearTimeout(translationTimeoutRef.current);
            }
        };
    }, []);

    // Handle form input changes
    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        
        if (field === 'word') {
            handleWordSearch(value);
        }
    };

    // Search for similar words
    const handleWordSearch = (query) => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (!query || query.length < 2) {
            setShowSimilarWords(false);
            return;
        }

        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const response = await fetch(`/deepRemember/search-similar/${currentUserId}/${encodeURIComponent(query)}`);
                const data = await response.json();
                
                if (data.success && data.words.length > 0) {
                    setSimilarWords(data.words);
                    setShowSimilarWords(true);
                } else {
                    setShowSimilarWords(false);
                }
            } catch (error) {
                console.error('Error searching similar words:', error);
                setShowSimilarWords(false);
            }
        }, 300);
    };

    // Handle word blur for translation
    const handleWordBlur = () => {
        const word = formData.word.trim();
        if (!word || word.length < 2) return;

        if (translationTimeoutRef.current) {
            clearTimeout(translationTimeoutRef.current);
        }

        translationTimeoutRef.current = setTimeout(async () => {
            setLoading(true);
            setShowTranslation(true);
            
            try {
                const response = await fetch('/deepRemember/translate-word', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ word })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    setTranslationData(data);
                } else {
                    setTranslationData({ translation: 'Translation failed', sampleSentence: 'Please try again or enter manually' });
                }
            } catch (error) {
                console.error('Error getting translation:', error);
                setTranslationData({ translation: 'Translation error', sampleSentence: 'Please try again or enter manually' });
            } finally {
                setLoading(false);
            }
        }, 1000);
    };

    // Handle translation focus
    const handleTranslationFocus = () => {
        // Translation result is already visible if available
    };

    // Handle translation keydown (Tab to use translation)
    const handleTranslationKeydown = (event) => {
        if (event.key === 'Tab' && translationData) {
            event.preventDefault();
            setFormData(prev => ({
                ...prev,
                translation: translationData.translation,
                context: translationData.sampleSentence
            }));
            setShowTranslation(false);
        }
    };

    // Handle translation result click
    const handleTranslationClick = () => {
        if (translationData) {
            setFormData(prev => ({
                ...prev,
                translation: translationData.translation,
                context: translationData.sampleSentence
            }));
            setShowTranslation(false);
        }
    };

    // Handle form submission
    const handleSubmit = async () => {
        if (!formData.word.trim()) {
            alert('Please enter a word');
            return;
        }

        if (onCreateCard) {
            await onCreateCard(formData);
        }
    };

    // Get state color helper
    const getStateColor = (state) => {
        switch (state) {
            case 0: return '#007bff';
            case 1: return '#28a745';
            case 2: return '#ffc107';
            default: return '#6c757d';
        }
    };

    // Get state name helper
    const getStateName = (state) => {
        switch (state) {
            case 0: return 'Learning';
            case 1: return 'Review';
            case 2: return 'Relearning';
            default: return 'Unknown';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" id="createCardModal">
            <div className="modal">
                <div className="modal-header">
                    <h3>➕ Create New Card</h3>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-form">
                    <input 
                        type="text" 
                        id="newWord" 
                        placeholder="Enter word to learn"
                        value={formData.word}
                        onChange={(e) => handleInputChange('word', e.target.value)}
                        onBlur={handleWordBlur}
                    />
                    <input 
                        type="text" 
                        id="newTranslation" 
                        placeholder="Enter translation"
                        value={formData.translation}
                        onChange={(e) => handleInputChange('translation', e.target.value)}
                        onFocus={handleTranslationFocus}
                        onKeyDown={handleTranslationKeydown}
                    />
                    <textarea 
                        id="newContext" 
                        placeholder="Enter context or example sentence"
                        value={formData.context}
                        onChange={(e) => handleInputChange('context', e.target.value)}
                    />
                    
                    {/* Similar Words Table */}
                    {showSimilarWords && (
                        <div id="similarWordsSection" style={{ marginTop: '15px' }}>
                            <h4 style={{ marginBottom: '10px', color: '#666' }}>🔍 Similar Words Found:</h4>
                            <div id="similarWordsTable" style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '5px' }}>
                                <table id="similarWordsTableContent" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: '#f8f9fa' }}>
                                        <tr>
                                            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Word</th>
                                            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Translation</th>
                                            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>State</th>
                                            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Due</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {similarWords.map((word, index) => (
                                            <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                                                <td style={{ padding: '8px', fontWeight: '500' }}>{word.word}</td>
                                                <td style={{ padding: '8px' }}>{word.translation || 'N/A'}</td>
                                                <td style={{ padding: '8px' }}>
                                                    <span style={{
                                                        padding: '2px 6px',
                                                        borderRadius: '3px',
                                                        fontSize: '12px',
                                                        background: getStateColor(word.state),
                                                        color: 'white'
                                                    }}>
                                                        {getStateName(word.state)}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '8px', fontSize: '12px', color: '#666' }}>
                                                    {new Date(word.due).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    
                    {/* Translation Result Display */}
                    {showTranslation && (
                        <div 
                            id="translationResult" 
                            style={{ 
                                marginTop: '15px', 
                                padding: '15px', 
                                background: '#f8f9fa', 
                                borderRadius: '8px', 
                                borderLeft: '4px solid #007bff', 
                                cursor: 'pointer' 
                            }}
                            onClick={handleTranslationClick}
                        >
                            <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>🤖 AI Translation:</h4>
                            <div style={{ marginBottom: '10px' }}>
                                <strong>Translation:</strong> 
                                <span style={{ color: '#007bff' }}>
                                    {loading ? '🔄 Loading translation...' : (translationData?.translation || 'No translation found.')}
                                </span>
                            </div>
                            <div style={{ marginBottom: '10px' }}>
                                <strong>Sample Sentences:</strong> 
                                <span style={{ color: '#28a745', fontStyle: 'italic', whiteSpace: 'pre-line' }}>
                                    {loading ? '' : (translationData?.sampleSentence || 'Please try again or enter manually')}
                                </span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                                💡 Press Tab or click to use this translation
                            </div>
                        </div>
                    )}
                    
                    <div className="modal-buttons">
                        <button className="btn-modal btn-modal-secondary" onClick={onClose}>Cancel</button>
                        <button className="btn-modal btn-modal-primary" onClick={handleSubmit}>Create Card</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Export for use in other components
window.CreateCardModal = CreateCardModal;
