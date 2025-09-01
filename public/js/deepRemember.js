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

// Close modals when clicking outside
document.addEventListener('DOMContentLoaded', function() {
    const userSetupModal = document.getElementById('userSetupModal');
    const createCardModal = document.getElementById('createCardModal');
    
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
    document.getElementById('cardTranslation').textContent = card.translation || '';
    document.getElementById('cardContext').innerHTML = formatContextWithPlayButtons(card.context, card.word);
    document.getElementById('cardContext').className = 'context-display';
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
        return `<span class="sentence">${sentences[0]}</span> <button class="play-btn" onclick="playSentence('${sentences[0].replace(/'/g, "\\'")}', '${word}')">🔊</button>`;
    }
    
    // Format multiple sentences with dot delimiters and play buttons
    return sentences.map((sentence, index) => 
        `<span class="sentence">${index + 1}. ${sentence.trim()}</span> <button class="play-btn" onclick="playSentence('${sentence.trim().replace(/'/g, "\\'")}', '${word}')">🔊</button>`
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