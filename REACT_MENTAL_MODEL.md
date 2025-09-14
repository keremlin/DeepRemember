# React Mental Model Changes - Practical Guide

This guide demonstrates the fundamental shift in thinking when migrating from vanilla JavaScript to React, using examples from your subtitle player application.

## 🚫 **STOP: Manual DOM Manipulation**

### ❌ **Old Way (Vanilla JS)**

```javascript
// Manual DOM querying and manipulation
function updateSubtitleDisplay() {
    const subtitleDisplay = document.getElementById('subtitleDisplay');
    const subtitleText = document.querySelector('.subtitle-text');
    
    if (currentSubtitleIndex >= 0) {
        const text = subtitles[currentSubtitleIndex].text;
        const words = text.split(/(\s+)/);
        subtitleText.innerHTML = words.map(word => {
            if (word.trim() === '') return word;
            return `<span class="subtitle-word" data-word="${word}">${word}<span class="subtitle-tooltip">Alt: ${word}</span></span>`;
        }).join('');
    } else {
        subtitleText.textContent = '';
    }
}

// Manual event handling
document.addEventListener('click', async function(e) {
    if (e.target.classList.contains('subtitle-word')) {
        // Hide all other tooltips
        document.querySelectorAll('.subtitle-word.show-tooltip').forEach(el => 
            el.classList.remove('show-tooltip')
        );
        // Show tooltip for clicked word
        e.target.classList.add('show-tooltip');
        // ... more DOM manipulation
    }
});

// Manual state management
let currentSubtitleIndex = -1;
let subtitles = [];
let mediaElement = null;
```

### ❌ **Problems with Old Approach:**
- **Fragile**: Direct DOM manipulation breaks easily
- **Hard to Debug**: State scattered across multiple variables
- **Performance Issues**: Manual DOM updates are inefficient
- **Hard to Test**: Tightly coupled to DOM structure
- **Memory Leaks**: Event listeners not properly cleaned up

## ✅ **START: React Declarative Approach**

### ✅ **New Way (React)**

```jsx
// Declarative UI with JSX
const SubtitleDisplay = ({ subtitles, currentSubtitleIndex, onWordClick }) => {
    const [showTooltip, setShowTooltip] = useState(null);
    const [tooltipContent, setTooltipContent] = useState('');

    // State-driven rendering
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
        <div className="subtitle-display">
            <div className="subtitle-text">
                {currentSubtitle ? renderSubtitleWords(currentSubtitle.text) : 'Subtitles will appear here when playing media'}
            </div>
        </div>
    );
};
```

### ✅ **Benefits of New Approach:**
- **Declarative**: UI describes what should be shown, not how to show it
- **State-Driven**: UI automatically updates when state changes
- **Performance**: React's virtual DOM optimizes updates
- **Testable**: Components can be tested in isolation
- **Maintainable**: Clear separation of concerns

## 🔄 **Key Mental Model Shifts**

### 1. **From Imperative to Declarative**

**❌ Old (Imperative):**
```javascript
// Tell the browser HOW to update the DOM
function updatePlaylist() {
    const playlistList = document.getElementById('playlistList');
    playlistList.innerHTML = '';
    
    data.playlist.forEach((item, idx) => {
        const li = document.createElement('li');
        li.className = 'playlist-item';
        li.innerHTML = `<span>${item.media}</span>`;
        playlistList.appendChild(li);
    });
}
```

**✅ New (Declarative):**
```jsx
// Describe WHAT the UI should look like
const PlaylistComponent = ({ playlist, onPlayItem, onDeleteItem }) => {
    return (
        <ul className="playlist-list">
            {playlist.map((item, idx) => (
                <li key={idx} className="playlist-item">
                    <span>{item.media}</span>
                    <button onClick={() => onPlayItem(item)}>Play</button>
                    <button onClick={() => onDeleteItem(item)}>Delete</button>
                </li>
            ))}
        </ul>
    );
};
```

### 2. **From Manual State to React State**

**❌ Old (Manual State):**
```javascript
// Scattered state variables
let currentCards = [];
let currentCardIndex = 0;
let isCardsView = false;
let showAnswer = false;

// Manual state updates
function showCurrentCard() {
    if (currentCardIndex >= currentCards.length) {
        document.getElementById('reviewSection').style.display = 'none';
        return;
    }
    
    const card = currentCards[currentCardIndex];
    document.getElementById('cardWord').textContent = card.word;
    // ... more manual updates
}
```

