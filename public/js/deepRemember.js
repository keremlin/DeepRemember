let currentUserId = 'user123';
let currentCards = [];
let currentCardIndex = 0;
let isCardsView = false;

// Helper function to format context with dot delimiters
function formatContext(context) {
    if (!context) return '';
    
    // Split by newlines and filter out empty lines
    const sentences = context.split('\n').filter(s => s.trim());
    
    if (sentences.length === 1) {
        return sentences[0];
    }
    
    // Format multiple sentences with dot delimiters
    return sentences.map((sentence, index) => 
        `${index + 1}. ${sentence.trim()}`
    ).join('\n');
}

// Modal functions
function showUserSetup() {
    document.getElementById('userSetupModal').style.display = 'block';
}

function hideUserSetup() {
    document.getElementById('userSetupModal').style.display = 'none';
}

function showCreateCard() {
    document.getElementById('createCardModal').style.display = 'block';
}

function hideCreateCard() {
    document.getElementById('createCardModal').style.display = 'none';
    // Clear the form
    document.getElementById('newWord').value = '';
    document.getElementById('newTranslation').value = '';
    document.getElementById('newContext').value = '';
    // Hide similar words section
    document.getElementById('similarWordsSection').style.display = 'none';
    // Hide translation result
    document.getElementById('translationResult').style.display = 'none';
}

// Help modal functions
function showHelp() {
    document.getElementById('helpModal').style.display = 'block';
}

function hideHelp() {
    document.getElementById('helpModal').style.display = 'none';
}

// Similar words search functionality
let searchTimeout;

