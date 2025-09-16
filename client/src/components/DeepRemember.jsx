import React, { useState, useEffect, useRef } from 'react'
import CreateCardModal from './CreateCardModal'
import DashboardView from './DashboardView'
import { useToast } from './ToastProvider'
import './DeepRemember.css'

const DeepRemember = ({ onNavigateToWelcome }) => {
  const { showSuccess, showError, showInfo } = useToast()
  
  // State management
  const [currentUserId, setCurrentUserId] = useState('user123')
  const [currentCards, setCurrentCards] = useState([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isCardsView, setIsCardsView] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [stats, setStats] = useState({
    totalCards: 0,
    dueCards: 0,
    learningCards: 0,
    reviewCards: 0
  })
  const [allCards, setAllCards] = useState([])
  
  // Modal states
  const [showUserSetup, setShowUserSetup] = useState(false)
  const [showCreateCard, setShowCreateCard] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  
  // Refs for loading states
  const lastNumberKeyRef = useRef(null)
  const lastNumberKeyTimeRef = useRef(null)
  const isLoadingRef = useRef(false)

  // Helper function to format context with dot delimiters
  const formatContext = (context) => {
    if (!context) return ''
    
    const sentences = context.split('\n').filter(s => s.trim())
    
    if (sentences.length === 1) {
      return sentences[0]
    }
    
    return sentences.map((sentence, index) => 
      `${index + 1}. ${sentence.trim()}`
    ).join('\n')
  }

  // Get state color for styling
  const getStateColor = (state) => {
    switch (state) {
      case 0: return '#007bff' // Learning
      case 1: return '#28a745' // Review
      case 2: return '#ffc107' // Relearning
      default: return '#6c757d'
    }
  }

  // Get state name
  const getStateName = (state) => {
    switch (state) {
      case 0: return 'Learning'
      case 1: return 'Review'
      case 2: return 'Relearning'
      default: return 'Unknown'
    }
  }

  // API calls
  const loadUserData = async () => {
    // Prevent multiple simultaneous calls
    if (isLoadingRef.current) {
      console.log('loadUserData already in progress, skipping...')
      return
    }
    
    isLoadingRef.current = true
    
    try {
      const response = await fetch(`http://localhost:4004/deepRemember/stats/${currentUserId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
        // Load cards without showing alerts for empty results
        await loadAllCards(false)
        await loadReviewCards(false)
        setShowUserSetup(false)
      } else {
        throw new Error(data.error || 'Failed to load user data')
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      // Only show alert if it's a real error, not just empty data
      if (error.message.includes('404') || error.message.includes('Failed to load')) {
        console.log('User data not found, this is normal for new users')
      } else {
        showError(`Failed to load user data: ${error.message}`)
      }
    } finally {
      isLoadingRef.current = false
    }
  }

  const loadReviewCards = async (showAlert = true) => {
    try {
      const response = await fetch(`http://localhost:4004/deepRemember/review-cards/${currentUserId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setCurrentCards(data.cards)
        setCurrentCardIndex(0)
        setShowAnswer(false)
        
        if (data.cards.length > 0) {
          showCurrentCard()
        } else if (showAlert) {
          showInfo('No cards due for review!')
        }
      } else {
        throw new Error(data.error || 'Failed to load review cards')
      }
    } catch (error) {
      console.error('Error loading review cards:', error)
      if (showAlert) {
        showError(`Failed to load review cards: ${error.message}`)
      }
    }
  }

  const loadAllCards = async (showAlert = true) => {
    try {
      const response = await fetch(`http://localhost:4004/deepRemember/all-cards/${currentUserId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setAllCards(data.cards)
      } else {
        throw new Error(data.error || 'Failed to load all cards')
      }
    } catch (error) {
      console.error('Error loading all cards:', error)
      if (showAlert) {
        showError(`Failed to load all cards: ${error.message}`)
      }
    }
  }

  // Handle card creation from modal
  const handleCardCreated = () => {
    loadUserData()
  }

  const answerCard = async (rating) => {
    if (currentCardIndex >= currentCards.length) return
    
    const card = currentCards[currentCardIndex]
    
    try {
      const response = await fetch('http://localhost:4004/deepRemember/answer-card', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({
          userId: currentUserId,
          cardId: card.id,
          rating: rating
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.success) {
        setCurrentCardIndex(currentCardIndex + 1)
        setShowAnswer(false)
        
        if (currentCardIndex + 1 >= currentCards.length) {
          showSuccess('All cards reviewed!')
          // Reload data without showing alerts
          loadUserData()
        } else {
          showCurrentCard()
        }
      } else {
        throw new Error(data.error || 'Failed to answer card')
      }
    } catch (error) {
      console.error('Error answering card:', error)
      showError(`Failed to answer card: ${error.message}`)
    }
  }

  const deleteCard = async (cardId) => {
    if (!confirm('Are you sure you want to delete this card?')) return
    
    try {
      const response = await fetch(`http://localhost:4004/deepRemember/delete-card/${currentUserId}/${cardId}`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
        },
        mode: 'cors'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.success) {
        showSuccess('Card deleted successfully!')
        loadUserData()
        loadAllCards()
      } else {
        throw new Error(data.error || 'Failed to delete card')
      }
    } catch (error) {
      console.error('Error deleting card:', error)
      showError(`Failed to delete card: ${error.message}`)
    }
  }

  // Show current card
  const showCurrentCard = () => {
    if (currentCardIndex >= currentCards.length) {
      showSuccess('All cards reviewed!')
      loadUserData()
      return
    }
    
    setShowAnswer(false)
  }


  // Keyboard event handlers
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!showAnswer && currentCards.length > 0) {
        setShowAnswer(true)
      }
      return
    }
    
    // Rating shortcuts
    if (showAnswer && currentCards.length > 0) {
      let rating = 0
      switch (event.key.toLowerCase()) {
        case 'z': rating = 1; break
        case 'x': rating = 2; break
        case 'c': rating = 3; break
        case 'v': rating = 4; break
        case 'b': rating = 5; break
      }
      
      if (rating > 0) {
        event.preventDefault()
        answerCard(rating)
      }
    }
  }

  // Initialize on component mount
  useEffect(() => {
    // Only load user data once on mount
    if (!isLoadingRef.current) {
      loadUserData()
    }
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, []) // Empty dependency array ensures this only runs once

  // Get current card
  const currentCard = currentCards[currentCardIndex]

  return (
    <div className="deep-remember-container">
      <div className="header">
        <div className="header-left">
          <h1>🎓 DeepRemember Learning System</h1>
          <p>Spaced Repetition System for vocabulary learning</p>
        </div>
        <div className="header-right">
          <div className="username-display" onClick={() => setShowUserSetup(true)}>
            👤 <span>{currentUserId}</span>
          </div>
          <button className="btn-manage-cards" onClick={() => setIsCardsView(!isCardsView)}>
            {isCardsView ? '📊 Back to Dashboard' : '📚 Manage Cards'}
          </button>
          <button className="btn btn-secondary" onClick={onNavigateToWelcome || (() => window.location.href = '/')}>
            🎵 Back to AI-title
          </button>
        </div>
      </div>

      <div className="content">
        <div className="srs-container">
          {!isCardsView ? (
            <DashboardView
              currentCards={currentCards}
              currentCard={currentCard}
              showAnswer={showAnswer}
              setShowAnswer={setShowAnswer}
              answerCard={answerCard}
              stats={stats}
              setShowHelp={setShowHelp}
              setShowCreateCard={setShowCreateCard}
            />
          ) : (
            // Cards Management View
            <div className="cards-view">
              <div className="srs-card">
                <h3>📚 All My Cards</h3>
                <div className="all-cards">
                  {allCards.map((card, index) => (
                    <div key={card.id || index} className="card-item">
                      <div className="card-info">
                        <div className="card-word">{card.word}</div>
                        <div className="card-translation">{card.translation}</div>
                        <div className="card-context">{formatContext(card.context)}</div>
                        <div className="card-meta">
                          <span className={`card-state state-${card.state}`}>
                            {getStateName(card.state)}
                          </span>
                          <span className="card-due">
                            Due: {new Date(card.due).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="card-actions">
                        <button 
                          className="btn-delete" 
                          onClick={() => deleteCard(card.id)}
                          title="Delete card"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Setup Modal */}
      {showUserSetup && (
        <div className="modal-overlay" onClick={() => setShowUserSetup(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👤 User Setup</h3>
              <button className="modal-close" onClick={() => setShowUserSetup(false)}>&times;</button>
            </div>
            <div className="modal-form">
              <input 
                type="text" 
                value={currentUserId}
                onChange={(e) => setCurrentUserId(e.target.value)}
                placeholder="Enter your user ID" 
              />
              <div className="modal-buttons">
                <button className="btn-modal btn-modal-secondary" onClick={() => setShowUserSetup(false)}>
                  Cancel
                </button>
                <button className="btn-modal btn-modal-primary" onClick={loadUserData}>
                  Load My Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

       {/* Create Card Modal */}
       <CreateCardModal
         isOpen={showCreateCard}
         onClose={() => setShowCreateCard(false)}
         onCreateCard={handleCardCreated}
         currentUserId={currentUserId}
       />

      {/* Help Modal */}
      {showHelp && (
        <div className="help-modal" onClick={() => setShowHelp(false)}>
          <div className="help-modal-content" onClick={(e) => e.stopPropagation()}>
            <span className="close-help" onClick={() => setShowHelp(false)}>&times;</span>
            <h2>📚 DeepRemember Learning System Help</h2>
            
            <h3>🎯 Card States</h3>
            <p>Cards in DeepRemember progress through different states based on your learning performance:</p>
            
            <ul>
              <li><strong>Learning (State 0):</strong> New cards that you're just starting to learn. These appear frequently until you can recall them consistently.</li>
              <li><strong>Review (State 1):</strong> Cards you've successfully learned and are now reviewing at spaced intervals.</li>
              <li><strong>Relearning (State 2):</strong> Cards that you previously knew but have forgotten and need to relearn.</li>
            </ul>
            
            <h3>⏰ Timing System</h3>
            <p>The system uses spaced repetition to optimize your learning:</p>
            
            <ul>
              <li><strong>New Cards:</strong> Start in Learning state and appear every 5 minutes until you rate them "Good" or better.</li>
              <li><strong>Learning Cards:</strong> If you rate them "Again" or "Hard", they return to 5-minute intervals.</li>
              <li><strong>Review Cards:</strong> Appear at increasing intervals based on your performance:
                <ul>
                  <li><strong>Again:</strong> Back to Learning state (5 minutes)</li>
                  <li><strong>Hard:</strong> Back to Learning state (5 minutes)</li>
                  <li><strong>Good:</strong> Next review in 1 day</li>
                  <li><strong>Easy:</strong> Next review in 2-3 days</li>
                  <li><strong>Perfect:</strong> Next review in 4-7 days</li>
                </ul>
              </li>
            </ul>
            
            <h3>📊 Statistics Explained</h3>
            <ul>
              <li><strong>Total Cards:</strong> All cards in your collection</li>
              <li><strong>Due Cards:</strong> Cards ready for review right now</li>
              <li><strong>Learning:</strong> Cards currently in the learning phase</li>
              <li><strong>Review:</strong> Cards in the review phase</li>
            </ul>
            
            <h3>💡 Tips for Success</h3>
            <ul>
              <li>Be honest with your ratings - this helps the system optimize your learning</li>
              <li>Review cards regularly to maintain your progress</li>
              <li>Use the context field to add example sentences</li>
              <li>Focus on understanding rather than memorization</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

export default DeepRemember
