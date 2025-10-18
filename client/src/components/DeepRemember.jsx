import React, { useState, useEffect, useRef } from 'react'
import CreateCardModal from './CreateCardModal'
import DashboardView from './DashboardView'
import ManageCards from './ManageCards/ManageCards'
import HelpDeepRememberModal from './HelpDeepRememberModal'
import Header from './header/Header'
import UserManage from './header/user/UserManage'
import { useToast } from './ToastProvider'
import { useAuth } from './security/AuthContext'
import './DeepRemember.css'

const DeepRemember = ({ onNavigateToWelcome }) => {
  const { showSuccess, showError, showInfo } = useToast()
  const { user, getAuthHeaders } = useAuth()
  
  // State management
  const [currentUserId, setCurrentUserId] = useState(user?.email || 'user123')
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
  
  // Modal states
  const [showUserSetup, setShowUserSetup] = useState(false)
  const [showCreateCard, setShowCreateCard] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  
  // Refs for loading states
  const lastNumberKeyRef = useRef(null)
  const lastNumberKeyTimeRef = useRef(null)
  const isLoadingRef = useRef(false)

  // Update user ID when user changes
  useEffect(() => {
    if (user?.email) {
      setCurrentUserId(user.email)
    }
  }, [user])

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
      const response = await fetch(`/deepRemember/stats/${currentUserId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        mode: 'cors'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
        // Load review cards without showing alerts for empty results
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
      const response = await fetch(`/deepRemember/review-cards/${currentUserId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
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


  // Handle card creation from modal
  const handleCardCreated = () => {
    loadUserData()
  }

  const answerCard = async (rating) => {
    if (currentCardIndex >= currentCards.length) return
    
    const card = currentCards[currentCardIndex]
    
    try {
      const response = await fetch('/deepRemember/answer-card', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
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


  // Show current card
  const showCurrentCard = () => {
    if (currentCardIndex >= currentCards.length) {
      showSuccess('All cards reviewed!')
      loadUserData()
      return
    }
    
    setShowAnswer(false)
  }



  // Initialize on component mount
  useEffect(() => {
    // Only load user data once on mount
    if (!isLoadingRef.current) {
      loadUserData()
    }
  }, []) // Empty dependency array ensures this only runs once

  // Get current card
  const currentCard = currentCards[currentCardIndex]

  return (
    <div className="deep-remember-container">
      <Header
        isCardsView={isCardsView}
        onUserSetup={() => setShowUserSetup(true)}
        onToggleCardsView={() => setIsCardsView(!isCardsView)}
        onNavigateToWelcome={onNavigateToWelcome}
      />

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
            <ManageCards 
              currentUserId={currentUserId}
              onCardDeleted={loadUserData}
            />
          )}
        </div>
      </div>

      {/* User Setup Modal */}
      <UserManage
        isOpen={showUserSetup}
        onClose={() => setShowUserSetup(false)}
        currentUserId={currentUserId}
        onUserIdChange={setCurrentUserId}
        onLoadUserData={loadUserData}
      />

       {/* Create Card Modal */}
       <CreateCardModal
         isOpen={showCreateCard}
         onClose={() => setShowCreateCard(false)}
         onCreateCard={handleCardCreated}
         currentUserId={currentUserId}
       />

      {/* Help Modal */}
      <HelpDeepRememberModal 
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </div>
  )
}

export default DeepRemember