async function searchSimilarWords() {
    const wordInput = document.getElementById('newWord');
    const query = wordInput.value.trim();
    const similarWordsSection = document.getElementById('similarWordsSection');
    const similarWordsTableBody = document.getElementById('similarWordsTableBody');
    
    // Clear previous timeout
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    // Hide section if query is empty
    if (!query || query.length < 2) {
        similarWordsSection.style.display = 'none';
        return;
    }
    
    // Debounce the search
    searchTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`/deepRemember/search-similar/${currentUserId}/${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data.success && data.words.length > 0) {
                // Show the section and populate table
                similarWordsSection.style.display = 'block';
                
                similarWordsTableBody.innerHTML = data.words.map(word => `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 8px; font-weight: 500;">${word.word}</td>
                        <td style="padding: 8px;">${word.translation || 'N/A'}</td>
                        <td style="padding: 8px;">
                            <span style="
                                padding: 2px 6px; 
                                border-radius: 3px; 
                                font-size: 12px; 
                                background: ${getStateColor(word.state)};
                                color: white;
                            ">${getStateName(word.state)}</span>
                        </td>
                        <td style="padding: 8px; font-size: 12px; color: #666;">
                            ${new Date(word.due).toLocaleDateString()}
                        </td>
                    </tr>
                `).join('');
            } else {
                similarWordsSection.style.display = 'none';
            }
        } catch (error) {
            console.error('Error searching similar words:', error);
            similarWordsSection.style.display = 'none';
        }
    }, 300); // 300ms delay
}

function getStateColor(state) {
    switch (state) {
        case 0: return '#007bff'; // Learning
        case 1: return '#28a745'; // Review
        case 2: return '#ffc107'; // Relearning
        default: return '#6c757d';
    }
}

// Translation functionality
let translationTimeout;
let currentTranslationData = null;

async function handleWordBlur() {
    const wordInput = document.getElementById('newWord');
    const word = wordInput.value.trim();
    
    if (!word || word.length < 2) {
        return;
    }
    
    // Clear previous timeout
    if (translationTimeout) {
        clearTimeout(translationTimeout);
    }
    
    // Set timeout for 1000ms delay
    translationTimeout = setTimeout(async () => {
        try {
            // Show loading indicator
            document.getElementById('translationResult').style.display = 'block';
            document.getElementById('aiTranslation').textContent = '🔄 Loading translation...';
            document.getElementById('aiSampleSentence').textContent = '';
            
            const response = await fetch('/deepRemember/translate-word', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ word: word })
            });
            
            const data = await response.json();
            
            if (data.success) {
                currentTranslationData = data;
                
                // Display the translation result
                document.getElementById('aiTranslation').textContent = data.translation;
                
                // Format multiple sentences with line breaks
                const sampleSentences = data.sampleSentence.split('\n').filter(s => s.trim());
                if (sampleSentences.length > 1) {
                    const formattedSentences = sampleSentences.map((sentence, index) => 
                        `${index + 1}. ${sentence.trim()}`
                    ).join('\n');
                    document.getElementById('aiSampleSentence').textContent = formattedSentences;
                } else {
                    document.getElementById('aiSampleSentence').textContent = data.sampleSentence;
                }
            } else {
                console.error('Translation failed:', data.error);
                document.getElementById('aiTranslation').textContent = '❌ Translation failed';
                document.getElementById('aiSampleSentence').textContent = 'Please try again or enter manually';
            }
        } catch (error) {
            console.error('Error getting translation:', error);
            document.getElementById('aiTranslation').textContent = '❌ Translation error';
            document.getElementById('aiSampleSentence').textContent = 'Please try again or enter manually';
        }
    }, 1000); // 1000ms delay
}

function handleTranslationFocus() {
    // If there's translation data available, allow user to use it
    if (currentTranslationData) {
        // The translation result is already visible, user can click or press tab
    }
}

function handleTranslationKeydown(event) {
    if (event.key === 'Tab' && currentTranslationData) {
        event.preventDefault();
        
        // Fill in the translation and context
        document.getElementById('newTranslation').value = currentTranslationData.translation;
        document.getElementById('newContext').value = currentTranslationData.sampleSentence;
        
        // Hide the translation result
        document.getElementById('translationResult').style.display = 'none';
        
        // Focus on the context field
        document.getElementById('newContext').focus();
    }
}

// Toggle between dashboard and cards view
function toggleView() {
    const dashboardView = document.getElementById('dashboardView');
    const cardsView = document.getElementById('cardsView');
    const manageCardsBtn = document.getElementById('manageCardsBtn');
    
    isCardsView = !isCardsView;
    
    if (isCardsView) {
        // Switch to cards view
        dashboardView.classList.add('hidden');
        cardsView.classList.add('visible');
        manageCardsBtn.textContent = '📊 Back to Dashboard';
        loadAllCards(); // Load cards when switching to cards view
    } else {
        // Switch to dashboard view
        dashboardView.classList.remove('hidden');
        cardsView.classList.remove('visible');
        manageCardsBtn.textContent = '📚 Manage Cards';
    }
}

// Load sentence analysis modal content
async function loadSentenceAnalysisModal() {
    try {
        const response = await fetch('/views/sentenceAnalysisModal.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const modalHTML = await response.text();
        document.getElementById('sentenceAnalysisModalContainer').innerHTML = modalHTML;
        console.log('Sentence analysis modal loaded successfully');
    } catch (error) {
        console.error('Error loading sentence analysis modal:', error);
        // Fallback: create a simple modal if the file can't be loaded
        document.getElementById('sentenceAnalysisModalContainer').innerHTML = `
            <div class="modal-overlay" id="sentenceAnalysisModal">
                <div class="modal sentence-analysis-modal">
                    <div class="modal-header">
                        <h3>✨ Sentence Analysis</h3>
                        <div class="modal-actions">
                            <button class="btn-save-analysis" id="saveAnalysisBtn" onclick="saveSentenceAnalysis()" disabled>
                                💾 Save
                            </button>
                            <button class="btn-refresh-analysis" id="refreshAnalysisBtn" onclick="refreshSentenceAnalysis()" disabled>
                                🔄 Refresh
                            </button>
                            <button class="modal-close" onclick="hideSentenceAnalysis()">&times;</button>
                        </div>
                    </div>
                    <div class="modal-content">
                        <div class="sentence-display">
                            <h4>Original Sentence:</h4>
                            <div class="sentence-text" id="analysisSentenceText"></div>
                        </div>
                        <div class="analysis-sections">
                            <div class="analysis-section">
                                <h4>📝 Translation</h4>
                                <div class="analysis-content" id="sentenceTranslation">
                                    <div class="loading-spinner">🔄 Analyzing...</div>
                                </div>
                            </div>
                            <div class="analysis-section">
                                <h4>🔍 Grammatical Structure</h4>
                                <div class="analysis-content" id="grammaticalStructure">
                                    <div class="loading-spinner">🔄 Analyzing...</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Close modals when clicking outside
document.addEventListener('DOMContentLoaded', function() {
    const userSetupModal = document.getElementById('userSetupModal');
    const createCardModal = document.getElementById('createCardModal');
    const helpModal = document.getElementById('helpModal');
    
    userSetupModal.addEventListener('click', function(e) {
        if (e.target === userSetupModal) {
            hideUserSetup();
        }
    });
    
    createCardModal.addEventListener('click', function(e) {
        if (e.target === createCardModal) {
            hideCreateCard();
        }
    });
    
    helpModal.addEventListener('click', function(e) {
        if (e.target === helpModal) {
            hideHelp();
        }
    });
    
    // Load the sentence analysis modal asynchronously
    loadSentenceAnalysisModal().then(() => {
        const sentenceAnalysisModal = document.getElementById('sentenceAnalysisModal');
        if (sentenceAnalysisModal) {
            sentenceAnalysisModal.addEventListener('click', function(e) {
                if (e.target === sentenceAnalysisModal) {
                    hideSentenceAnalysis();
                }
            });
        }
    });
    
    // Add click handler for translation result
    const translationResult = document.getElementById('translationResult');
    translationResult.addEventListener('click', function() {
        if (currentTranslationData) {
            // Fill in the translation and context
            document.getElementById('newTranslation').value = currentTranslationData.translation;
            document.getElementById('newContext').value = currentTranslationData.sampleSentence;
            
            // Hide the translation result
            document.getElementById('translationResult').style.display = 'none';
            
            // Focus on the context field
            document.getElementById('newContext').focus();
        }
    });
    
    // Load initial data
    loadUserData();
});

// Load user data and statistics
async function loadUserData() {
    const userId = document.getElementById('userId').value;
    if (!userId) {
        alert('Please enter a user ID');
        return;
    }
    currentUserId = userId;
    
    // Update username display in header
    document.getElementById('currentUsername').textContent = userId;
    
    try {
        const response = await fetch(`/deepRemember/stats/${userId}`);
        const data = await response.json();
        
        if (data.success) {
            updateStats(data.stats);
            loadAllCards();
            loadReviewCards();
            hideUserSetup(); // Close modal after successful load
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showError('Failed to load user data');
    }
}

// Update statistics display
function updateStats(stats) {
    const statsGrid = document.getElementById('statsGrid');
    statsGrid.innerHTML = `
        <div class="stat-item">
            <div class="stat-number">${stats.totalCards}</div>
            <div class="stat-label">Total Cards</div>
        </div>
        <div class="stat-item">
            <div class="stat-number">${stats.dueCards}</div>
            <div class="stat-label">Due Cards</div>
        </div>
        <div class="stat-item">
            <div class="stat-number">${stats.learningCards}</div>
            <div class="stat-label">Learning</div>
        </div>
        <div class="stat-item">
            <div class="stat-number">${stats.reviewCards}</div>
            <div class="stat-label">Review</div>
        </div>
    `;
}

// Create a new card
async function createCard() {
    const word = document.getElementById('newWord').value;
    const translation = document.getElementById('newTranslation').value;
    const context = document.getElementById('newContext').value;
    
    if (!word) {
        alert('Please enter a word');
        return;
    }
    
    try {
        // First create the card
        const response = await fetch('/deepRemember/create-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUserId,
                word,
                translation,
                context
            })
        });
        
        const data = await response.json();
        if (data.success) {
            // If card creation is successful and there's context, convert to speech
            if (context && context.trim()) {
                try {
                    await convertContextToSpeech(context.trim(), word.trim());
                } catch (ttsError) {
                    console.warn('TTS conversion failed, but card was created:', ttsError);
                    // Don't fail the card creation if TTS fails
                }
            }
            
            showSuccess('Card created successfully!');
            // Clear form fields
            document.getElementById('newWord').value = '';
            document.getElementById('newTranslation').value = '';
            document.getElementById('newContext').value = '';
            // Close modal and refresh data
            hideCreateCard();
            loadUserData();
        } else {
            showError(data.error || 'Failed to create card');
        }
    } catch (error) {
        console.error('Error creating card:', error);
        showError('Failed to create card');
    }
}

