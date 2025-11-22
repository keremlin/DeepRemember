const express = require('express');
const { FSRS } = require('ts-fsrs');
const databaseFactory = require('../database/access/DatabaseFactory');
const dbConfig = require('../config/database');
const { initializeSampleData } = require('../database/sampledata/sampleCardData');
const AuthMiddleware = require('../security/authMiddleware');
const path = require('path'); // Added for file path handling
const FileSystemFactory = require('../filesystem/FileSystemFactory');
const fileSystem = FileSystemFactory.createDefault();
const crypto = require('crypto'); // Added for hash generation
const TtsFactory = require('../tts/TtsFactory');
const SstFactory = require('../stt/SstFactory');
const appConfig = require('../config/app');
const fs = require('fs');
const multer = require('multer');
const { upload } = require('../middleware/uploadConfig');

const router = express.Router();
const { LlmFactory } = require('../llm/LlmFactory');
const llmClient = LlmFactory.create();
const authMiddleware = new AuthMiddleware();

// Initialize TTS service with configuration
const ttsService = TtsFactory.createTtsService();
// Initialize STT service with configuration
const sstService = SstFactory.createSstService();

/**
 * Clean text for TTS - removes markdown and keeps only letters, numbers, periods, commas, and question marks
 * @param {string} text - Text to clean
 * @returns {string} - Cleaned text suitable for TTS
 */
