/**
 * InteliSentence.js - Intelligent Sentence Analysis Module
 * 
 * This module handles all functionality related to sentence analysis,
 * including the magic wand buttons, modal management, and AI-powered
 * sentence analysis features.
 */

// Global variables for sentence analysis
let currentAnalysisData = null;
let currentSentence = '';
let currentWord = '';

/**
 * Load sentence analysis modal content dynamically
 */
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

/**
 * Format context with play buttons and intelligent sentence analysis buttons
 * This function wraps each sentence in an intelSentence container with magic wand buttons
 */
function formatContextWithPlayButtons(context, word) {
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

/**
 * Show sentence analysis modal
 */
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

/**
 * Hide sentence analysis modal
 */
function hideSentenceAnalysis() {
    const modal = document.getElementById('sentenceAnalysisModal');
    modal.style.display = 'none';
}

/**
 * Analyze sentence content with AI
 */
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
            
            // Display grammatical structure as a tree
            const structure = analysis.grammaticalStructure;
            document.getElementById('grammaticalStructure').innerHTML = `
                <div class="analysis-content">
                    ${renderGrammaticalTree(structure)}
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

/**
 * Save sentence analysis to database
 */
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

/**
 * Render grammatical structure as a traditional tree diagram
 */
function renderGrammaticalTree(structure) {
    if (!structure) return '<div class="analysis-content">❌ No grammatical structure available</div>';
    
    const treeHTML = `
        <div class="grammar-tree">
            <div class="tree-container">
                <div class="tree-structure">
                    <!-- Level 1: Sentence -->
                    <div class="tree-level tree-level-1">
                        <div class="tree-node sentence">Sentence</div>
                    </div>
                    
                    <!-- Level 2: Main Components -->
                    <div class="tree-level tree-level-2">
                        <div class="tree-branch">
                            <div class="tree-node subject">Subject</div>
                        </div>
                        <div class="tree-branch">
                            <div class="tree-node verb">Verb</div>
                        </div>
                        ${structure.object ? `
                            <div class="tree-branch">
                                <div class="tree-node object">Object</div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- Level 3: Individual Words -->
                    <div class="tree-level tree-level-3">
                        <div class="tree-word">${structure.subject}</div>
                        <div class="tree-word">${structure.verb}</div>
                        ${structure.object ? `<div class="tree-word">${structure.object}</div>` : ''}
                    </div>
                    
                    <!-- Additional Information -->
                    <div class="tree-level tree-level-3">
                        <div class="tree-node modifier">Tense: ${structure.tense}</div>
                        ${structure.mood ? `<div class="tree-node modifier">Mood: ${structure.mood}</div>` : ''}
                        ${structure.sentenceType ? `<div class="tree-node modifier">Type: ${structure.sentenceType}</div>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return treeHTML;
}

/**
 * Get additional details for tree nodes
 */
function getNodeDetails(type) {
    const details = {
        'subject': 'Who/What performs the action',
        'verb': 'The action or state',
        'object': 'What receives the action',
        'modifier': 'Additional information',
        'connector': 'Sentence classification'
    };
    
    return details[type] || '';
}

/**
 * Handle keyboard shortcuts for sentence analysis
 * This function should be called from the main keyboard handler
 */
function handleInteliSentenceKeyboard(event, cardContext) {
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
    }
}

/**
 * Initialize InteliSentence module
 * This function should be called when the DOM is ready
 */
function initializeInteliSentence() {
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
}

// Global functions for HTML onclick handlers
window.analyzeSentence = function(sentence, word) {
    showSentenceAnalysis(sentence, word);
};

window.saveSentenceAnalysis = saveSentenceAnalysis;
window.refreshSentenceAnalysis = refreshSentenceAnalysis;
window.hideSentenceAnalysis = hideSentenceAnalysis;
window.formatContextWithPlayButtons = formatContextWithPlayButtons;
window.handleInteliSentenceKeyboard = handleInteliSentenceKeyboard;

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadSentenceAnalysisModal,
        formatContextWithPlayButtons,
        showSentenceAnalysis,
        hideSentenceAnalysis,
        analyzeSentenceContent,
        saveSentenceAnalysis,
        refreshSentenceAnalysis,
        handleInteliSentenceKeyboard,
        initializeInteliSentence
    };
}
