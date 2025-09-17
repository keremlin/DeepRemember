import React, { useState, useEffect } from 'react'
import { useToast } from './ToastProvider'
import './ManageCards.css'

const ManageCards = ({ currentUserId, onCardDeleted }) => {
  const { showSuccess, showError } = useToast()
  const [allCards, setAllCards] = useState([])
  const [isLoading, setIsLoading] = useState(false)

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

  // Load all cards
  const loadAllCards = async (showAlert = true) => {
    if (!currentUserId) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`http://localhost:4004/deepRemember/all-cards/${currentUserId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setAllCards(data.cards || [])
        if (data.cards && data.cards.length === 0 && showAlert) {
          showError('No cards found!')
        }
      } else {
        throw new Error(data.error || 'Failed to load cards')
      }
    } catch (error) {
      console.error('Error loading all cards:', error)
      if (showAlert) {
        showError(`Failed to load all cards: ${error.message}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Delete card
  const deleteCard = async (cardId) => {
    if (!confirm('Are you sure you want to delete this card?')) return
    
    try {
      const response = await fetch(`http://localhost:4004/deepRemember/delete-card/${currentUserId}/${cardId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        showSuccess('Card deleted successfully!')
        // Reload cards
        await loadAllCards(false)
        // Notify parent component
        if (onCardDeleted) {
          onCardDeleted()
        }
      } else {
        throw new Error(data.error || 'Failed to delete card')
      }
    } catch (error) {
      console.error('Error deleting card:', error)
      showError(`Failed to delete card: ${error.message}`)
    }
  }

  // Load cards when component mounts or userId changes
  useEffect(() => {
    if (currentUserId) {
      loadAllCards(false)
    }
  }, [currentUserId])

  if (!currentUserId) {
    return (
      <div className="manage-cards-container">
        <div className="srs-card">
          <h3>📚 All My Cards</h3>
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
          <h3>📚 All My Cards</h3>
          <button 
            className="btn-refresh" 
            onClick={() => loadAllCards(true)}
            disabled={isLoading}
            title="Refresh cards"
          >
            {isLoading ? '🔄' : '↻'}
          </button>
        </div>
        
        {isLoading ? (
          <div className="loading-message">
            <p>Loading cards...</p>
          </div>
        ) : allCards.length === 0 ? (
          <div className="no-cards-message">
            <p>No cards found. Create your first card to get started!</p>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  )
}

export default ManageCards
