/**
 * app-hybrid.js - Hybrid version of app.js with React components
 * This file integrates React components while keeping vanilla JS functionality
 */

// Import React components (they should be loaded before this script)
// Make sure to include:
// - React, ReactDOM
// - SubtitleDisplay.jsx
// - PlaylistComponent.jsx
// - ReactIntegration.js

// Keep all the original vanilla JS functionality
// Regex for SRT time format
const SRT_TIME_REGEX = new RegExp('(\\d{2}):(\\d{2}):(\\d{2}),(\\d{3}) --> (\\d{2}):(\\d{2}):(\\d{2}),(\\d{3})');

let mediaElement = null;
let subtitles = [];
let currentSubtitleIndex = -1;
let mediaFile = null;
let subtitleFile = null;

// React component state
let subtitleDisplayComponent = null;
let playlistComponent = null;

// Initialize React components
function initializeReactComponents() {
    // Wait for React components to be loaded
    if (typeof window.SubtitleDisplay === 'undefined' || 
        typeof window.PlaylistComponent === 'undefined' ||
        typeof window.ReactIntegration === 'undefined') {
        console.log('React components not yet loaded, retrying...');
        setTimeout(initializeReactComponents, 100);
        return;
    }

    console.log('Initializing React components...');

    // Mount SubtitleDisplay component
    subtitleDisplayComponent = mountReactComponent(
        window.SubtitleDisplay,
        'subtitleDisplay',
        {
            subtitles: subtitles,
            currentSubtitleIndex: currentSubtitleIndex,
            onWordClick: addWordToCards
        }
    );

    // Mount PlaylistComponent
    playlistComponent = mountReactComponent(
        window.PlaylistComponent,
        'playlistSection',
        {
            onPlayItem: handlePlaylistItem,
            onDeleteItem: showSuccess
        }
    );

    console.log('React components initialized');
}

// Handle playlist item play
function handlePlaylistItem(item) {
    // Use the main player in .media-player
    const playerContainer = document.getElementById('mediaPlayer');
    playerContainer.innerHTML = '';
    let mediaType = item.media.match(/\.(mp4|webm)$/i) ? 'video' : 'audio';
    let player;
    
    if (mediaType === 'video') {
        player = document.createElement('video');
        player.controls = true;
        player.style.maxHeight = '400px';
    } else {
        player = document.createElement('audio');
        player.controls = true;
    }
    
    player.style.width = '100%';
    player.style.borderRadius = '15px';
    player.src = '/files/' + item.media;

    // Remove any previous subtitle logic
    player.addEventListener('timeupdate', updateSubtitles);
    player.addEventListener('loadedmetadata', () => {
        showSuccess('Media loaded: ' + item.media);
    });

    // Add subtitle track if available
    if (item.subtitle) {
        let track = document.createElement('track');
        track.kind = 'subtitles';
        track.label = 'Subtitle';
        track.srclang = 'en';
        track.src = '/files/' + item.subtitle;
        track.default = true;
        player.appendChild(track);

        // Also load and parse the subtitle file for custom display
        fetch('/files/' + item.subtitle)
            .then(res => res.text())
            .then(content => {
                subtitleFile = { name: item.subtitle };
                parseSubtitles(content);
                displaySubtitleInfo();
                
                // Update React component
                if (subtitleDisplayComponent) {
                    updateReactComponent('subtitleDisplay', {
                        subtitles: subtitles,
                        currentSubtitleIndex: currentSubtitleIndex,
                        onWordClick: addWordToCards
                    });
                }
            });
    } else {
        subtitles = [];
        subtitleFile = { name: '' };
        displaySubtitleInfo();
        
        // Update React component
        if (subtitleDisplayComponent) {
            updateReactComponent('subtitleDisplay', {
                subtitles: subtitles,
                currentSubtitleIndex: currentSubtitleIndex,
                onWordClick: addWordToCards
            });
        }
    }

    playerContainer.appendChild(player);
    mediaElement = player;
    currentSubtitleIndex = -1;
    player.load();
    player.play();
}

function loadFiles() {
    console.log('Loading files...');
    uploadFiles();
    const mediaInput = document.getElementById('mediaFile');
    const subtitleInput = document.getElementById('subtitleFile');
    
    mediaFile = mediaInput.files[0];
    subtitleFile = subtitleInput.files[0];

    if (!mediaFile) {
        showError('Please select a media file first.');
        return;
    }

    createMediaElement();
    
    if (subtitleFile) {
        loadSubtitles();
    } else {
        showSuccess('Media file loaded successfully! Subtitle file is optional.');
    }
}

