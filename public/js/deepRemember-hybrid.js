/**
 * deepRemember-hybrid.js - Hybrid version of deepRemember.js with React components
 * This file integrates React components while keeping vanilla JS functionality
 */

// Import React components (they should be loaded before this script)
// Make sure to include:
// - React, ReactDOM
// - CardReviewComponent.jsx
// - CreateCardModal.jsx
// - ReactIntegration.js

// Keep all the original vanilla JS functionality
let currentUserId = 'user123';
let currentCards = [];
let currentCardIndex = 0;
let isCardsView = false;

// React component state
let cardReviewComponent = null;
let createCardModalComponent = null;

// Initialize React components
function initializeReactComponents() {
    // Wait for React components to be loaded
    if (typeof window.CardReviewComponent === 'undefined' || 
        typeof window.CreateCardModal === 'undefined' ||
        typeof window.ReactIntegration === 'undefined') {
        console.log('React components not yet loaded, retrying...');
        setTimeout(initializeReactComponents, 100);
        return;
    }

    console.log('Initializing DeepRemember React components...');

    // Mount CardReviewComponent
    cardReviewComponent = mountReactComponent(
        window.CardReviewComponent,
        'reviewSection',
        {
            cards: currentCards,
            currentCardIndex: currentCardIndex,
            onAnswerCard: answerCard,
            onShowAnswer: showAnswer
        }
    );

    // Mount CreateCardModal
    createCardModalComponent = mountReactComponent(
        window.CreateCardModal,
        'createCardModal',
        {
            isOpen: false,
            onClose: hideCreateCard,
            onCreateCard: createCard,
            currentUserId: currentUserId
        }
    );

    console.log('DeepRemember React components initialized');
}

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
    // Update React component to show modal
    if (createCardModalComponent) {
        updateReactComponent('createCardModal', {
            isOpen: true,
            onClose: hideCreateCard,
            onCreateCard: createCard,
            currentUserId: currentUserId
        });
    } else {
        // Fallback to vanilla JS modal
        document.getElementById('createCardModal').style.display = 'block';
    }
}

function hideCreateCard() {
    // Update React component to hide modal
    if (createCardModalComponent) {
        updateReactComponent('createCardModal', {
            isOpen: false,
            onClose: hideCreateCard,
            onCreateCard: createCard,
            currentUserId: currentUserId
        });
    } else {
        // Fallback to vanilla JS modal
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
}

// Help modal functions
function showHelp() {
    document.getElementById('helpModal').style.display = 'block';
}

function hideHelp() {
    document.getElementById('helpModal').style.display = 'none';
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
async function createCard(formData) {
    const word = formData?.word || document.getElementById('newWord').value;
    const translation = formData?.translation || document.getElementById('newTranslation').value;
    const context = formData?.context || document.getElementById('newContext').value;
    
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
            if (formData) {
                // React component will handle clearing
            } else {
                document.getElementById('newWord').value = '';
                document.getElementById('newTranslation').value = '';
                document.getElementById('newContext').value = '';
            }
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
                // Update React component
                if (cardReviewComponent) {
                    updateReactComponent('reviewSection', {
                        cards: currentCards,
                        currentCardIndex: currentCardIndex,
                        onAnswerCard: answerCard,
                        onShowAnswer: showAnswer
                    });
                } else {
                    // Fallback to vanilla JS
                    document.getElementById('reviewSection').style.display = 'block';
                    showCurrentCard();
                }
            } else {
                // Update React component
                if (cardReviewComponent) {
                    updateReactComponent('reviewSection', {
                        cards: [],
                        currentCardIndex: 0,
                        onAnswerCard: answerCard,
                        onShowAnswer: showAnswer
                    });
                } else {
                    // Fallback to vanilla JS
                    document.getElementById('reviewSection').style.display = 'none';
                    showSuccess('No cards due for review!');
                }
            }
        }
    } catch (error) {
        console.error('Error loading review cards:', error);
        showError('Failed to load review cards');
    }
}

// Show current card (vanilla JS fallback)
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
}

// Show answer function (vanilla JS fallback)
function showAnswer() {
    const answerBtn = document.getElementById('answerBtn');
    
    // Get the original translation and context
    const originalTranslation = document.getElementById('cardTranslation').getAttribute('data-original');
    const originalContext = document.getElementById('cardContext').getAttribute('data-original');
    
    // Show the translation and context
    document.getElementById('cardTranslation').textContent = originalTranslation;
    document.getElementById('cardContext').innerHTML = formatContextWithPlayButtonsLocal(originalContext, document.getElementById('cardWord').textContent);
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
            // Move to next card
            currentCardIndex++;
            
            // Update React component
            if (cardReviewComponent) {
                updateReactComponent('reviewSection', {
                    cards: currentCards,
                    currentCardIndex: currentCardIndex,
                    onAnswerCard: answerCard,
                    onShowAnswer: showAnswer
                });
            } else {
                // Fallback to vanilla JS
                showCurrentCard();
            }
            
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
        console.log('[DeepRemember] Loading all cards for user:', currentUserId);
        const response = await fetch(`/deepRemember/all-cards/${currentUserId}`);
        const data = await response.json();
        
        console.log('[DeepRemember] Cards response:', data);
        
        if (data.success) {
            const allCardsDiv = document.getElementById('allCards');
            if (data.cards.length === 0) {
                allCardsDiv.innerHTML = '<p>No cards created yet.</p>';
                return;
            }
            
            // Check if formatContextWithPlayButtons is available
            if (typeof formatContextWithPlayButtons !== 'function') {
                console.warn('[DeepRemember] formatContextWithPlayButtons not available, using fallback');
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
                        <p><strong>Context:</strong> <span id="card-context-${card.id}">${formatContextWithPlayButtonsLocal(card.context, card.word)}</span></p>
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
        console.error('Error details:', error.message, error.stack);
        showError('Failed to load cards: ' + error.message);
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
            document.getElementById(`card-context-${cardId}`).innerHTML = formatContextWithPlayButtonsLocal(context.trim(), word.trim());
            
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
// Format context with play buttons - delegate to InteliSentence module
function formatContextWithPlayButtonsLocal(context, word = '') {
    if (!context) return '';
    
    // Use the InteliSentence module function
    if (typeof window.formatContextWithPlayButtons === 'function') {
        return window.formatContextWithPlayButtons(context, word);
    }
    
    // Fallback: basic formatting if InteliSentence module not loaded
    const sentences = context.split('\n').filter(s => s.trim());
    if (sentences.length === 1) {
        return `<span class="intelSentence">
            <span class="sentence">${sentences[0]}</span> 
            <button class="play-btn" onclick="playSentence('${sentences[0].replace(/'/g, "\\'")}', '${word}')">🔊</button> 
            <span class="sentence-number-circle">1</span>
            <button class="intel-btn" onclick="analyzeSentence('${sentences[0].replace(/'/g, "\\'")}', '${word}')" title="Analyze sentence">✨</button>
        </span>`;
    }
    
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

// Close modals when clicking outside
document.addEventListener('DOMContentLoaded', function() {
    const userSetupModal = document.getElementById('userSetupModal');
    const helpModal = document.getElementById('helpModal');
    
    userSetupModal.addEventListener('click', function(e) {
        if (e.target === userSetupModal) {
            hideUserSetup();
        }
    });
    
    helpModal.addEventListener('click', function(e) {
        if (e.target === helpModal) {
            hideHelp();
        }
    });
    
    // Initialize InteliSentence module
    initializeInteliSentence();
    
    // Show user setup modal on page load
    showUserSetup();
    
    // Initialize React components
    initializeReactComponents();
});