// Load review cards
async function loadReviewCards() {
    try {
        const response = await fetch(`/deepRemember/review-cards/${currentUserId}`);
        const data = await response.json();
        
        if (data.success) {
            currentCards = data.cards;
            currentCardIndex = 0;
            
            if (currentCards.length > 0) {
                document.getElementById('reviewSection').style.display = 'block';
                showCurrentCard();
            } else {
                document.getElementById('reviewSection').style.display = 'none';
                showSuccess('No cards due for review!');
            }
        }
    } catch (error) {
        console.error('Error loading review cards:', error);
        showError('Failed to load review cards');
    }
}

// Show current card
function showCurrentCard() {
    if (currentCardIndex >= currentCards.length) {
        document.getElementById('reviewSection').style.display = 'none';
        showSuccess('All cards reviewed!');
        loadUserData();
        return;
    }
    
    const card = currentCards[currentCardIndex];
    document.getElementById('cardWord').textContent = card.word;
    
    // Store the original translation and context for later restoration
    document.getElementById('cardTranslation').setAttribute('data-original', card.translation || '');
    document.getElementById('cardContext').setAttribute('data-original', card.context || '');
    
    // Clear the translation and context initially (but keep sections visible)
    document.getElementById('cardTranslation').textContent = '';
    document.getElementById('cardContext').textContent = '';
    
    // Reset answer button to enabled state
    const answerBtn = document.getElementById('answerBtn');
    answerBtn.disabled = false;
    answerBtn.innerHTML = 'ANSWER<span class="answer-shortcuts"><span class="shortcut-item">Enter</span><span class="shortcut-item">Space</span></span>';
    
    // Disable all rating buttons initially
    const ratingButtons = document.querySelectorAll('.rating-btn');
    ratingButtons.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.6';
        btn.style.cursor = 'not-allowed';
    });
    
    // Keep answer content visible but empty
    document.getElementById('answerContent').style.display = 'block';
    
    // Hide audio shortcuts hint
    document.getElementById('audioShortcutsHint').style.display = 'none';
    
    // Add keyboard event listeners
    document.addEventListener('keydown', handleCardKeyboard);
}