async function uploadFiles(){
    console.log('Uploading files...');
    const mediaInput = document.getElementById('mediaFile');
    const subtitleInput = document.getElementById('subtitleFile');
    
    if (!mediaInput.files[0]) {
        alert('Please select a media file.');
        return;
    }

    // Check if subtitle file is provided
    const hasSubtitleFile = subtitleInput.files[0];
    
    if (hasSubtitleFile) {
        // Original logic for both files
        const mediaFileName = mediaInput.files[0].name;
        const mediaBaseName = mediaFileName.substring(0, mediaFileName.lastIndexOf('.'));
        
        const subtitleFileName = subtitleInput.files[0].name;
        const subtitleExtension = subtitleFileName.substring(subtitleFileName.lastIndexOf('.'));
        
        const renamedSubtitleFile = new File([subtitleInput.files[0]], mediaBaseName + subtitleExtension, {
            type: subtitleInput.files[0].type
        });
        
        const formData = new FormData();
        formData.append('mediaFile', mediaInput.files[0]);
        formData.append('subtitleFile', renamedSubtitleFile);

        try {
            const response = await fetch('/upload-files', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (result.success) {
                alert('Files uploaded successfully!');
                // Refresh playlist component
                if (playlistComponent) {
                    updateReactComponent('playlistSection', {
                        onPlayItem: handlePlaylistItem,
                        onDeleteItem: showSuccess
                    });
                }
            } else {
                alert('Upload failed: ' + (result.error || 'Unknown error'));
            }
        } catch (err) {
            alert('Error uploading files: ' + err.message);
        }
    } else {
        // Audio-only upload with Whisper subtitle generation
        const mediaFile = mediaInput.files[0];
        const mediaFileName = mediaFile.name;
        
        // Check if it's an audio file
        if (!mediaFile.type.startsWith('audio/')) {
            alert('Please select an audio file for automatic subtitle generation.');
            return;
        }

        // Show loading message
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'success';
        loadingDiv.textContent = 'Please wait for converting...';
        document.querySelector('.content').insertBefore(loadingDiv, document.querySelector('.controls'));

        const formData = new FormData();
        formData.append('mediaFile', mediaFile);
        formData.append('generateSubtitle', 'true');

        try {
            const response = await fetch('/upload-files', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            
            // Remove loading message
            loadingDiv.remove();
            
            if (result.success) {
                alert('Audio uploaded and subtitle generated successfully!');
                // Refresh playlist component
                if (playlistComponent) {
                    updateReactComponent('playlistSection', {
                        onPlayItem: handlePlaylistItem,
                        onDeleteItem: showSuccess
                    });
                }
            } else {
                alert('Upload failed: ' + (result.error || 'Unknown error'));
            }
        } catch (err) {
            loadingDiv.remove();
            alert('Error uploading files: ' + err.message);
        }
    }
}

function createMediaElement() {
    const playerContainer = document.getElementById('mediaPlayer');
    playerContainer.innerHTML = '';

    const mediaUrl = URL.createObjectURL(mediaFile);
    
    if (mediaFile.type.startsWith('video/')) {
        mediaElement = document.createElement('video');
        mediaElement.controls = true;
        mediaElement.style.maxHeight = '400px';
    } else {
        mediaElement = document.createElement('audio');
        mediaElement.controls = true;
    }

    mediaElement.src = mediaUrl;
    mediaElement.style.width = '100%';
    mediaElement.style.borderRadius = '15px';
    
    mediaElement.addEventListener('timeupdate', updateSubtitles);
    mediaElement.addEventListener('loadedmetadata', () => {
        showSuccess('Media loaded: ' + mediaFile.name);
    });

    playerContainer.appendChild(mediaElement);
}

function loadSubtitles() {
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        parseSubtitles(content);
    };
    reader.readAsText(subtitleFile);
}

function parseSubtitles(content) {
    subtitles = [];
    const lines = content.split('\n');
    let currentSubtitle = null;
    let lineNumber = 0;
    let isVTT = false;

    // Detect format by checking first few lines
    for (let i = 0; i < Math.min(10, lines.length); i++) {
        const line = lines[i].trim();
        if (line.includes('WEBVTT') || line.match(/^\d{2}:\d{2}\.\d{3}/)) {
            isVTT = true;
            break;
        }
    }

    // VTT regex for time format HH:MM.SSS --> HH:MM.SSS
    const VTT_TIME_REGEX = new RegExp('(\\d{2}):(\\d{2})\\.(\\d{3}) --> (\\d{2}):(\\d{2})\\.(\\d{3})');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line === '' || line === 'WEBVTT' || line.startsWith('NOTE')) continue;
        
        if (isVTT) {
            // VTT parsing
            const timeMatch = line.match(VTT_TIME_REGEX);
            if (timeMatch) {
                if (currentSubtitle) {
                    subtitles.push(currentSubtitle);
                }
                currentSubtitle = { 
                    number: subtitles.length + 1, 
                    text: '', 
                    start: parseVTTTime(timeMatch.slice(1, 4)), 
                    end: parseVTTTime(timeMatch.slice(4, 7)) 
                };
                lineNumber = 0;
            } else if (currentSubtitle && lineNumber >= 0) {
                // Subtitle text
                if (currentSubtitle.text) {
                    currentSubtitle.text += ' ' + line;
                } else {
                    currentSubtitle.text = line;
                }
                lineNumber++;
            }
        } else {
            // SRT parsing (original logic)
            if (/^\d+$/.test(line)) {
                if (currentSubtitle) {
                    subtitles.push(currentSubtitle);
                }
                currentSubtitle = { number: parseInt(line), text: '', start: 0, end: 0 };
                lineNumber = 0;
            } else if (currentSubtitle && lineNumber === 0) {
                const timeMatch = line.match(SRT_TIME_REGEX);
                if (timeMatch) {
                    currentSubtitle.start = parseTime(timeMatch.slice(1, 5));
                    currentSubtitle.end = parseTime(timeMatch.slice(5, 9));
                    lineNumber++;
                }
            } else if (currentSubtitle && lineNumber > 0) {
                if (currentSubtitle.text) {
                    currentSubtitle.text += ' ' + line;
                } else {
                    currentSubtitle.text = line;
                }
            }
        }
    }
    
    if (currentSubtitle) {
        subtitles.push(currentSubtitle);
    }

    showSuccess('Loaded ' + subtitles.length + ' subtitles from ' + subtitleFile.name + ' (' + (isVTT ? 'VTT' : 'SRT') + ' format)');
    displaySubtitleInfo();
    
    // Update React component
    if (subtitleDisplayComponent) {
        updateReactComponent('subtitleDisplay', {
            subtitles: subtitles,
            currentSubtitleIndex: currentSubtitleIndex,
            onWordClick: addWordToCards
        });
    }
}