function cleanTextForTTS(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Remove markdown formatting (**, *, _, etc.)
  let cleaned = text
    .replace(/\*\*/g, '') // Remove bold markdown
    .replace(/\*/g, '') // Remove italic markdown
    .replace(/_/g, '') // Remove underline markdown
    .replace(/`/g, '') // Remove code markdown
    .replace(/#{1,6}\s/g, '') // Remove heading markdown
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links, keep text
    .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '') // Remove images
    .replace(/•/g, '') // Remove bullet points
    .replace(/- /g, '') // Remove list markers
    .replace(/\n{2,}/g, '. ') // Replace multiple newlines with period and space
    .replace(/\n/g, ' ') // Replace single newlines with space
    .trim();

  // Keep only letters, numbers, spaces, periods (.), commas (,), and question marks (?)
  cleaned = cleaned.replace(/[^a-zA-Z0-9\s.,?]/g, ' ');

  // Clean up multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

// Initialize FSRS instance
const fsrs = new FSRS();

// Store for user cards (fallback to memory if database fails)
const userCards = new Map();
let deepRememberRepository = null;
let useDatabase = false;

// Initialize database and sample data
async function initializeDatabase() {
  try {
    console.log('[DeepRemember] Initializing database...');
    deepRememberRepository = await databaseFactory.initialize(dbConfig.type, dbConfig[dbConfig.type]);
    useDatabase = true;
    console.log('[DeepRemember] Database initialized successfully');
    
    // Migrate sample data to database
    if (dbConfig.migration.autoMigrate) {
      await deepRememberRepository.migrateFromMemory(userCards);
      console.log('[DeepRemember] Sample data migrated to database');
    }
  } catch (error) {
    console.error('[DeepRemember] Database initialization failed, falling back to memory storage:', error);
    useDatabase = false;
    // Initialize sample data in memory as fallback
    initializeSampleData(userCards, 'user123');
  }
}

// Initialize database and sample data on startup
initializeDatabase();

// Initialize system labels when database is ready
async function initializeSystemLabels() {
  try {
    if (useDatabase && deepRememberRepository) {
      await deepRememberRepository.initializeSystemLabels();
      console.log('[DeepRemember] System labels initialization completed');
    } else {
      console.log('[DeepRemember] System labels initialization skipped (using memory mode)');
    }
  } catch (error) {
    console.error('[DeepRemember] Failed to initialize system labels:', error);
  }
}

// Initialize system labels after database initialization with retry mechanism
async function initializeSystemLabelsWithRetry() {
  let attempts = 0;
  const maxAttempts = 5;
  
  while (attempts < maxAttempts) {
    try {
      if (useDatabase && deepRememberRepository) {
        await deepRememberRepository.initializeSystemLabels();
        console.log('[DeepRemember] System labels initialization completed');
        return;
      } else {
        console.log('[DeepRemember] System labels initialization skipped (using memory mode)');
        return;
      }
    } catch (error) {
      attempts++;
      console.warn(`[DeepRemember] System labels initialization attempt ${attempts} failed:`, error.message);
      
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000 * attempts)); // Exponential backoff
      } else {
        console.error('[DeepRemember] Failed to initialize system labels after all attempts');
      }
    }
  }
}

// Initialize system labels after database initialization
setTimeout(initializeSystemLabelsWithRetry, 2000);

// Function to generate hash for sentence analysis caching
function generateSentenceHash(sentence, word = '') {
    const normalizedSentence = sentence.toLowerCase().trim();
    const normalizedWord = word.toLowerCase().trim();
    const combined = `${normalizedSentence}|${normalizedWord}`;
    return crypto.createHash('sha256').update(combined).digest('hex');
}

// Create a new card for learning
router.post('/create-card', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { word, translation, context, type, labels } = req.body;
    const userId = req.userId; // Get userId from authenticated user
    
    if (!word) {
      return res.status(400).json({ error: 'word is required' });
    }

    // Create a new card with basic FSRS structure
    const cardData = {
      id: `card_${Date.now()}`,
      word,
      translation: translation || '',
      context: context || '',
      state: 0, // Learning state
      due: new Date().toISOString(),
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      created: new Date().toISOString()
    };

    if (useDatabase && deepRememberRepository) {
      // Use database
      const result = await deepRememberRepository.createCard(userId, cardData);
      
      const addedLabels = [];
      const failedLabels = [];
      
      // Step 1: Automatically associate card with appropriate system label based on type
      // This should ALWAYS happen if type is provided, regardless of user labels
      if (type) {
        try {
          // Get system labels to find the appropriate label ID
          const systemLabels = await deepRememberRepository.getSystemLabels();
          const labelToAdd = systemLabels.find(label => label.name === type);
          
          if (labelToAdd) {
            try {
              await deepRememberRepository.addLabelToCard(userId, result.id, labelToAdd.id);
              addedLabels.push({ id: labelToAdd.id, name: labelToAdd.name, type: 'system' });
              console.log(`[DeepRemember] Successfully added system label "${type}" (ID: ${labelToAdd.id}) to card ${result.id}`);
            } catch (addError) {
              // Check if it's a duplicate error (label already exists on card)
              // Different databases return different error messages/codes for UNIQUE constraint violations
              const errorMsg = addError.message || '';
              const errorCode = addError.code || '';
              const isDuplicate = errorMsg.includes('UNIQUE constraint') || 
                                  errorMsg.includes('UNIQUE constraint failed') ||
                                  errorMsg.includes('duplicate key') ||
                                  errorMsg.includes('already exists') ||
                                  errorCode === '23505' || // PostgreSQL unique violation
                                  errorCode === 'SQLITE_CONSTRAINT_UNIQUE';
              
              if (isDuplicate) {
                addedLabels.push({ id: labelToAdd.id, name: labelToAdd.name, type: 'system' });
                console.log(`[DeepRemember] System label "${type}" (ID: ${labelToAdd.id}) already exists on card ${result.id}`);
              } else {
                failedLabels.push({ id: labelToAdd.id, name: labelToAdd.name, type: 'system', error: errorMsg });
                console.error(`[DeepRemember] Failed to add system label "${type}" (ID: ${labelToAdd.id}) to card ${result.id}:`, errorMsg);
              }
            }
          } else {
            console.warn(`[DeepRemember] System label "${type}" not found in database`);
          }
        } catch (labelError) {
          console.error(`[DeepRemember] Error processing system label for type "${type}":`, labelError);
          failedLabels.push({ type: 'system', name: type, error: labelError.message });
        }
      }
      
      // Step 2: Add user-selected labels if provided
      // This should ALWAYS happen if labels are provided, regardless of system label status
      if (labels && Array.isArray(labels) && labels.length > 0) {
        console.log(`[DeepRemember] Attempting to add ${labels.length} user label(s) to card ${result.id}`);
        for (const labelId of labels) {
          try {
            await deepRememberRepository.addLabelToCard(userId, result.id, labelId);
            addedLabels.push({ id: labelId, type: 'user' });
            console.log(`[DeepRemember] Successfully added user label (ID: ${labelId}) to card ${result.id}`);
          } catch (addError) {
            // Check if it's a duplicate error (label already exists on card)
            // Different databases return different error messages/codes for UNIQUE constraint violations
            const errorMsg = addError.message || '';
            const errorCode = addError.code || '';
            const isDuplicate = errorMsg.includes('UNIQUE constraint') || 
                                errorMsg.includes('UNIQUE constraint failed') ||
                                errorMsg.includes('duplicate key') ||
                                errorMsg.includes('already exists') ||
                                errorCode === '23505' || // PostgreSQL unique violation
                                errorCode === 'SQLITE_CONSTRAINT_UNIQUE';
            
            if (isDuplicate) {
              addedLabels.push({ id: labelId, type: 'user' });
              console.log(`[DeepRemember] User label (ID: ${labelId}) already exists on card ${result.id}`);
            } else {
              failedLabels.push({ id: labelId, type: 'user', error: errorMsg });
              console.error(`[DeepRemember] Failed to add user label (ID: ${labelId}) to card ${result.id}:`, errorMsg);
            }
          }
        }
      }
      
      // Log summary
      if (addedLabels.length > 0) {
        console.log(`[DeepRemember] Card ${result.id} - Successfully added ${addedLabels.length} label(s)`);
      }
      if (failedLabels.length > 0) {
        console.warn(`[DeepRemember] Card ${result.id} - Failed to add ${failedLabels.length} label(s)`);
      }
      
      // Get the card with its labels to verify
      const cardLabels = await deepRememberRepository.getCardLabels(userId, result.id);
      console.log(`[DeepRemember] Card ${result.id} - Final label count: ${cardLabels.length}`);
      
      res.json({
        success: true,
        card: { ...result, labels: cardLabels },
        message: 'Card created successfully in database',
        labelsAdded: addedLabels.length,
        labelsFailed: failedLabels.length
      });
    } else {
      // Use memory storage
      if (!userCards.has(userId)) {
        userCards.set(userId, []);
      }
      userCards.get(userId).push(cardData);
      
      res.json({
        success: true,
        card: { ...cardData, labels: [] },
        message: 'Card created successfully in memory'
      });
    }
  } catch (error) {
    console.error('[DeepRemember] Create card error:', error);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

// Get cards for review
router.get('/review-cards/:userId', authMiddleware.verifyToken, authMiddleware.checkResourceOwnership('userId'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (useDatabase && deepRememberRepository) {
      // Use database
      const cards = await deepRememberRepository.getDueCards(userId);
      const allCards = await deepRememberRepository.getUserCards(userId);
      
      res.json({
        success: true,
        cards: cards,
        total: allCards.length,
        due: cards.length
      });
    } else {
      // Use memory storage
      if (!userCards.has(userId)) {
        return res.json({ cards: [] });
      }
      
      const cards = userCards.get(userId);
      const now = new Date();
      const dueCards = cards.filter(card => {
        const dueDate = new Date(card.due);
        return dueDate <= now;
      });
      
      res.json({
        success: true,
        cards: dueCards,
        total: cards.length,
        due: dueCards.length
      });
    }
  } catch (error) {
    console.error('[DeepRemember] Get review cards error:', error);
    res.status(500).json({ error: 'Failed to get review cards' });
  }
});

// Text-to-Speech conversion endpoint
router.post('/convert-to-speech', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { text, word } = req.body;
        
        if (!text || !word) {
            return res.status(400).json({ error: 'text and word are required' });
        }

        // Create a simple hash of the sentence
        const sentenceHash = text.split('').reduce((hash, char) => {
            return ((hash << 5) - hash + char.charCodeAt(0)) & 0xffffffff;
        }, 0).toString(16);

        // Create a safe filename for the audio
        const safeWord = word.replace(/[^a-zA-Z0-9]/g, '_');
        
        // Determine file extension based on TTS service type
        // Google TTS outputs MP3, Piper/ElevenLabs output WAV
        const getFileExtension = () => {
            const ttsType = appConfig.TTS_TYPE.toLowerCase();
            return (ttsType === 'google' || ttsType === 'googletts') ? '.mp3' : '.wav';
        };
        
        const extension = getFileExtension();
        const filename = `${safeWord}_${sentenceHash}${extension}`;
        const filepath = path.posix.join('voice', filename);
        
        // Check for old files with wrong extension and delete them
        const oldExtension = extension === '.mp3' ? '.wav' : '.mp3';
        const oldFilename = `${safeWord}_${sentenceHash}${oldExtension}`;
        const oldFilepath = path.posix.join('voice', oldFilename);
        
        if (fileSystem.existsSync(oldFilepath)) {
            console.log(`[DeepRemember] Removing old file with wrong extension: ${oldFilepath}`);
            try {
                await new Promise((resolve, reject) => {
                    fileSystem.unlink(oldFilepath, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            } catch (err) {
                console.warn(`[DeepRemember] Failed to remove old file: ${err.message}`);
            }
        }

        // Ensure the voice directory exists
        const voiceDir = 'voice';
        if (!fileSystem.existsSync(voiceDir)) {
            fileSystem.mkdirSync(voiceDir, { recursive: true });
            console.log(`[DeepRemember] Created voice directory: ${voiceDir}`);
        }

        // Check if audio file already exists
        if (fileSystem.existsSync(filepath)) {
            console.log(`[DeepRemember] Audio file already exists: ${filepath}`);
            res.json({
                success: true,
                audioUrl: `/voice/${filename}`,
                filename: filename
            });
            return;
        }

        // Call the matatonic/openai-speech API
        console.log(`[DeepRemember] Converting to speech: "${text}"`);
        
        try {
            // Use the TTS service to convert text to speech with configuration
            // Don't pass voice/model as they're service-specific and handled internally
            const audioBuffer = await ttsService.convert(text, {
                timeout: 10000
            });
            
            // Save the audio file
            fileSystem.writeFileSync(filepath, audioBuffer);
            
            console.log(`[DeepRemember] Audio file saved: ${filepath}`);
            
            res.json({
                success: true,
                audioUrl: `/voice/${filename}`,
                filename: filename
            });
        } catch (fetchError) {
            console.warn(`[DeepRemember] TTS service unavailable: ${fetchError.message}`);
            console.warn(`[DeepRemember] Skipping audio generation for: "${text}"`);
            
            // Return success but without audio
            res.json({
                success: true,
                audioUrl: null,
                filename: null,
                message: 'TTS service unavailable - audio not generated'
            });
        }
        
    } catch (error) {
        console.error('[DeepRemember] TTS conversion error:', error);
        res.status(500).json({ error: 'Failed to convert text to speech' });
    }
});

// Get audio URL for a sentence (without generating new audio)
router.get('/get-audio/:word/:sentence', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { word, sentence } = req.params;
        
        if (!word || !sentence) {
            return res.status(400).json({ error: 'word and sentence are required' });
        }

        // Create a simple hash of the sentence
        const sentenceHash = sentence.split('').reduce((hash, char) => {
            return ((hash << 5) - hash + char.charCodeAt(0)) & 0xffffffff;
        }, 0).toString(16);

        // Create the expected filename
        const safeWord = word.replace(/[^a-zA-Z0-9]/g, '_');
        
        // Determine file extension based on TTS service type
        const getFileExtension = () => {
            const ttsType = appConfig.TTS_TYPE.toLowerCase();
            return (ttsType === 'google' || ttsType === 'googletts') ? '.mp3' : '.wav';
        };
        
        const extension = getFileExtension();
        const filename = `${safeWord}_${sentenceHash}${extension}`;
        const filepath = path.posix.join('voice', filename);

        // Check if audio file exists
        if (fileSystem.existsSync(filepath)) {
            res.json({
                success: true,
                audioUrl: `/voice/${filename}`,
                filename: filename,
                exists: true
            });
        } else {
            // Try the alternative extension
            const altExtension = extension === '.mp3' ? '.wav' : '.mp3';
            const altFilename = `${safeWord}_${sentenceHash}${altExtension}`;
            const altFilepath = path.posix.join('voice', altFilename);
            
            if (fileSystem.existsSync(altFilepath)) {
                res.json({
                    success: true,
                    audioUrl: `/voice/${altFilename}`,
                    filename: altFilename,
                    exists: true
                });
            } else {
                res.json({
                    success: false,
                    error: 'Audio file not found',
                    exists: false
                });
            }
        }
        
    } catch (error) {
        console.error('[DeepRemember] Get audio error:', error);
        res.status(500).json({ error: 'Failed to get audio file' });
    }
});

// Get translation and sample sentences from Ollama
router.post('/translate-word', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { word } = req.body;
        
        if (!word) {
            return res.status(400).json({ error: 'word is required' });
        }

        const prompt = `answer in this format {"translation":"string", "phrase":"phrase", "isWord":"boolean", "sampleSentecesOfThisWord":["stringSentence01","stringSentence02","StringSentence03"]} , what is the translation of "${word}" and make some simple sentences in German with this word. Also `;
        
        console.log('[DeepRemember] Sending prompt to Ollama:', prompt);
        
        const data = await llmClient.query(prompt, { stream: false });
        console.log('[DeepRemember] Raw Ollama response:', data.response);
        
        let translation = 'No translation found.';
        let sampleSentence = '';
        let isWord = true; // Default to word if not specified
        
        if (data.response) {
            try {
                const match = data.response.match(/\{[^}]+\}/);
                if (match) {
                    const parsed = JSON.parse(match[0]);
                    console.log('[DeepRemember] Parsed Ollama response:', parsed);
                    translation = parsed.translation || translation;
                    // Handle array of sample sentences
                    if (parsed.sampleSentencesOfThisWord && Array.isArray(parsed.sampleSentencesOfThisWord)) {
                        sampleSentence = parsed.sampleSentencesOfThisWord.join('\n');
                    } else {
                        // Fallback for single sentence or old format
                        sampleSentence = parsed.sampleSenteceOfThisWord || parsed.sampleSentenceOfThisWord || '';
                    }
                    // Parse isWord field - handle both string 'true'/'false' and boolean
                    if (parsed.isWord !== undefined) {
                        if (typeof parsed.isWord === 'string') {
                            isWord = parsed.isWord.toLowerCase() === 'true';
                        } else {
                            isWord = Boolean(parsed.isWord);
                        }
                    }
                    console.log('[DeepRemember] Extracted sample sentence:', sampleSentence);
                    console.log('[DeepRemember] Extracted isWord:', isWord);
                }
            } catch (e) {
                console.error('[DeepRemember] JSON parse error:', e);
            }
        }
        
        const result = { 
            success: true, 
            translation: translation,
            phrase: word,
            sampleSentence: sampleSentence,
            isWord: isWord
        };
        
        console.log('[DeepRemember] Sending result to frontend:', result);
        res.json(result);
    } catch (error) {
        console.error('[DeepRemember] Translation error:', error);
        res.status(500).json({ error: 'Failed to get translation from Ollama' });
    }
});

// Analyze sentence for grammatical structure and translation
router.post('/analyze-sentence', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { sentence, word } = req.body;
        
        if (!sentence) {
            return res.status(400).json({ error: 'sentence is required' });
        }

        // Generate hash for caching
        const sentenceHash = generateSentenceHash(sentence, word);
        console.log(`[DeepRemember] Generated hash for sentence analysis: ${sentenceHash}`);

        // Check if analysis exists in cache (unless refresh is requested)
        const refresh = req.body.refresh || false;
        if (!refresh && useDatabase && deepRememberRepository) {
            try {
                const cachedAnalysis = await deepRememberRepository.getSentenceAnalysis(sentenceHash);
                if (cachedAnalysis) {
                    console.log(`[DeepRemember] Found cached analysis for hash: ${sentenceHash}`);
                    return res.json({ 
                        success: true,
                        analysis: JSON.parse(cachedAnalysis.analysis_data),
                        cached: true
                    });
                }
            } catch (dbError) {
                console.warn('[DeepRemember] Error checking cache:', dbError);
            }
        }

        const prompt = `Analyze and translate this German sentence: "${sentence}"${word ? ` ` : ''}. 

Provide a comprehensive analysis in this exact JSON format:
{
    "translation": "English-translation-of-the-sentence",
    "grammaticalStructure": {
        "subject": "subject of the sentence",
        "verb": "main verb",
        "object": "object if present",
        "tense": "verb tense",
        "mood": "indicative/imperative/subjunctive",
        "sentenceType": "declarative/interrogative/imperative"
    },
    "keyWords": ["important", "words", "in", "sentence"],
    "difficulty": "beginner/intermediate/advanced"
}`;
        
        console.log('[DeepRemember] Sending sentence analysis prompt to Ollama:', prompt);
        
        const data = await llmClient.query(prompt, { stream: false });
        console.log('[DeepRemember] Raw Ollama response for sentence analysis:', data.response);
        
        let analysis = {
            translation: 'Translation not available',
            grammaticalStructure: {
                subject: 'Not identified',
                verb: 'Not identified',
                object: 'Not identified',
                tense: 'Not identified',
                mood: 'Not identified',
                sentenceType: 'Not identified'
            },
            keyWords: [],
            difficulty: 'unknown'
        };
        
        if (data.response) {
            try {
                // Try to extract JSON from the response
                const jsonMatch = data.response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    console.log('[DeepRemember] Parsed sentence analysis:', parsed);
                    
                    analysis = {
                        translation: parsed.translation || analysis.translation,
                        grammaticalStructure: parsed.grammaticalStructure || analysis.grammaticalStructure,
                        keyWords: parsed.keyWords || analysis.keyWords,
                        difficulty: parsed.difficulty || analysis.difficulty
                    };
                }
            } catch (e) {
                console.error('[DeepRemember] JSON parse error for sentence analysis:', e);
                // Fallback: try to extract basic information from text
                analysis.translation = data.response.split('\n')[0] || analysis.translation;
            }
        }
        
        const result = { 
            success: true,
            analysis: analysis
        };
        
        // Don't auto-save analysis - user will save manually
        
        console.log('[DeepRemember] Sending sentence analysis result to frontend:', result);
        res.json(result);
    } catch (error) {
        console.error('[DeepRemember] Sentence analysis error:', error);
        res.status(500).json({ error: 'Failed to analyze sentence' });
    }
});

// Unified translate endpoint using configured LLM (word or sentence)
router.post('/translate', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { text, type } = req.body; // type: 'word' | 'sentence'

        if (!text) {
            return res.status(400).json({ error: 'text is required' });
        }

        const prompt = type === 'word'
            ? `answer in this format {"translation":"string", "word":"realWord"} , what is the translation of the word "${text}"`
            : `answer in this format {"translation":"string", "sentence":"realSentence"} , what is the translation of "${text}"`;

        console.log('[DeepRemember] Sending unified translate prompt to LLM:', { type: type || 'sentence', prompt });

        const data = await llmClient.query(prompt, { stream: false });

        let translation = 'No translation found.';
        if (data && data.response) {
            try {
                const match = data.response.match(/\{[^}]+\}/);
                if (match) {
                    const parsed = JSON.parse(match[0]);
                    translation = parsed.translation || translation;
                }
            } catch (e) {
                console.error('[DeepRemember] Translate JSON parse error:', e);
            }
        }

        res.json({ success: true, translation });
    } catch (error) {
        console.error('[DeepRemember] Unified translate error:', error);
        res.status(500).json({ error: 'Failed to translate text' });
    }
});

// Save sentence analysis manually
router.post('/save-sentence-analysis', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { sentence, word, analysis } = req.body;
        
        if (!sentence || !analysis) {
            return res.status(400).json({ error: 'sentence and analysis are required' });
        }

        // Generate hash for caching
        const sentenceHash = generateSentenceHash(sentence, word);
        console.log(`[DeepRemember] Manually saving analysis with hash: ${sentenceHash}`);

        // Store analysis in cache
        if (useDatabase && deepRememberRepository) {
            try {
                await deepRememberRepository.storeSentenceAnalysis(sentenceHash, JSON.stringify(analysis));
                console.log(`[DeepRemember] Successfully saved analysis with hash: ${sentenceHash}`);
                res.json({ success: true, message: 'Analysis saved successfully' });
            } catch (dbError) {
                console.error('[DeepRemember] Error saving analysis:', dbError);
                res.status(500).json({ error: 'Failed to save analysis' });
            }
        } else {
            res.status(500).json({ error: 'Database not available' });
        }
    } catch (error) {
        console.error('[DeepRemember] Save analysis error:', error);
        res.status(500).json({ error: 'Failed to save analysis' });
    }
});

// Search for similar words
router.get('/search-similar/:userId/:query', authMiddleware.verifyToken, authMiddleware.checkResourceOwnership('userId'), async (req, res) => {
    try {
        const { userId, query } = req.params;
        
        if (!userId || !query) {
            return res.status(400).json({ error: 'userId and query are required' });
        }

        if (useDatabase && deepRememberRepository) {
            const similarWords = await deepRememberRepository.searchSimilarWords(userId, query);
            res.json({ success: true, words: similarWords });
        } else {
            if (!userCards.has(userId)) {
                return res.json({ success: true, words: [] });
            }
            const cards = userCards.get(userId);
            const similarWords = cards
                .filter(card => 
                    card.word.toLowerCase().includes(query.toLowerCase()) ||
                    card.translation.toLowerCase().includes(query.toLowerCase())
                )
                .map(card => ({
                    id: card.id,
                    word: card.word,
                    translation: card.translation,
                    context: card.context,
                    state: card.state,
                    due: card.due
                }))
                .slice(0, 10); // Limit to 10 results
            
            res.json({ success: true, words: similarWords });
        }
    } catch (error) {
        console.error('[DeepRemember] Search similar words error:', error);
        res.status(500).json({ error: 'Failed to search similar words' });
    }
});

// Chat endpoint for AI language learning assistant
router.post('/chat', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { messages } = req.body;
    const user = req.user;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Build conversation history prompt for Llama 3.2
    // Llama 3.2 uses a specific chat format with system/user/assistant roles
    let conversationHistory = `You are DeepChat, an AI language learning assistant. Your role is to help users learn languages through conversation, vocabulary practice, grammar explanations, and contextual learning.

Guidelines:
- Be friendly, encouraging, and patient
- Provide clear explanations in simple language
- Use examples when explaining grammar or vocabulary
- Encourage practice and active learning
- If asked about vocabulary, provide translations, example sentences, and usage tips
- If asked about grammar, explain rules clearly with examples
- Keep responses concise but informative
- Use markdown formatting for better readability (use **bold** for emphasis, • for lists)

Conversation History:
`;

    // Format messages for Llama 3.2 chat format
    messages.forEach((msg, index) => {
      if (msg.role === 'user') {
        conversationHistory += `User: ${msg.content}\n`;
      } else if (msg.role === 'assistant') {
        conversationHistory += `Assistant: ${msg.content}\n`;
      }
    });

    conversationHistory += `\nNow, respond to the user's latest message as the Assistant.`;

    console.log('[DeepRemember] Sending chat prompt to LLM:', {
      userId: user?.email || 'unknown',
      messageCount: messages.length,
      promptLength: conversationHistory.length
    });

    const data = await llmClient.query(conversationHistory, { stream: false });
    
    if (!data || !data.response) {
      console.error('[DeepRemember] Invalid LLM response:', data);
      return res.status(500).json({ error: 'Invalid response from LLM' });
    }

    console.log('[DeepRemember] LLM chat response received');

    res.json({
      success: true,
      response: data.response.trim()
    });
  } catch (error) {
    console.error('[DeepRemember] Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      details: error.message 
    });
  }
});