// Handle keyboard events for card review
function handleCardKeyboard(event) {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        
        // Add glowing effect to answer button
        const answerBtn = document.getElementById('answerBtn');
        answerBtn.classList.add('shortcut-active');
        setTimeout(() => {
            answerBtn.classList.remove('shortcut-active');
        }, 200);
        
        showAnswer();
        return;
    }
    
    // Audio playback shortcuts (only when context is visible)
    const cardContext = document.getElementById('cardContext');
    if (cardContext && cardContext.innerHTML && cardContext.innerHTML.includes('play-btn')) {
        // Handle number keys for audio playback
        const numberKey = parseInt(event.key);
        if (!isNaN(numberKey) && numberKey >= 0 && numberKey <= 9) {
            event.preventDefault();
            
            // Check for double-digit numbers (e.g., "10", "11", etc.)
            let targetNumber = numberKey;
            
            // If we have a previous number key pressed, check for double-digit
            if (window.lastNumberKey && window.lastNumberKeyTime && 
                (Date.now() - window.lastNumberKeyTime) < 500) { // 500ms window
                const doubleDigit = parseInt(window.lastNumberKey + event.key);
                if (doubleDigit >= 10 && doubleDigit <= 99) {
                    targetNumber = doubleDigit;
                }
            }
            
            // Store current key for potential double-digit detection
            window.lastNumberKey = event.key;
            window.lastNumberKeyTime = Date.now();
            
            // Find the play button for the corresponding sentence number
            const playButtons = cardContext.querySelectorAll('.play-btn');
            const sentenceNumbers = cardContext.querySelectorAll('.sentence-number-circle');
            
            // Find the sentence number that matches the pressed key
            let targetIndex = -1;
            sentenceNumbers.forEach((numberElement, index) => {
                if (parseInt(numberElement.textContent) === targetNumber) {
                    targetIndex = index;
                }
            });
            
            // If found, play the audio
            if (targetIndex >= 0 && targetIndex < playButtons.length) {
                const targetButton = playButtons[targetIndex];
                
                // Add glowing effect to the play button
                targetButton.classList.add('shortcut-active');
                setTimeout(() => {
                    targetButton.classList.remove('shortcut-active');
                }, 200);
                
                // Trigger the play button click
                targetButton.click();
            }
            
            return;
        }
        
        // Handle 'A' key for sentence analysis (magic wand)
        if (event.key.toLowerCase() === 'a') {
            event.preventDefault();
            
            // Find the first intel button and trigger it
            const intelButtons = cardContext.querySelectorAll('.intel-btn');
            if (intelButtons.length > 0) {
                const targetButton = intelButtons[0]; // Analyze first sentence
                
                // Add glowing effect to the intel button
                targetButton.classList.add('shortcut-active');
                setTimeout(() => {
                    targetButton.classList.remove('shortcut-active');
                }, 200);
                
                // Trigger the intel button click
                targetButton.click();
            }
            
            return;
        }
    }
    
    // Rating button shortcuts (only when rating buttons are enabled)
    const ratingButtons = document.querySelectorAll('.rating-btn');
    const firstRatingBtn = ratingButtons[0];
    
    if (firstRatingBtn && !firstRatingBtn.disabled) {
        let rating = 0;
        let targetButton = null;
        
        switch (event.key.toLowerCase()) {
            case 'z':
                event.preventDefault();
                rating = 1;
                targetButton = ratingButtons[0];
                break;
            case 'x':
                event.preventDefault();
                rating = 2;
                targetButton = ratingButtons[1];
                break;
            case 'c':
                event.preventDefault();
                rating = 3;
                targetButton = ratingButtons[2];
                break;
            case 'v':
                event.preventDefault();
                rating = 4;
                targetButton = ratingButtons[3];
                break;
            case 'b':
                event.preventDefault();
                rating = 5;
                targetButton = ratingButtons[4];
                break;
        }
        
        if (rating > 0 && targetButton) {
            // Add glowing effect to the corresponding rating button
            targetButton.classList.add('shortcut-active');
            setTimeout(() => {
                targetButton.classList.remove('shortcut-active');
            }, 200);
            answerCard(rating);
        }
    }
}

