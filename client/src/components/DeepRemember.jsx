import React, { useState, useEffect, useRef } from 'react'
import CreateCardModal from './CreateCardModal'
import DashboardView from './DashboardView'
import ManageCards from './ManageCards/ManageCards'
import EditCard from './ManageCards/EditCard'
import HelpDeepRememberModal from './HelpDeepRememberModal'
import CompletionModal from './ReviewSection/CompletionModal'
import Page from './Page'
import UserManage from './header/user/UserManage'
import { useToast } from './ToastProvider'
import { useAuth } from './security/AuthContext'
import { getApiUrl } from '../config/api'
import AreYouSureModal from './AreYouSureModal'
import './DeepRemember.css'

const DeepRemember = ({ onNavigateToWelcome, onNavigateToPlayer, showCardsOnMount = false, onNavigateToUserManagement, onNavigateToManagement, onNavigateToChat, onNavigateToWordList }) => {
  const { showSuccess, showError, showInfo } = useToast()
  const { user, authenticatedFetch } = useAuth()
  
  // State management
  const [currentUserId, setCurrentUserId] = useState(user?.email || 'user123')
  const [currentCards, setCurrentCards] = useState([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isCardsView, setIsCardsView] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [isReviewMode, setIsReviewMode] = useState(false)
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
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    cardId: null,
    resolver: null
  })
  const [isDeletingCard, setIsDeletingCard] = useState(false)
  const [isEditCardModalOpen, setIsEditCardModalOpen] = useState(false)
  const [editingCard, setEditingCard] = useState(null)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  
  // Refs for loading states
  const lastNumberKeyRef = useRef(null)
  const lastNumberKeyTimeRef = useRef(null)
  const isLoadingRef = useRef(false)
  const previousDueCardsRef = useRef(null)

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
      const response = await authenticatedFetch(getApiUrl(`/deepRemember/stats/${currentUserId}`), {
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
        const newDueCards = data.stats?.dueCards || 0
        const previousDueCards = previousDueCardsRef.current
        
        // Check if due cards went from > 0 to 0 while in review mode
        if (isReviewMode && previousDueCards !== null && previousDueCards > 0 && newDueCards === 0) {
          setShowCompletionModal(true)
        }
        
        previousDueCardsRef.current = newDueCards
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
      const response = await authenticatedFetch(getApiUrl(`/deepRemember/review-cards/${currentUserId}`), {
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


  // Handle card creation from modal
  const handleCardCreated = () => {
    loadUserData()
  }

  const answerCard = async (rating) => {
    if (currentCardIndex >= currentCards.length) return
    
    const card = currentCards[currentCardIndex]
    
    try {
      const response = await authenticatedFetch(getApiUrl('/deepRemember/answer-card'), {
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

  const deleteCurrentCard = async (cardId) => {
    if (!cardId) return false
    
    try {
      const response = await authenticatedFetch(getApiUrl(`/deepRemember/delete-card/${currentUserId}/${cardId}`), {
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
        showSuccess('Card deleted successfully')
        await loadReviewCards(false)
        return true
      } else {
        throw new Error(data.error || 'Failed to delete card')
      }
    } catch (error) {
      console.error('Error deleting card:', error)
      showError(`Failed to delete card: ${error.message}`)
      return false
    }
  }

  const requestDeleteCard = (cardId) => {
    if (!cardId) return Promise.resolve(false)
    return new Promise((resolve) => {
      setDeleteConfirmation({
        isOpen: true,
        cardId,
        resolver: resolve
      })
    })
  }

  const resetDeleteConfirmation = () => {
    setDeleteConfirmation({
      isOpen: false,
      cardId: null,
      resolver: null
    })
  }

  const handleCancelDeleteCard = () => {
    deleteConfirmation?.resolver?.(false)
    resetDeleteConfirmation()
  }

  const handleConfirmDeleteCard = async () => {
    if (!deleteConfirmation.cardId) return
    const resolver = deleteConfirmation.resolver
    setIsDeletingCard(true)
    try {
      const success = await deleteCurrentCard(deleteConfirmation.cardId)
      resolver?.(success)
    } finally {
      setIsDeletingCard(false)
      resetDeleteConfirmation()
    }
  }

  const handleEditCardRequest = (card) => {
    if (!card) return
    setEditingCard(card)
    setIsEditCardModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setIsEditCardModalOpen(false)
    setEditingCard(null)
  }

  const handleCardUpdatedFromReview = async () => {
    await loadUserData()
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



  // Initialize previous due cards ref when stats change
  useEffect(() => {
    if (previousDueCardsRef.current === null && stats.dueCards !== undefined) {
      previousDueCardsRef.current = stats.dueCards
    }
  }, [stats.dueCards])

  // Initialize on component mount
  useEffect(() => {
    // Only load user data once on mount
    if (!isLoadingRef.current) {
      loadUserData()
    }
    // Show review cards view if requested (DashboardView, not ManageCards)
    if (showCardsOnMount) {
      setIsCardsView(false)
    }
  }, [showCardsOnMount]) // Include showCardsOnMount in dependencies

  // Get current card
  const currentCard = currentCards[currentCardIndex]

  return (
    <Page
      isCardsView={isCardsView}
      onUserSetup={() => setShowUserSetup(true)}
      onToggleCardsView={() => setIsCardsView(!isCardsView)}
      onNavigateToWelcome={onNavigateToWelcome}
      onNavigateToPlayer={onNavigateToPlayer}
      onShowCards={() => setIsCardsView(false)}
      onNavigateToUserManagement={onNavigateToUserManagement}
      onNavigateToManagement={onNavigateToManagement}
      onNavigateToChat={onNavigateToChat}
      onNavigateToWordList={onNavigateToWordList}
      isReviewMode={isReviewMode}
    >
      <div className="deep-remember-container">
        <div className="content">
          <div className="srs-container">
            {!isCardsView ? (
              <DashboardView
                currentCards={currentCards}
                currentCard={currentCard}
                showAnswer={showAnswer}
                setShowAnswer={setShowAnswer}
                answerCard={answerCard}
                onDeleteCard={requestDeleteCard}
                onEditCard={handleEditCardRequest}
                stats={stats}
                setShowHelp={setShowHelp}
                setShowCreateCard={setShowCreateCard}
                onShowManageCards={() => setIsCardsView(true)}
                onReviewModeChange={setIsReviewMode}
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

      <AreYouSureModal
        isOpen={deleteConfirmation.isOpen}
        question="Delete this card permanently?"
        description="This action cannot be undone."
        confirmLabel={isDeletingCard ? 'Deleting...' : 'Yes, delete'}
        cancelLabel="Cancel"
        onConfirm={handleConfirmDeleteCard}
        onCancel={handleCancelDeleteCard}
        isConfirming={isDeletingCard}
      />

      <EditCard
        isOpen={isEditCardModalOpen}
        onClose={handleCloseEditModal}
        card={editingCard}
        currentUserId={currentUserId}
        onCardUpdated={handleCardUpdatedFromReview}
      />

      <CompletionModal
        isOpen={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
      />
    </Page>
  )
}

export default DeepRemember