// Voice chat endpoint for AI language learning assistant
// Use memory storage for voice chat to avoid filesystem abstraction issues
const voiceChatUpload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const tempDir = path.join(__dirname, '..', 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      cb(null, tempDir);
    },
    filename: function (req, file, cb) {
      cb(null, `voice_chat_${Date.now()}_${file.originalname}`);
    }
  })
});

router.post('/chat-voice', authMiddleware.verifyToken, voiceChatUpload.single('audio'), async (req, res) => {
  let tempAudioPath = null;
  let tempSubtitlePath = null;

  try {
    const user = req.user;
    const audioFile = req.file;

    if (!audioFile) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    // Parse messages from FormData (it comes as a JSON string)
    let messages = [];
    if (req.body.messages) {
      try {
        messages = typeof req.body.messages === 'string' 
          ? JSON.parse(req.body.messages) 
          : req.body.messages;
      } catch (parseError) {
        console.error('[DeepRemember] Error parsing messages:', parseError);
        return res.status(400).json({ error: 'Invalid messages format' });
      }
    }

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages must be an array' });
    }

    tempAudioPath = audioFile.path;

    // Wait for file to be fully written by multer
    let fileReady = false;
    let retries = 0;
    const maxRetries = 20;
    const expectedSize = audioFile.size;
    
    while (!fileReady && retries < maxRetries) {
      if (fs.existsSync(tempAudioPath)) {
        const stats = fs.statSync(tempAudioPath);
        if (stats.size >= expectedSize * 0.9) {
          fileReady = true;
        }
      }
      
      if (!fileReady) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }
    }

    if (!fileReady) {
      throw new Error(`Audio file not ready after waiting: ${tempAudioPath}`);
    }

    // Step 1: Convert audio to text using STT
    tempSubtitlePath = path.join(__dirname, '..', 'temp', `voice_chat_${Date.now()}.srt`);
    
    const tempDir = path.dirname(tempSubtitlePath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const sttResult = await sstService.convert(tempAudioPath, tempSubtitlePath, {
      outputFormat: 'text'
    });

    if (!sttResult || !sttResult.text) {
      throw new Error('STT conversion failed - no text returned');
    }

    const userText = sttResult.text.trim();

    // Step 2: Add user message to chat history and send to LLM
    const apiMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Add the transcribed text as a user message
    apiMessages.push({
      role: 'user',
      content: userText
    });

    // Build conversation history prompt for Llama 3.2
    let conversationHistory = `You are DeepChat, an AI language learning assistant. Your role is to help users learn languages through conversation, vocabulary practice, grammar explanations, and contextual learning.

Guidelines:
- Be friendly, encouraging, and patient
- Provide clear explanations in simple language
- Use examples when explaining grammar or vocabulary
- Encourage practice and active learning
- If asked about vocabulary, provide translations, example sentences, and usage tips
- If asked about grammar, explain rules clearly with examples
- Keep responses concise but informative
- Use markdown formatting for better readability (use **bold** for emphasis, • for lists)

Conversation History:
`;

    // Format messages for Llama 3.2 chat format
    apiMessages.forEach((msg) => {
      if (msg.role === 'user') {
        conversationHistory += `User: ${msg.content}\n`;
      } else if (msg.role === 'assistant') {
        conversationHistory += `Assistant: ${msg.content}\n`;
      }
    });

    conversationHistory += `\nNow, respond to the user's latest message as the Assistant.`;

    const llmData = await llmClient.query(conversationHistory, { stream: false });
    
    if (!llmData || !llmData.response) {
      throw new Error('Invalid response from LLM');
    }

    const assistantText = llmData.response.trim();

    // Step 3: Clean text for TTS (remove markdown, keep only letters, numbers, punctuation)
    const cleanedText = cleanTextForTTS(assistantText);
    console.log('[DeepRemember] TTS Input:', cleanedText);

    // Step 4: Convert cleaned LLM response to speech using TTS
    const audioBuffer = await ttsService.convert(cleanedText, {
      timeout: 30000
    });

    // Convert audio buffer to base64 for frontend
    const audioBase64 = audioBuffer.toString('base64');
    const audioMimeType = appConfig.TTS_TYPE === 'google' ? 'audio/mp3' : 'audio/wav';

    res.json({
      success: true,
      response: assistantText,
      audio: audioBase64,
      audioMimeType: audioMimeType,
      userText: userText
    });

  } catch (error) {
    console.error('[DeepRemember] Voice chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process voice chat message',
      details: error.message 
    });
  } finally {
    // Cleanup temporary files
    try {
      if (tempAudioPath && fs.existsSync(tempAudioPath)) {
        fs.unlinkSync(tempAudioPath);
      }
      if (tempSubtitlePath && fs.existsSync(tempSubtitlePath)) {
        fs.unlinkSync(tempSubtitlePath);
      }
    } catch (cleanupError) {
      console.warn('[DeepRemember] Error cleaning up temp files:', cleanupError);
    }
  }
});