function parseVTTTime(timeParts) {
    const minutes = parseInt(timeParts[0]);
    const seconds = parseInt(timeParts[1]);
    const milliseconds = parseInt(timeParts[2]);
    return minutes * 60 + seconds + milliseconds / 1000;
}

function parseTime(timeParts) {
    const hours = parseInt(timeParts[0]);
    const minutes = parseInt(timeParts[1]);
    const seconds = parseInt(timeParts[2]);
    const milliseconds = parseInt(timeParts[3]);
    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

function updateSubtitles() {
    if (!mediaElement || subtitles.length === 0) return;

    const currentTime = mediaElement.currentTime;
    let subtitleIndex = -1;

    for (let i = 0; i < subtitles.length; i++) {
        if (currentTime >= subtitles[i].start && currentTime <= subtitles[i].end) {
            subtitleIndex = i;
            break;
        }
    }

    if (subtitleIndex !== currentSubtitleIndex) {
        currentSubtitleIndex = subtitleIndex;
        updateSubtitleList();
        
        // Update React component
        if (subtitleDisplayComponent) {
            updateReactComponent('subtitleDisplay', {
                subtitles: subtitles,
                currentSubtitleIndex: currentSubtitleIndex,
                onWordClick: addWordToCards
            });
        }
    }
}

function displaySubtitleInfo() {
    const subtitleInfo = document.getElementById('subtitleInfo');
    const subtitleStats = document.getElementById('subtitleStats');
    const subtitleList = document.getElementById('subtitleList');

    const duration = subtitles.length > 0 ? formatTime(subtitles[subtitles.length - 1].end) : 'N/A';
    subtitleStats.innerHTML = '<p><strong>Total subtitles:</strong> ' + subtitles.length + '</p>' +
                            '<p><strong>Duration:</strong> ' + duration + '</p>';

    subtitleList.innerHTML = '';
    subtitles.forEach((subtitle, index) => {
        const item = document.createElement('div');
        item.className = 'subtitle-item';
        const timeRange = formatTime(subtitle.start) + ' - ' + formatTime(subtitle.end);
        item.innerHTML = '<div class="subtitle-time">' + timeRange + '</div>' +
                       '<div class="subtitle-content">' + subtitle.text + '</div>';
        item.onclick = () => seekToSubtitle(index);
        subtitleList.appendChild(item);
    });

    subtitleInfo.style.display = 'block';
}

function updateSubtitleList() {
    const items = document.querySelectorAll('.subtitle-item');
    items.forEach((item, index) => {
        const isActive = index === currentSubtitleIndex;
        item.classList.toggle('active', isActive);
        if (isActive) {
            item.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
}

function seekToSubtitle(index) {
    if (mediaElement && subtitles[index]) {
        mediaElement.currentTime = subtitles[index].start;
    }
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return hours.toString().padStart(2, '0') + ':' + 
           minutes.toString().padStart(2, '0') + ':' + 
           secs.toString().padStart(2, '0') + ',' + 
           ms.toString().padStart(3, '0');
}

function togglePlayPause() {
    if (mediaElement) {
        if (mediaElement.paused) {
            mediaElement.play();
        } else {
            mediaElement.pause();
        }
    }
}

function skipForward() {
    if (mediaElement) {
        mediaElement.currentTime += 10;
    }
}

function skipBackward() {
    if (mediaElement) {
        mediaElement.currentTime -= 10;
    }
}

function toggleMute() {
    if (mediaElement) {
        mediaElement.muted = !mediaElement.muted;
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    document.querySelector('.content').insertBefore(errorDiv, document.querySelector('.controls'));
    setTimeout(() => errorDiv.remove(), 5000);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success';
    successDiv.textContent = message;
    document.querySelector('.content').insertBefore(successDiv, document.querySelector('.controls'));
    setTimeout(() => successDiv.remove(), 5000);
}

// Sentence translation display logic
let ctrlPressed = false;
document.addEventListener('keydown', async function(e) {
    if (e.key === 'Control' && !ctrlPressed) {
        ctrlPressed = true;
        const translationDiv = document.getElementById('sentenceTranslationDisplay');
        translationDiv.classList.add('active');
        translationDiv.textContent = 'Loading translation...';
        // Get current subtitle sentence
        let sentence = '';
        if (currentSubtitleIndex >= 0 && subtitles[currentSubtitleIndex]) {
            sentence = subtitles[currentSubtitleIndex].text;
        }
        if (!sentence) {
            translationDiv.textContent = 'No sentence to translate.';
            return;
        }
        try {
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama3.2',
                    prompt: `answer in this format {"translation":"string", "sentence":"realSentence"} , what is the translation of "${sentence}"`,
                    stream: false
                })
            });
            const data = await response.json();
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
            translationDiv.textContent = translation;
        } catch (err) {
            translationDiv.textContent = 'Error fetching translation.';
        }
    }
});
document.addEventListener('keyup', function(e) {
    if (e.key === 'Control') {
        ctrlPressed = false;
        const translationDiv = document.getElementById('sentenceTranslationDisplay');
        translationDiv.classList.remove('active');
        translationDiv.textContent = '';
    }
});

// Function to add word to cards (opens create-new-card dialog)
function addWordToCards(word) {
    // Clean the word (remove punctuation, trim whitespace)
    const cleanWord = word.replace(/[^\w\s]/g, '').trim();
    
    if (!cleanWord) {
        alert('Please select a valid word');
        return;
    }
    
    // Open the create-new-card dialog
    if (typeof showCreateCard === 'function') {
        showCreateCard();
        
        // Populate the word field
        const wordInput = document.getElementById('newWord');
        if (wordInput) {
            wordInput.value = cleanWord;
            // Trigger the word blur event to get translation
            wordInput.dispatchEvent(new Event('blur'));
        }
    } else {
        // If deepRemember functions are not available, redirect to deepRemember page
        window.location.href = '/deepRemember';
    }
}

// Initialize React components when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize React components
    initializeReactComponents();
});