// Show answer function
function showAnswer() {
    const answerBtn = document.getElementById('answerBtn');
    
    // Get the original translation and context
    const originalTranslation = document.getElementById('cardTranslation').getAttribute('data-original');
    const originalContext = document.getElementById('cardContext').getAttribute('data-original');
    
    // Show the translation and context
    document.getElementById('cardTranslation').textContent = originalTranslation;
    document.getElementById('cardContext').innerHTML = formatContextWithPlayButtons(originalContext, document.getElementById('cardWord').textContent);
    document.getElementById('cardContext').className = 'context-display';
    
    // Show audio shortcuts hint if there are multiple sentences
    const audioShortcutsHint = document.getElementById('audioShortcutsHint');
    if (originalContext && originalContext.split('\n').filter(s => s.trim()).length > 1) {
        audioShortcutsHint.style.display = 'block';
    } else {
        audioShortcutsHint.style.display = 'none';
    }
    
    // Disable the answer button
    answerBtn.disabled = true;
    answerBtn.innerHTML = 'ANSWERED<span class="answer-shortcuts"><span class="shortcut-item">Enter</span><span class="shortcut-item">Space</span></span>';
    
    // Enable all rating buttons
    const ratingButtons = document.querySelectorAll('.rating-btn');
    ratingButtons.forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
    });
    
    // Re-add keyboard event listener for rating shortcuts
    document.addEventListener('keydown', handleCardKeyboard);
}

// Answer current card
async function answerCard(rating) {
    if (currentCardIndex >= currentCards.length) return;
    
    const card = currentCards[currentCardIndex];
    
    try {
        const response = await fetch('/deepRemember/answer-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUserId,
                cardId: card.id,
                rating
            })
        });
        
        const data = await response.json();
        if (data.success) {
            // Clear translation and context (but keep sections visible)
            document.getElementById('cardTranslation').textContent = '';
            document.getElementById('cardContext').textContent = '';
            
            // Hide audio shortcuts hint
            document.getElementById('audioShortcutsHint').style.display = 'none';
            
            // Re-enable answer button
            const answerBtn = document.getElementById('answerBtn');
            answerBtn.disabled = false;
            answerBtn.textContent = 'ANSWER';
            
            // Disable all rating buttons
            const ratingButtons = document.querySelectorAll('.rating-btn');
            ratingButtons.forEach(btn => {
                btn.disabled = true;
                btn.style.opacity = '0.6';
                btn.style.cursor = 'not-allowed';
            });
            
            // Move to next card
            currentCardIndex++;
            showCurrentCard();
            loadUserData();
        } else {
            showError(data.error || 'Failed to answer card');
        }
    } catch (error) {
        console.error('Error answering card:', error);
        showError('Failed to answer card');
    }
}