// Get all cards for a user (not just due cards)
router.get('/all-cards/:userId', authMiddleware.verifyToken, authMiddleware.checkResourceOwnership('userId'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (useDatabase && deepRememberRepository) {
      // Use database
      const allCards = await deepRememberRepository.getUserCards(userId);
      
      res.json({
        success: true,
        cards: allCards,
        total: allCards.length
      });
    } else {
      // Use memory storage
      if (!userCards.has(userId)) {
        return res.json({ cards: [] });
      }
      
      const cards = userCards.get(userId);
      
      res.json({
        success: true,
        cards: cards,
        total: cards.length
      });
    }
  } catch (error) {
    console.error('[DeepRemember] Get all cards error:', error);
    res.status(500).json({ error: 'Failed to get all cards' });
  }
});

// Update card details (word, translation, context)
router.put('/update-card/:userId/:cardId', async (req, res) => {
  try {
    const { userId, cardId } = req.params;
    const { word, translation, context } = req.body;
    
    if (!userId || !cardId) {
      return res.status(400).json({ error: 'userId and cardId are required' });
    }
    
    if (!word) {
      return res.status(400).json({ error: 'word is required' });
    }
    
    if (useDatabase && deepRememberRepository) {
      // Use database
      const allCards = await deepRememberRepository.getUserCards(userId);
      const card = allCards.find(c => c.id === cardId);
      
      if (!card) {
        return res.status(404).json({ error: 'Card not found' });
      }
      
      const updatedCard = {
        ...card,
        word: word,
        translation: translation || card.translation,
        context: context || card.context
      };
      
      await deepRememberRepository.updateCard(userId, cardId, updatedCard);
      
      res.json({
        success: true,
        card: updatedCard,
        message: 'Card updated successfully in database'
      });
    } else {
      // Use memory storage
      if (!userCards.has(userId)) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const cards = userCards.get(userId);
      const cardIndex = cards.findIndex(card => card.id === cardId);
      
      if (cardIndex === -1) {
        return res.status(404).json({ error: 'Card not found' });
      }
      
      // Update card data
      cards[cardIndex] = {
        ...cards[cardIndex],
        word: word,
        translation: translation || cards[cardIndex].translation,
        context: context || cards[cardIndex].context
      };
      
      res.json({
        success: true,
        card: cards[cardIndex],
        message: 'Card updated successfully in memory'
      });
    }
  } catch (error) {
    console.error('[DeepRemember] Update card error:', error);
    res.status(500).json({ error: 'Failed to update card' });
  }
});

