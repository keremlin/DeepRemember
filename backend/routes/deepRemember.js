const express = require('express');
const { FSRS } = require('ts-fsrs');
const databaseFactory = require('../database/access/DatabaseFactory');
const dbConfig = require('../config/database');
const { initializeSampleData } = require('../database/sampledata/sampleCardData');
const AuthMiddleware = require('../security/authMiddleware');
const path = require('path'); // Added for file path handling
const fs = require('fs'); // Added for file system operations
const crypto = require('crypto'); // Added for hash generation

const router = express.Router();
const { LlmFactory } = require('../llm/LlmFactory');
const llmClient = LlmFactory.create();
const authMiddleware = new AuthMiddleware();

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
    const { word, translation, context, type } = req.body;
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
      
      // Automatically associate card with appropriate system label based on type
      if (type) {
        try {
          // Get system labels to find the appropriate label ID
          const systemLabels = await deepRememberRepository.getSystemLabels();
          const labelToAdd = systemLabels.find(label => label.name === type);
          
          if (labelToAdd) {
            await deepRememberRepository.addLabelToCard(userId, result.id, labelToAdd.id);
            console.log(`[DeepRemember] Added ${type} label to card ${result.id}`);
          }
        } catch (labelError) {
          console.warn(`[DeepRemember] Failed to add ${type} label to card ${result.id}:`, labelError);
        }
      }
      
      // Get the card with its labels
      const cardLabels = await deepRememberRepository.getCardLabels(userId, result.id);
      
      res.json({
        success: true,
        card: { ...result, labels: cardLabels },
        message: 'Card created successfully in database'
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
        const filename = `${safeWord}_${sentenceHash}.wav`;
        const filepath = path.resolve(process.cwd(), '..', 'voice', filename);

        // Check if audio file already exists
        if (fs.existsSync(filepath)) {
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
            const response = await fetch('http://localhost:8000/v1/audio/speech', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    input: text,
                    voice: 'pavoque',
                    model: 'tts-1-hd'
                }),
                timeout: 10000 // 10 second timeout
            });

            if (!response.ok) {
                throw new Error(`TTS API error: ${response.status}`);
            }

            // Get the audio data
            const audioBuffer = await response.arrayBuffer();
            
            // Save the audio file
            fs.writeFileSync(filepath, Buffer.from(audioBuffer));
            
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
        const filename = `${safeWord}_${sentenceHash}.wav`;
        const filepath = path.resolve(process.cwd(), '..', 'voice', filename);

        // Check if audio file exists
        if (fs.existsSync(filepath)) {
            res.json({
                success: true,
                audioUrl: `/voice/${filename}`,
                filename: filename,
                exists: true
            });
        } else {
            res.json({
                success: false,
                error: 'Audio file not found',
                exists: false
            });
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

        const prompt = `answer in this format {"translation":"string", "phrase":"phrase", "sampleSentecesOfThisWord":["stringSentence01","stringSentence02","StringSentence03"]} , what is the translation of "${word}" and make some simple sentences in German with this word. Also `;
        
        console.log('[DeepRemember] Sending prompt to Ollama:', prompt);
        
        const data = await llmClient.query(prompt, { stream: false });
        console.log('[DeepRemember] Raw Ollama response:', data.response);
        
        let translation = 'No translation found.';
        let sampleSentence = '';
        
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
                    console.log('[DeepRemember] Extracted sample sentence:', sampleSentence);
                }
            } catch (e) {
                console.error('[DeepRemember] JSON parse error:', e);
            }
        }
        
        const result = { 
            success: true, 
            translation: translation,
            phrase: word,
            sampleSentence: sampleSentence
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
    
    if (useDatabase && deepRememberRepository) {
      // Use database
      const success = await deepRememberRepository.deleteCard(userId, cardId);
      if (!success) {
        return res.status(404).json({ error: 'Card not found' });
      }
      
      res.json({
        success: true,
        message: 'Card deleted successfully from database'
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