// Load all cards
async function loadAllCards() {
    try {
        const response = await fetch(`/deepRemember/all-cards/${currentUserId}`);
        const data = await response.json();
        
        if (data.success) {
            const allCardsDiv = document.getElementById('allCards');
            if (data.cards.length === 0) {
                allCardsDiv.innerHTML = '<p>No cards created yet.</p>';
                return;
            }
            
            allCardsDiv.innerHTML = data.cards.map(card => `
                <div class="srs-card" style="margin: 10px 0; padding: 15px;">
                    <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h4 id="card-word-${card.id}">${card.word}</h4>
                        <div class="card-actions">
                            <button class="btn btn-edit" onclick="editCard('${card.id}')" style="margin-right: 5px;">✏️ Edit</button>
                            <button class="btn btn-delete" onclick="deleteCard('${card.id}')">×</button>
                        </div>
                    </div>
                    <div class="card-content">
                        <p><strong>Translation:</strong> <span id="card-translation-${card.id}">${card.translation || 'N/A'}</span></p>
                        <p><strong>Context:</strong> <span id="card-context-${card.id}">${formatContextWithPlayButtons(card.context, card.word)}</span></p>
                        <p><strong>Due:</strong> ${new Date(card.due).toLocaleString()}</p>
                        <p><strong>State:</strong> ${getStateName(card.state)}</p>
                        <p><strong>Reps:</strong> ${card.reps} | <strong>Lapses:</strong> ${card.lapses}</p>
                    </div>
                    <div class="card-edit-form" id="edit-form-${card.id}" style="display: none; margin-top: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                        <h5>Edit Card</h5>
                        <div style="margin-bottom: 10px;">
                            <label><strong>Word:</strong></label>
                            <input type="text" id="edit-word-${card.id}" value="${card.word}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label><strong>Translation:</strong></label>
                            <input type="text" id="edit-translation-${card.id}" value="${card.translation || ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label><strong>Context:</strong></label>
                            <textarea id="edit-context-${card.id}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; min-height: 60px; resize: vertical;">${card.context || ''}</textarea>
                        </div>
                        <div class="edit-buttons">
                            <button class="btn btn-primary" onclick="saveCardEdit('${card.id}')" style="margin-right: 5px;">💾 Save</button>
                            <button class="btn btn-secondary" onclick="cancelCardEdit('${card.id}')">❌ Cancel</button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading all cards:', error);
        showError('Failed to load cards');
    }
}

// Edit card
function editCard(cardId) {
    const editForm = document.getElementById(`edit-form-${cardId}`);
    editForm.style.display = 'block';
}

// Cancel card edit
function cancelCardEdit(cardId) {
    const editForm = document.getElementById(`edit-form-${cardId}`);
    editForm.style.display = 'none';
}

// Save card edit
async function saveCardEdit(cardId) {
    const word = document.getElementById(`edit-word-${cardId}`).value;
    const translation = document.getElementById(`edit-translation-${cardId}`).value;
    const context = document.getElementById(`edit-context-${cardId}`).value;
    
    if (!word.trim()) {
        showError('Word cannot be empty');
        return;
    }
    
    try {
        const response = await fetch(`/deepRemember/update-card/${currentUserId}/${cardId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                word: word.trim(),
                translation: translation.trim(),
                context: context.trim()
            })
        });
        
        const data = await response.json();
        if (data.success) {
            // If card update is successful and there's context, convert to speech
            if (context && context.trim()) {
                try {
                    await convertContextToSpeech(context.trim(), word.trim());
                } catch (ttsError) {
                    console.warn('TTS conversion failed, but card was updated:', ttsError);
                    // Don't fail the card update if TTS fails
                }
            }
            
            showSuccess('Card updated successfully!');
            
            // Update the displayed values
            document.getElementById(`card-word-${cardId}`).textContent = word.trim();
            document.getElementById(`card-translation-${cardId}`).textContent = translation.trim() || 'N/A';
            document.getElementById(`card-context-${cardId}`).innerHTML = formatContextWithPlayButtons(context.trim(), word.trim());
            
            // Hide the edit form
            cancelCardEdit(cardId);
            
            // Refresh user data to update stats
            loadUserData();
        } else {
            showError(data.error || 'Failed to update card');
        }
    } catch (error) {
        console.error('Error updating card:', error);
        showError('Failed to update card');
    }
}