// Answer a card (rate the difficulty)
router.post('/answer-card', async (req, res) => {
  try {
    const { userId, cardId, rating } = req.body;
    
    if (!userId || !cardId || rating === undefined) {
      return res.status(400).json({ error: 'userId, cardId, and rating are required' });
    }

    // Simple SRS algorithm implementation
    const now = new Date();
    const currentTime = now.getTime();
    
    if (useDatabase && deepRememberRepository) {
      // Use database
      const allCards = await deepRememberRepository.getUserCards(userId);
      const card = allCards.find(c => c.id === cardId);
      
      if (!card) {
        return res.status(404).json({ error: 'Card not found' });
      }
      
      const dueTime = new Date(card.due).getTime();
      const elapsedDays = Math.max(0, (currentTime - dueTime) / (1000 * 60 * 60 * 24));
      
      // Update card based on rating (1-5 scale)
      let newState = card.state;
      let newStability = card.stability;
      let newDue = new Date();
      
      if (rating <= 2) {
        // Again or Hard - back to learning
        newState = 0;
        newStability = Math.max(0, card.stability * 0.8);
        newDue = new Date(currentTime + 5 * 60 * 1000); // 5 minutes
      } else if (rating === 3) {
        // Good
        if (card.state === 0) {
          newState = 1; // Move to review
          newStability = 1.5;
          newDue = new Date(currentTime + 24 * 60 * 60 * 1000); // 1 day
        } else {
          newStability = card.stability * 1.2;
          newDue = new Date(currentTime + card.stability * 24 * 60 * 60 * 1000);
        }
      } else {
        // Easy or Perfect
        newStability = card.stability * 1.5;
        newDue = new Date(currentTime + card.stability * 24 * 60 * 60 * 1000);
      }
      
      const updatedCard = {
        ...card,
        state: newState,
        due: newDue.toISOString(),
        stability: Math.max(0.1, newStability),
        difficulty: Math.max(0.1, Math.min(1.0, card.difficulty + (rating - 3) * 0.1)),
        elapsed_days: elapsedDays,
        scheduled_days: Math.max(0, (newDue.getTime() - currentTime) / (1000 * 60 * 60 * 24)),
        reps: card.reps + 1,
        lapses: card.lapses + (rating <= 2 ? 1 : 0),
        lastReviewed: new Date().toISOString()
      };
      
      await deepRememberRepository.updateCard(userId, cardId, updatedCard);
      
      res.json({
        success: true,
        card: updatedCard,
        result: {
          state: updatedCard.state,
          due: updatedCard.due,
          rating: rating
        },
        message: 'Card answered successfully in database'
      });
    } else {
      // Use memory storage
      if (!userCards.has(userId)) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const cards = userCards.get(userId);
      const cardIndex = cards.findIndex(card => card.id === cardId);
      
      if (cardIndex === -1) {
        return res.status(404).json({ error: 'Card not found' });
      }
      
      const card = cards[cardIndex];
      const dueTime = new Date(card.due).getTime();
      const elapsedDays = Math.max(0, (currentTime - dueTime) / (1000 * 60 * 60 * 24));
      
      // Update card based on rating (1-5 scale)
      let newState = card.state;
      let newStability = card.stability;
      let newDue = new Date();
      
      if (rating <= 2) {
        // Again or Hard - back to learning
        newState = 0;
        newStability = Math.max(0, card.stability * 0.8);
        newDue = new Date(currentTime + 5 * 60 * 1000); // 5 minutes
      } else if (rating === 3) {
        // Good
        if (card.state === 0) {
          newState = 1; // Move to review
          newStability = 1.5;
          newDue = new Date(currentTime + 24 * 60 * 60 * 1000); // 1 day
        } else {
          newStability = card.stability * 1.2;
          newDue = new Date(currentTime + card.stability * 24 * 60 * 60 * 1000);
        }
      } else {
        // Easy or Perfect
        newStability = card.stability * 1.5;
        newDue = new Date(currentTime + card.stability * 24 * 60 * 60 * 1000);
      }
      
      // Update card data
      cards[cardIndex] = {
        ...card,
        state: newState,
        due: newDue.toISOString(),
        stability: Math.max(0.1, newStability),
        difficulty: Math.max(0.1, Math.min(1.0, card.difficulty + (rating - 3) * 0.1)),
        elapsed_days: elapsedDays,
        scheduled_days: Math.max(0, (newDue.getTime() - currentTime) / (1000 * 60 * 60 * 24)),
        reps: card.reps + 1,
        lapses: card.lapses + (rating <= 2 ? 1 : 0),
        lastReviewed: new Date().toISOString()
      };
      
      res.json({
        success: true,
        card: cards[cardIndex],
        result: {
          state: cards[cardIndex].state,
          due: cards[cardIndex].due,
          rating: rating
        },
        message: 'Card answered successfully in memory'
      });
    }
  } catch (error) {
    console.error('[DeepRemember] Answer card error:', error);
    res.status(500).json({ error: 'Failed to answer card' });
  }
});

