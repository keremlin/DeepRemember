import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useToast } from '../ToastProvider'
import { useAuth } from '../security/AuthContext'
import { getApiUrl } from '../../config/api'
import EditCard from './EditCard'
import AddList from './AddList'
import CardLabelList from '../labels/CardLabelList'
import AreYouSureModal from '../AreYouSureModal'
import SearchComponent from './SearchComponent'
import './ManageCards.css'

const CARDS_PER_PAGE = 40

const ManageCards = ({ currentUserId, onCardDeleted }) => {
  const { showSuccess, showError } = useToast()
  const { authenticatedFetch, user } = useAuth()
  const [allCards, setAllCards] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [currentOffset, setCurrentOffset] = useState(0)
  const [totalCards, setTotalCards] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const scrollContainerRef = useRef(null)
  const [editingCard, setEditingCard] = useState(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAddListOpen, setIsAddListOpen] = useState(false)
  const [userLabels, setUserLabels] = useState([])
  const [showLabelTooltip, setShowLabelTooltip] = useState(false)
  const [removingCardIds, setRemovingCardIds] = useState(new Set())
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    cardId: null,
    cardWord: ''
  })
  const [isDeletingCard, setIsDeletingCard] = useState(false)

  // Helper function to format context with dot delimiters
  const formatContext = (context) => {
    if (!context) return ''
    
    const sentences = context.split('\n').filter(s => s.trim())
    return sentences.join(' • ')
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

  // Check if card is a word or sentence based on labels
  const getCardType = (card) => {
    if (!card.labels || !Array.isArray(card.labels)) {
      return 'word' // Default to word if no labels
    }
    const hasSentenceLabel = card.labels.some(label => label.name === 'sentence')
    return hasSentenceLabel ? 'sentence' : 'word'
  }

  // Get only user labels (filter out system labels)
  const getUserLabelsFromCard = (card) => {
    if (!card.labels || !Array.isArray(card.labels)) {
      return []
    }
    return card.labels.filter(label => label.type === 'user')
  }

  // Load user labels for tooltip
  const loadUserLabels = async () => {
    const userId = user?.email || user?.id || currentUserId
    if (!userId) return

    try {
      const response = await authenticatedFetch(getApiUrl(`/api/srs/labels/${userId}`), {
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
        // Filter to show only user-defined labels (not system labels)
        const userLabelsOnly = (data.labels || []).filter(label => label.type === 'user')
        setUserLabels(userLabelsOnly)
      }
    } catch (error) {
      console.error('Error loading user labels:', error)
      setUserLabels([])
    }
  }

  // Load cards with pagination
  const loadCards = async (offset = 0, append = false, showAlert = true, search = '') => {
    if (!currentUserId) return
    
    if (append) {
      setIsLoadingMore(true)
    } else {
      setIsLoading(true)
      setCurrentOffset(0)
    }
    
    try {
      const url = new URL(getApiUrl(`/deepRemember/all-cards/${currentUserId}`))
      url.searchParams.set('limit', CARDS_PER_PAGE.toString())
      url.searchParams.set('offset', offset.toString())
      url.searchParams.set('orderBy', 'word')
      url.searchParams.set('orderDir', 'ASC')
      
      // Add search parameter if provided
      if (search && search.trim()) {
        url.searchParams.set('search', search.trim())
      }
      
      const response = await authenticatedFetch(url.toString(), {
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
        if (append) {
          setAllCards(prevCards => [...prevCards, ...(data.cards || [])])
        } else {
          setAllCards(data.cards || [])
        }
        setTotalCards(data.total || 0)
        setHasMore(data.hasMore !== undefined ? data.hasMore : (data.cards && data.cards.length === CARDS_PER_PAGE))
        setCurrentOffset(offset + (data.cards?.length || 0))
        
        if (!append && data.cards && data.cards.length === 0 && showAlert) {
          if (search && search.trim()) {
            showError(`No cards found matching "${search}"!`)
          } else {
            showError('No cards found!')
          }
        }
      } else {
        throw new Error(data.error || 'Failed to load cards')
      }
    } catch (error) {
      console.error('Error loading cards:', error)
      if (showAlert) {
        showError(`Failed to load cards: ${error.message}`)
      }
    } finally {
      if (append) {
        setIsLoadingMore(false)
      } else {
        setIsLoading(false)
      }
    }
  }

  // Load more cards (for infinite scroll)
  const loadMoreCards = useCallback(async () => {
    if (isLoadingMore || !hasMore || !currentUserId) return
    
    await loadCards(currentOffset, true, false, searchQuery)
  }, [currentOffset, hasMore, isLoadingMore, currentUserId, searchQuery])

  // Reset and load all cards from beginning (for refresh)
  const loadAllCards = async (showAlert = true) => {
    setAllCards([])
    setCurrentOffset(0)
    setHasMore(true)
    await loadCards(0, false, showAlert, searchQuery)
  }

  // Handle search
  const handleSearch = (query) => {
    const trimmedQuery = query.trim()
    setSearchQuery(trimmedQuery)
    setAllCards([])
    setCurrentOffset(0)
    setHasMore(true)
    loadCards(0, false, false, trimmedQuery)
  }

  // Delete card
  const performDeleteCard = async (cardId) => {
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
        showSuccess('Card deleted successfully!')
        // Mark card as removing to trigger fade-out animation
        setRemovingCardIds(prev => new Set(prev).add(cardId))
        
        // Wait for fade-out animation to complete, then remove from state
        setTimeout(() => {
          setAllCards(prevCards => prevCards.filter(card => card.id !== cardId))
          setRemovingCardIds(prev => {
            const newSet = new Set(prev)
            newSet.delete(cardId)
            return newSet
          })
        }, 300) // Match CSS animation duration
        
        // Notify parent component
        if (onCardDeleted) {
          onCardDeleted()
        }
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

  const openDeleteCardModal = (card) => {
    if (!card?.id) return
    setDeleteModalState({
      isOpen: true,
      cardId: card.id,
      cardWord: card.word || ''
    })
  }

  const resetDeleteModal = () => {
    setDeleteModalState({
      isOpen: false,
      cardId: null,
      cardWord: ''
    })
  }

  const handleConfirmDeleteCard = async () => {
    if (!deleteModalState.cardId) return
    setIsDeletingCard(true)
    try {
      await performDeleteCard(deleteModalState.cardId)
    } finally {
      setIsDeletingCard(false)
      resetDeleteModal()
    }
  }

  const handleCancelDeleteCard = () => {
    resetDeleteModal()
  }

  // Edit card handlers
  const handleEditCard = (card) => {
    setEditingCard(card)
    setIsEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setEditingCard(null)
  }

  const handleCardUpdated = async () => {
    // Reload cards from beginning after successful update
    await loadAllCards(false)
    // Notify parent component
    if (onCardDeleted) {
      onCardDeleted()
    }
  }

  // AddList handlers
  const handleOpenAddList = () => {
    setIsAddListOpen(true)
  }

  const handleCloseAddList = () => {
    setIsAddListOpen(false)
  }

  const handleCardsCreated = async () => {
    // Reload cards after successful creation
    await loadAllCards(false)
    // Notify parent component
    if (onCardDeleted) {
      onCardDeleted()
    }
  }

  // Load cards when component mounts or userId changes
  useEffect(() => {
    if (currentUserId) {
      loadAllCards(false)
      loadUserLabels()
    }
  }, [currentUserId])

  // Infinite scroll handler
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      // Load more when user is within 200px of the bottom
      if (scrollHeight - scrollTop - clientHeight < 200 && hasMore && !isLoadingMore && !isLoading) {
        loadMoreCards()
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [hasMore, isLoadingMore, isLoading, loadMoreCards])

  if (!currentUserId) {
    return (
      <div className="manage-cards-container">
        <div className="srs-card">
          <h3><span className="material-symbols-outlined">menu_book</span> All My Cards</h3>
          <div className="no-user-message">
            <p>Please set up your user ID to view your cards.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="manage-cards-container">
      <div className="srs-card">
        <div className="cards-header">
          <h3><span className="material-symbols-outlined">menu_book</span> All My Cards</h3>
          <div className="header-actions">
            <SearchComponent 
              onSearch={handleSearch} 
              totalResults={searchQuery ? totalCards : null}
              isSearching={isLoading && searchQuery !== ''}
              searchQuery={searchQuery}
            />
            <div 
              className="btn-add-list-wrapper"
              onMouseEnter={() => setShowLabelTooltip(true)}
              onMouseLeave={() => setShowLabelTooltip(false)}
            >
              <button 
                className="btn-add-list" 
                onClick={handleOpenAddList}
                title="Add multiple cards"
              >
                <span className="material-symbols-outlined">note_add</span> Add List
              </button>
              {showLabelTooltip && userLabels.length > 0 && (
                <div className="label-tooltip">
                  <div className="label-tooltip-title">Available Labels:</div>
                  <div className="label-tooltip-labels">
                    {userLabels.map((label) => (
                      <div key={label.id} className="label-tooltip-item">
                        <span 
                          className="label-tooltip-color" 
                          style={{ backgroundColor: label.color || '#3B82F6' }}
                        />
                        <span className="label-tooltip-name">{label.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button 
              className="btn-refresh" 
              onClick={() => loadAllCards(true)}
              disabled={isLoading}
              title="Refresh cards"
            >
              <span className="material-symbols-outlined">refresh</span>
            </button>
          </div>
        </div>
        
        {isLoading && allCards.length === 0 ? (
          <div className="loading-message">
            <p>Loading cards...</p>
          </div>
        ) : allCards.length === 0 ? (
          <div className="no-cards-message">
            <p>No cards found. Create your first card to get started!</p>
          </div>
        ) : (
          <div 
            className="all-cards" 
            ref={scrollContainerRef}
          >
            {allCards.map((card, index) => (
              <div 
                key={card.id || index} 
                className={`card-item ${removingCardIds.has(card.id) ? 'card-item-removing' : ''}`}
              >
                <div className="card-info">
                  <div className="card-header-top">
                    <div className="card-word">{card.word}</div>
                    <CardLabelList
                      card={card}
                      getCardType={getCardType}
                      getUserLabelsFromCard={getUserLabelsFromCard}
                    />
                  </div>
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
                    className="btn-edit" 
                    onClick={() => handleEditCard(card)}
                    title="Edit card"
                  >
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                  <button 
                    className="btn-delete" 
                    onClick={() => openDeleteCardModal(card)}
                    title="Delete card"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            ))}
            {isLoadingMore && (
              <div className="loading-more-message">
                <p>Loading more cards...</p>
              </div>
            )}
            {!hasMore && allCards.length > 0 && (
              <div className="no-more-cards-message">
                <p>All cards loaded ({totalCards} total)</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Edit Card Modal */}
      <EditCard
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        card={editingCard}
        currentUserId={currentUserId}
        onCardUpdated={handleCardUpdated}
      />
      
      {/* Add List Modal */}
      <AddList
        isOpen={isAddListOpen}
        onClose={handleCloseAddList}
        currentUserId={currentUserId}
        onCardsCreated={handleCardsCreated}
      />

      <AreYouSureModal
        isOpen={deleteModalState.isOpen}
        question={`Delete the card "${deleteModalState.cardWord || 'this card'}"?`}
        description="This action cannot be undone."
        confirmLabel={isDeletingCard ? 'Deleting...' : 'Yes, delete'}
        onConfirm={handleConfirmDeleteCard}
        onCancel={handleCancelDeleteCard}
        isConfirming={isDeletingCard}
      />
    </div>
  )
}

export default ManageCards
