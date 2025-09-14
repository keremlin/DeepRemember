/**
 * CardReviewComponent.jsx - React component for card review functionality
 * This replaces the vanilla JS card review system
 */

import React, { useState, useEffect, useRef } from 'react';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { deepRememberService } from '../services/deepRememberService';

const CardReviewComponent = ({ cards, currentCardIndex, onAnswerCard, onShowAnswer }) => {
    const [showAnswer, setShowAnswer] = useState(false);
    const [answerShown, setAnswerShown] = useState(false);
    const answerBtnRef = useRef(null);

    // Reset state when card changes
    useEffect(() => {
        setShowAnswer(false);
        setAnswerShown(false);
    }, [currentCardIndex]);

    // Handle answer button click
    const handleShowAnswer = () => {
        setShowAnswer(true);
        setAnswerShown(true);
        if (onShowAnswer) {
            onShowAnswer();
        }
    };

    // Handle rating button click
    const handleRating = (rating) => {
        if (onAnswerCard) {
            onAnswerCard(rating);
        }
    };

    // Define keyboard shortcuts
    const shortcuts = [
        { key: 'enter', handler: () => !answerShown && handleShowAnswer() },
        { key: ' ', handler: () => !answerShown && handleShowAnswer() },
        { key: 'z', handler: () => answerShown && handleRating(1) },
        { key: 'x', handler: () => answerShown && handleRating(2) },
        { key: 'c', handler: () => answerShown && handleRating(3) },
        { key: 'v', handler: () => answerShown && handleRating(4) },
        { key: 'b', handler: () => answerShown && handleRating(5) }
    ];

    // Use keyboard shortcuts hook
    useKeyboardShortcuts(shortcuts, [answerShown]);

    if (currentCardIndex >= cards.length) {
        return (
            <div className="srs-card" id="reviewSection" style={{ display: 'none' }}>
                <h3>🔄 Review Cards</h3>
                <div className="srs-card">
                    <div className="card-content">
                        <div className="word-display">
                            <strong>All cards reviewed!</strong>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const card = cards[currentCardIndex];
    if (!card) return null;

    return (
        <div className="srs-card" id="reviewSection">
            <h3>🔄 Review Cards</h3>
            <div className="srs-card">
                <div className="card-content">
                    <div className="word-display">
                        <strong id="cardWord">{card.word}</strong>
                        <button 
                            ref={answerBtnRef}
                            className="answer-btn" 
                            id="answerBtn"
                            onClick={handleShowAnswer}
                            disabled={answerShown}
                        >
                            {answerShown ? 'ANSWERED' : 'ANSWER'}
                            <span className="answer-shortcuts">
                                <span className="shortcut-item">Enter</span>
                                <span className="shortcut-item">Space</span>
                            </span>
                        </button>
                    </div>
                    
                    {showAnswer && (
                        <div className="answer-content" id="answerContent">
                            <div className="translation-section">
                                <h4>Answer</h4>
                                <div className="translation-text" id="cardTranslation">
                                    {card.translation || 'N/A'}
                                </div>
                            </div>
                            <div className="context-section">
                                <h4>Samples</h4>
                                <div className="context-text context-display" id="cardContext">
                                    {card.context || 'N/A'}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="rating-buttons">
                    <button 
                        className="rating-btn rating-1" 
                        onClick={() => handleRating(1)}
                        disabled={!answerShown}
                    >
                        Again<span className="shortcut-key">Z</span>
                    </button>
                    <button 
                        className="rating-btn rating-2" 
                        onClick={() => handleRating(2)}
                        disabled={!answerShown}
                    >
                        Hard<span className="shortcut-key">X</span>
                    </button>
                    <button 
                        className="rating-btn rating-3" 
                        onClick={() => handleRating(3)}
                        disabled={!answerShown}
                    >
                        Good<span className="shortcut-key">C</span>
                    </button>
                    <button 
                        className="rating-btn rating-4" 
                        onClick={() => handleRating(4)}
                        disabled={!answerShown}
                    >
                        Easy<span className="shortcut-key">V</span>
                    </button>
                    <button 
                        className="rating-btn rating-5" 
                        onClick={() => handleRating(5)}
                        disabled={!answerShown}
                    >
                        Perfect<span className="shortcut-key">B</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

// Export for use in other components
window.CardReviewComponent = CardReviewComponent;