// Get user statistics
router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (useDatabase && deepRememberRepository) {
      // Use database
      const stats = await deepRememberRepository.getUserStats(userId);
      res.json({
        success: true,
        stats
      });
    } else {
      // Use memory storage
      if (!userCards.has(userId)) {
        return res.json({
          success: true,
          stats: {
            totalCards: 0,
            dueCards: 0,
            learningCards: 0,
            reviewCards: 0,
            relearningCards: 0,
            labelCounts: [
              { name: 'word', color: '#3B82F6', count: 0 },
              { name: 'sentence', color: '#10B981', count: 0 }
            ]
          }
        });
      }
      
      const cards = userCards.get(userId);
      const now = new Date();
      
      const stats = {
        totalCards: cards.length,
        dueCards: cards.filter(card => new Date(card.due) <= now).length,
        learningCards: cards.filter(card => card.state === 0).length,
        reviewCards: cards.filter(card => card.state === 1).length,
        relearningCards: cards.filter(card => card.state === 2).length,
        labelCounts: [
          { name: 'word', color: '#3B82F6', count: 0 },
          { name: 'sentence', color: '#10B981', count: 0 }
        ]
      };
      
      res.json({
        success: true,
        stats
      });
    }
  } catch (error) {
    console.error('[DeepRemember] Get stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Delete a card
router.delete('/delete-card/:userId/:cardId', async (req, res) => {
  try {
    const { userId, cardId } = req.params;
    console.log(`[DeepRemember] DELETE request received: userId=${userId}, cardId=${cardId}`);
    
    if (useDatabase && deepRememberRepository) {
      // Use database
      console.log('[DeepRemember] Using database to delete card');
      const success = await deepRememberRepository.deleteCard(userId, cardId);
      if (!success) {
        console.log('[DeepRemember] Card not found or deletion failed');
        return res.status(404).json({ error: 'Card not found' });
      }
      
      console.log('[DeepRemember] Card deleted successfully');
      res.json({
        success: true,
        message: 'Card deleted successfully from database'
      });
    } else {
      console.log('[DeepRemember] Using memory storage to delete card');
      // Use memory storage
      if (!userCards.has(userId)) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const cards = userCards.get(userId);
      const cardIndex = cards.findIndex(card => card.id === cardId);
      
      if (cardIndex === -1) {
        return res.status(404).json({ error: 'Card not found' });
      }
      
      cards.splice(cardIndex, 1);
      
      res.json({
        success: true,
        message: 'Card deleted successfully from memory'
      });
    }
  } catch (error) {
    console.error('[DeepRemember] Delete card error:', error);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

// Get all cards in memory (for debugging/logging)
router.get('/debug/all-cards', async (req, res) => {
  try {
    if (useDatabase && deepRememberRepository) {
      // Use database
      const allUsers = await deepRememberRepository.getAllUsers();
      const allCards = {};
      
      for (const user of allUsers) {
        const cards = await deepRememberRepository.getUserCards(user.user_id);
        allCards[user.user_id] = cards;
      }
      
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        totalUsers: allUsers.length,
        allCards: allCards,
        storage: 'database'
      });
    } else {
      // Use memory storage
      const allCards = {};
      const now = new Date();
      
      // Convert Map to object for JSON serialization
      userCards.forEach((cards, userId) => {
        allCards[userId] = cards.map(card => ({
          ...card,
          isDue: new Date(card.due) <= now,
          daysUntilDue: Math.ceil((new Date(card.due).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        }));
      });
      
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        totalUsers: userCards.size,
        allCards: allCards,
        storage: 'memory'
      });
    }
  } catch (error) {
    console.error('[DeepRemember] Debug all cards error:', error);
    res.status(500).json({ error: 'Failed to get debug information' });
  }
});

// Simple log endpoint (JSON format)
router.get('/debug/log', async (req, res) => {
  try {
    const now = new Date();
    
    if (useDatabase && deepRememberRepository) {
      // Use database
      const allUsers = await deepRememberRepository.getAllUsers();
      const logData = {
        timestamp: now.toISOString(),
        totalUsers: allUsers.length,
        storage: 'database',
        users: {}
      };
      
      for (const user of allUsers) {
        const cards = await deepRememberRepository.getUserCards(user.user_id);
        const stats = await deepRememberRepository.getUserStats(user.user_id);
        
        logData.users[user.user_id] = {
          ...stats,
          cards: cards.map((card, index) => {
            const dueDate = new Date(card.due);
            const isDue = dueDate <= now;
            const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            
            return {
              index: index + 1,
              id: card.id,
              word: card.word,
              translation: card.translation,
              context: card.context,
              state: card.state,
              stateName: card.state === 0 ? 'Learning' : card.state === 1 ? 'Review' : 'Relearning',
              due: card.due,
              dueDate: dueDate.toISOString(),
              isDue: isDue,
              daysUntilDue: daysUntilDue,
              stability: card.stability,
              difficulty: card.difficulty,
              reps: card.reps,
              lapses: card.lapses,
              created: card.created,
              createdDate: new Date(card.created).toISOString()
            };
          })
        };
      }
      
      res.json({
        success: true,
        log: logData
      });
    } else {
      // Use memory storage
      const logData = {
        timestamp: now.toISOString(),
        totalUsers: userCards.size,
        storage: 'memory',
        users: {}
      };
      
      userCards.forEach((cards, userId) => {
        const dueCards = cards.filter(card => new Date(card.due) <= now);
        const learningCards = cards.filter(card => card.state === 0);
        const reviewCards = cards.filter(card => card.state === 1);
        const relearningCards = cards.filter(card => card.state === 2);
        
        logData.users[userId] = {
          totalCards: cards.length,
          dueCards: dueCards.length,
          learningCards: learningCards.length,
          reviewCards: reviewCards.length,
          relearningCards: relearningCards.length,
          cards: cards.map((card, index) => {
            const dueDate = new Date(card.due);
            const isDue = dueDate <= now;
            const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            
            return {
              index: index + 1,
              id: card.id,
              word: card.word,
              translation: card.translation,
              context: card.context,
              state: card.state,
              stateName: card.state === 0 ? 'Learning' : card.state === 1 ? 'Review' : 'Relearning',
              due: card.due,
              dueDate: dueDate.toISOString(),
              isDue: isDue,
              daysUntilDue: daysUntilDue,
              stability: card.stability,
              difficulty: card.difficulty,
              reps: card.reps,
              lapses: card.lapses,
              created: card.created,
              createdDate: new Date(card.created).toISOString()
            };
          })
        };
      });
      
      res.json({
        success: true,
        log: logData
      });
    }
  } catch (error) {
    console.error('[DeepRemember] Log error:', error);
    res.status(500).json({ error: 'Failed to generate log' });
  }
});

module.exports = router;
