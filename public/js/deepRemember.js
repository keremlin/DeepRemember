let currentUserId = 'user123';
let currentCards = [];
let currentCardIndex = 0;

// Modal functions
function showUserSetup() {
    document.getElementById('userSetupModal').style.display = 'block';
}

function hideUserSetup() {
    document.getElementById('userSetupModal').style.display = 'none';
}

// Close modal when clicking outside
document.addEventListener('DOMContentLoaded', function() {
    const modalOverlay = document.getElementById('userSetupModal');
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) {
            hideUserSetup();
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
            showSuccess('Card created successfully!');
            document.getElementById('newWord').value = '';
            document.getElementById('newTranslation').value = '';
            document.getElementById('newContext').value = '';
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
    document.getElementById('cardContext').textContent = card.context || '';
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
        const response = await fetch(`/deepRemember/review-cards/${currentUserId}`);
        const data = await response.json();
        
        if (data.success) {
            const allCardsDiv = document.getElementById('allCards');
            if (data.cards.length === 0) {
                allCardsDiv.innerHTML = '<p>No cards created yet.</p>';
                return;
            }
            
            allCardsDiv.innerHTML = data.cards.map(card => `
                <div class="srs-card" style="margin: 10px 0; padding: 15px;">
                    <h4>${card.word}</h4>
                    <p><strong>Translation:</strong> ${card.translation || 'N/A'}</p>
                    <p><strong>Context:</strong> ${card.context || 'N/A'}</p>
                    <p><strong>Due:</strong> ${new Date(card.due).toLocaleString()}</p>
                    <p><strong>State:</strong> ${getStateName(card.state)}</p>
                    <button class="btn btn-delete" onclick="deleteCard('${card.id}')">Delete</button>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading all cards:', error);
        showError('Failed to load cards');
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