**✅ New (React State):**
```jsx
// Centralized state management
const CardReviewComponent = ({ cards, currentCardIndex, onAnswerCard }) => {
    const [showAnswer, setShowAnswer] = useState(false);
    
    // State automatically drives UI
    if (currentCardIndex >= cards.length) {
        return <div>All cards reviewed!</div>;
    }
    
    const card = cards[currentCardIndex];
    
    return (
        <div className="srs-card">
            <div className="word-display">
                <strong>{card.word}</strong>
                <button 
                    onClick={() => setShowAnswer(true)}
                    disabled={showAnswer}
                >
                    {showAnswer ? 'ANSWERED' : 'ANSWER'}
                </button>
            </div>
            
            {showAnswer && (
                <div className="answer-content">
                    <div className="translation-text">{card.translation}</div>
                    <div className="context-text">{card.context}</div>
                </div>
            )}
        </div>
    );
};
```

### 3. **From Event Listeners to Event Handlers**

**❌ Old (Manual Event Listeners):**
```javascript
// Global event listeners
document.addEventListener('keydown', (e) => {
    if (mediaElement) {
        switch(e.code) {
            case 'Space':
                e.preventDefault();
                togglePlayPause();
                break;
            // ... more cases
        }
    }
});

// Manual cleanup needed
document.removeEventListener('keydown', handleKeyDown);
```

**✅ New (React Event Handlers):**
```jsx
// Component-scoped event handling
const CardReviewComponent = ({ cards, currentCardIndex, onAnswerCard }) => {
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setShowAnswer(true);
            }
            
            if (showAnswer) {
                switch (event.key.toLowerCase()) {
                    case 'z': handleRating(1); break;
                    case 'x': handleRating(2); break;
                    // ... more cases
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        
        // Automatic cleanup
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [showAnswer, onAnswerCard]);
    
    // ... rest of component
};
```

## 🎯 **Practical Migration Examples**

### Example 1: Subtitle Display Migration

**Before (Vanilla JS):**
```javascript
// Manual DOM updates in app.js
function displayCurrentSubtitle() {
    const subtitleDisplay = document.getElementById('subtitleDisplay');
    const subtitleText = document.querySelector('.subtitle-text');
    
    if (currentSubtitleIndex >= 0) {
        const text = subtitles[currentSubtitleIndex].text;
        subtitleText.innerHTML = words.map(word => 
            `<span class="subtitle-word" data-word="${word}">${word}</span>`
        ).join('');
    }
}
```

**After (React):**
```jsx
// Declarative component in SubtitleDisplay.jsx
const SubtitleDisplay = ({ subtitles, currentSubtitleIndex }) => {
    const currentSubtitle = currentSubtitleIndex >= 0 ? subtitles[currentSubtitleIndex] : null;
    
    return (
        <div className="subtitle-display">
            <div className="subtitle-text">
                {currentSubtitle ? currentSubtitle.text : 'No subtitle'}
            </div>
        </div>
    );
};
```

### Example 2: Modal Management Migration

**Before (Vanilla JS):**
```javascript
// Manual modal show/hide
function showCreateCard() {
    document.getElementById('createCardModal').style.display = 'block';
}

function hideCreateCard() {
    document.getElementById('createCardModal').style.display = 'none';
    // Clear form fields
    document.getElementById('newWord').value = '';
    document.getElementById('newTranslation').value = '';
}
```

**After (React):**
```jsx
// State-driven modal in CreateCardModal.jsx
const CreateCardModal = ({ isOpen, onClose, onCreateCard }) => {
    const [formData, setFormData] = useState({
        word: '',
        translation: '',
        context: ''
    });
    
    if (!isOpen) return null;
    
    return (
        <div className="modal-overlay">
            <div className="modal">
                <input 
                    value={formData.word}
                    onChange={(e) => setFormData(prev => ({ ...prev, word: e.target.value }))}
                />
                <button onClick={() => onCreateCard(formData)}>Create</button>
                <button onClick={onClose}>Cancel</button>
            </div>
        </div>
    );
};
```

## 🧠 **Mental Model Summary**

| **Stop Doing** | **Start Doing** |
|----------------|-----------------|
| `getElementById()` | JSX with props |
| `innerHTML = ...` | State-driven rendering |
| `appendChild()` | Component composition |
| `addEventListener()` | Event handlers in components |
| Manual state variables | `useState()` hooks |
| Manual DOM updates | React re-renders |
| Imperative code | Declarative JSX |
| Global event listeners | Component-scoped events |

## 🎉 **The Result**

With React, your code becomes:
- **More Predictable**: UI always reflects current state
- **Easier to Debug**: Clear data flow and component boundaries
- **Better Performance**: Optimized re-rendering
- **More Maintainable**: Self-contained components
- **Easier to Test**: Pure functions and isolated components

The key insight is: **Instead of telling the browser how to update the DOM, you describe what the UI should look like based on your current state, and React figures out how to make it happen efficiently.**