// Delete a card
async function deleteCard(cardId) {
    if (!confirm('Are you sure you want to delete this card?')) return;
    
    try {
        const response = await fetch(`/deepRemember/delete-card/${currentUserId}/${cardId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        if (data.success) {
            showSuccess('Card deleted successfully!');
            loadUserData();
        } else {
            showError(data.error || 'Failed to delete card');
        }
    } catch (error) {
        console.error('Error deleting card:', error);
        showError('Failed to delete card');
    }
}

// Get state name
function getStateName(state) {
    const states = {
        0: 'Learning',
        1: 'Review',
        2: 'Relearning'
    };
    return states[state] || 'Unknown';
}

// Utility functions
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success';
    successDiv.textContent = message;
    document.querySelector('.content').insertBefore(successDiv, document.querySelector('.srs-container'));
    setTimeout(() => successDiv.remove(), 3000);
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    document.querySelector('.content').insertBefore(errorDiv, document.querySelector('.srs-container'));
    setTimeout(() => errorDiv.remove(), 3000);
}

// Helper function to format context with play buttons for TTS
function formatContextWithPlayButtons(context, word = '') {
    if (!context) return '';
    
    // Split by newlines and filter out empty lines
    const sentences = context.split('\n').filter(s => s.trim());
    
    if (sentences.length === 1) {
        return `<span class="intelSentence">
            <span class="sentence">${sentences[0]}</span> 
            <button class="play-btn" onclick="playSentence('${sentences[0].replace(/'/g, "\\'")}', '${word}')">🔊</button> 
            <span class="sentence-number-circle">1</span>
            <button class="intel-btn" onclick="analyzeSentence('${sentences[0].replace(/'/g, "\\'")}', '${word}')" title="Analyze sentence">✨</button>
        </span>`;
    }
    
    // Format multiple sentences with dot delimiters and play buttons
    return sentences.map((sentence, index) => 
        `<span class="intelSentence">
            <span class="sentence">${index + 1}. ${sentence.trim()}</span> 
            <button class="play-btn" onclick="playSentence('${sentence.trim().replace(/'/g, "\\'")}', '${word}')">🔊</button> 
            <span class="sentence-number-circle">${index + 1}</span>
            <button class="intel-btn" onclick="analyzeSentence('${sentence.trim().replace(/'/g, "\\'")}', '${word}')" title="Analyze sentence">✨</button>
        </span>`
    ).join('<br>');
}

// Text-to-Speech functionality
async function playSentence(text, word) {
    try {
        // Show loading state
        const playBtn = event.target;
        const originalText = playBtn.textContent;
        playBtn.textContent = '⏳';
        playBtn.disabled = true;
        
        // First try to get existing audio file
        const encodedSentence = encodeURIComponent(text);
        const response = await fetch(`/deepRemember/get-audio/${word}/${encodedSentence}`);
        const data = await response.json();
        
        let audioUrl;
        
        if (data.success && data.exists) {
            // Use existing audio file
            audioUrl = data.audioUrl;
            console.log(`[TTS] Using existing audio: ${audioUrl}`);
        } else {
            // Generate new audio file
            console.log(`[TTS] Generating new audio for: "${text}"`);
            const ttsResponse = await fetch('/deepRemember/convert-to-speech', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text, word })
            });
            
            const ttsData = await ttsResponse.json();
            if (ttsData.success) {
                audioUrl = ttsData.audioUrl;
            } else {
                throw new Error(ttsData.error || 'TTS conversion failed');
            }
        }
        
        // Create and play audio
        const audio = new Audio(audioUrl);
        audio.play();
        
        // Update button to show playing state
        playBtn.textContent = '▶️';
        
        // Reset button after audio finishes
        audio.onended = () => {
            playBtn.textContent = originalText;
            playBtn.disabled = false;
        };
        
        // Reset button if there's an error
        audio.onerror = () => {
            playBtn.textContent = originalText;
            playBtn.disabled = false;
        };
        
    } catch (error) {
        console.error('Error playing sentence:', error);
        showError('Failed to play audio');
        
        // Reset button
        const playBtn = event.target;
        playBtn.textContent = '🔊';
        playBtn.disabled = false;
    }
}

// Function to convert context to speech (for automatic conversion)
async function convertContextToSpeech(context, word) {
    if (!context || !word) return;
    
    // Split context into sentences
    const sentences = context.split('\n').filter(s => s.trim());
    
    // Convert each sentence to speech
    for (const sentence of sentences) {
        if (sentence.trim()) {
            try {
                // Check if audio already exists first
                const encodedSentence = encodeURIComponent(sentence.trim());
                const checkResponse = await fetch(`/deepRemember/get-audio/${word.trim()}/${encodedSentence}`);
                const checkData = await checkResponse.json();
                
                if (checkData.success && checkData.exists) {
                    console.log(`[TTS] Audio already exists for: "${sentence.trim()}" -> ${checkData.audioUrl}`);
                    continue; // Skip if already exists
                }
                
                // Generate new audio if it doesn't exist
                const response = await fetch('/deepRemember/convert-to-speech', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        text: sentence.trim(), 
                        word: word.trim() 
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    console.log(`[TTS] Audio generated for: "${sentence.trim()}" -> ${data.audioUrl}`);
                } else {
                    console.warn(`[TTS] Failed to generate audio for: "${sentence.trim()}"`);
                }
            } catch (error) {
                console.warn(`[TTS] Error generating audio for: "${sentence.trim()}"`, error);
            }
        }
    }
}

// Global variables for sentence analysis
let currentAnalysisData = null;
let currentSentence = '';
let currentWord = '';

// Sentence Analysis Modal Functions
function showSentenceAnalysis(sentence, word = '') {
    const modal = document.getElementById('sentenceAnalysisModal');
    const sentenceText = document.getElementById('analysisSentenceText');
    
    // Store current analysis data
    currentSentence = sentence;
    currentWord = word;
    currentAnalysisData = null;
    
    // Display the sentence
    sentenceText.textContent = sentence;
    
    // Reset button states
    const saveBtn = document.getElementById('saveAnalysisBtn');
    const refreshBtn = document.getElementById('refreshAnalysisBtn');
    saveBtn.disabled = true;
    refreshBtn.disabled = true;
    
    // Show the modal
    modal.style.display = 'block';
    
    // Start analysis
    analyzeSentenceContent(sentence, word, false);
}

function hideSentenceAnalysis() {
    const modal = document.getElementById('sentenceAnalysisModal');
    modal.style.display = 'none';
}

async function analyzeSentenceContent(sentence, word, refresh = false) {
    const saveBtn = document.getElementById('saveAnalysisBtn');
    const refreshBtn = document.getElementById('refreshAnalysisBtn');
    
    try {
        // Disable buttons during analysis
        saveBtn.disabled = true;
        refreshBtn.disabled = true;
        saveBtn.textContent = '⏳ Analyzing...';
        refreshBtn.textContent = '⏳ Analyzing...';
        
        // Show loading states
        document.getElementById('sentenceTranslation').innerHTML = '<div class="loading-spinner">🔄 Analyzing...</div>';
        document.getElementById('grammaticalStructure').innerHTML = '<div class="loading-spinner">🔄 Analyzing...</div>';
        
        const response = await fetch('/deepRemember/analyze-sentence', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sentence, word, refresh })
        });
        
        const data = await response.json();
        
        if (data.success && data.analysis) {
            const analysis = data.analysis;
            currentAnalysisData = analysis; // Store for saving
            
            // Display translation
            document.getElementById('sentenceTranslation').innerHTML = 
                `<div class="analysis-content">${analysis.translation}</div>`;
            
            // Display grammatical structure
            const structure = analysis.grammaticalStructure;
            document.getElementById('grammaticalStructure').innerHTML = `
                <div class="analysis-content">
                    <div class="grammar-point">
                        <div class="grammar-point-title">Subject:</div>
                        <div class="grammar-point-explanation">${structure.subject}</div>
                    </div>
                    <div class="grammar-point">
                        <div class="grammar-point-title">Verb:</div>
                        <div class="grammar-point-explanation">${structure.verb}</div>
                    </div>
                    <div class="grammar-point">
                        <div class="grammar-point-title">Object:</div>
                        <div class="grammar-point-explanation">${structure.object}</div>
                    </div>
                    <div class="grammar-point">
                        <div class="grammar-point-title">Tense:</div>
                        <div class="grammar-point-explanation">${structure.tense}</div>
                    </div>
                    <div class="grammar-point">
                        <div class="grammar-point-title">Mood:</div>
                        <div class="grammar-point-explanation">${structure.mood}</div>
                    </div>
                    <div class="grammar-point">
                        <div class="grammar-point-title">Sentence Type:</div>
                        <div class="grammar-point-explanation">${structure.sentenceType}</div>
                    </div>
                </div>
            `;
            
            // Enable buttons after successful analysis
            saveBtn.disabled = false;
            refreshBtn.disabled = false;
            saveBtn.textContent = '💾 Save';
            refreshBtn.textContent = '🔄 Refresh';
            
        } else {
            // Handle error case
            document.getElementById('sentenceTranslation').innerHTML = 
                '<div class="analysis-content">❌ Translation analysis failed</div>';
            document.getElementById('grammaticalStructure').innerHTML = 
                '<div class="analysis-content">❌ Grammatical analysis failed</div>';
            
            // Re-enable buttons on error
            saveBtn.disabled = false;
            refreshBtn.disabled = false;
            saveBtn.textContent = '💾 Save';
            refreshBtn.textContent = '🔄 Refresh';
        }
    } catch (error) {
        console.error('Error analyzing sentence:', error);
        
        // Show error messages
        document.getElementById('sentenceTranslation').innerHTML = 
            '<div class="analysis-content">❌ Error loading translation</div>';
        document.getElementById('grammaticalStructure').innerHTML = 
            '<div class="analysis-content">❌ Error loading grammatical structure</div>';
        
        // Re-enable buttons on error
        saveBtn.disabled = false;
        refreshBtn.disabled = false;
        saveBtn.textContent = '💾 Save';
        refreshBtn.textContent = '🔄 Refresh';
    }
}

// Global function for analyzeSentence (called from HTML)
window.analyzeSentence = function(sentence, word) {
    showSentenceAnalysis(sentence, word);
};

// Save sentence analysis
async function saveSentenceAnalysis() {
    if (!currentAnalysisData) {
        alert('No analysis data to save');
        return;
    }

    const saveBtn = document.getElementById('saveAnalysisBtn');
    
    try {
        // Disable button during save
        saveBtn.disabled = true;
        saveBtn.textContent = '⏳ Saving...';
        
        const response = await fetch('/deepRemember/save-sentence-analysis', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                sentence: currentSentence, 
                word: currentWord, 
                analysis: currentAnalysisData 
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            saveBtn.textContent = '✅ Saved';
            setTimeout(() => {
                saveBtn.textContent = '💾 Save';
                saveBtn.disabled = false;
            }, 2000);
        } else {
            alert('Failed to save analysis: ' + (data.error || 'Unknown error'));
            saveBtn.textContent = '💾 Save';
            saveBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error saving analysis:', error);
        alert('Error saving analysis: ' + error.message);
        saveBtn.textContent = '💾 Save';
        saveBtn.disabled = false;
    }
}

// Refresh sentence analysis
function refreshSentenceAnalysis() {
    if (!currentSentence) {
        alert('No sentence to refresh');
        return;
    }
    
    // Re-analyze with refresh flag
    analyzeSentenceContent(currentSentence, currentWord, true);
}

// Global functions for buttons (called from HTML)
window.saveSentenceAnalysis = saveSentenceAnalysis;
window.refreshSentenceAnalysis = refreshSentenceAnalysis;