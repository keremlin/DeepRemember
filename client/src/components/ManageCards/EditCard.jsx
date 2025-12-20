import React, { useState, useEffect } from 'react'
import { useToast } from '../ToastProvider'
import { useAuth } from '../security/AuthContext'
import { getApiUrl } from '../../config/api'
import LabelSelector from '../labels/LabelSelector'
import './EditCard.css'

const EditCard = ({ isOpen, onClose, card, currentUserId, onCardUpdated }) => {
  const { showSuccess, showError } = useToast()
  const { authenticatedFetch } = useAuth()
  const [formData, setFormData] = useState({
    word: '',
    translation: '',
    context: ''
  })
  const [selectedLabels, setSelectedLabels] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  // Update form data when card prop changes
  useEffect(() => {
    if (card) {
      setFormData({
        word: card.word || '',
        translation: card.translation || '',
        context: card.context || ''
      })
      
      // Initialize selected labels from card's current labels (only user labels)
      if (card.labels && Array.isArray(card.labels)) {
        const userLabelIds = card.labels
          .filter(label => label.type === 'user')
          .map(label => label.id)
        setSelectedLabels(userLabelIds)
      } else {
        setSelectedLabels([])
      }
    }
  }, [card])

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Sync labels: add new ones and remove removed ones
  const syncLabels = async (currentLabelIds, newLabelIds) => {
    const labelsToAdd = newLabelIds.filter(id => !currentLabelIds.includes(id))
    const labelsToRemove = currentLabelIds.filter(id => !newLabelIds.includes(id))

    // Add new labels
    for (const labelId of labelsToAdd) {
      try {
        const response = await authenticatedFetch(
          getApiUrl(`/api/srs/cards/${currentUserId}/${card.id}/labels`),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            mode: 'cors',
            body: JSON.stringify({ labelId })
          }
        )

        if (!response.ok) {
          console.warn(`Failed to add label ${labelId} to card`)
        }
      } catch (error) {
        console.error(`Error adding label ${labelId}:`, error)
      }
    }

    // Remove labels
    for (const labelId of labelsToRemove) {
      try {
        const response = await authenticatedFetch(
          getApiUrl(`/api/srs/cards/${currentUserId}/${card.id}/labels/${labelId}`),
          {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            mode: 'cors'
          }
        )

        if (!response.ok) {
          console.warn(`Failed to remove label ${labelId} from card`)
        }
      } catch (error) {
        console.error(`Error removing label ${labelId}:`, error)
      }
    }
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.word.trim() || !formData.translation.trim()) {
      showError('Word and translation are required!')
      return
    }

    if (!currentUserId || !card?.id) {
      showError('Missing user ID or card ID!')
      return
    }

    setIsLoading(true)
    try {
      // First update the card data
      const response = await fetch(getApiUrl(`/deepRemember/update-card/${currentUserId}/${card.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors',
        body: JSON.stringify({
          word: formData.word.trim(),
          translation: formData.translation.trim(),
          context: formData.context.trim()
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        // Sync labels after card update
        const currentUserLabelIds = (card.labels || [])
          .filter(label => label.type === 'user')
          .map(label => label.id)
        
        await syncLabels(currentUserLabelIds, selectedLabels)
        
        showSuccess('Card updated successfully!')
        onCardUpdated()
        onClose()
      } else {
        throw new Error(data.error || 'Failed to update card')
      }
    } catch (error) {
      console.error('Error updating card:', error)
      showError(`Failed to update card: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle modal close
  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  if (!isOpen || !card) return null

  return (
    <div className="edit-card-overlay" onClick={handleBackdropClick}>
      <div className="edit-card-modal">
        <div className="edit-card-header">
          <h3><span className="material-symbols-outlined">edit</span> Edit Card</h3>
          <button 
            className="btn-close" 
            onClick={handleClose}
            disabled={isLoading}
            title="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="edit-card-form">
          <div className="form-group">
            <label htmlFor="word">Word/Phrase *</label>
            <input
              type="text"
              id="word"
              name="word"
              value={formData.word}
              onChange={handleInputChange}
              placeholder="Enter the word or phrase"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="translation">Translation *</label>
            <input
              type="text"
              id="translation"
              name="translation"
              value={formData.translation}
              onChange={handleInputChange}
              placeholder="Enter the translation"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="context">Context</label>
            <textarea
              id="context"
              name="context"
              value={formData.context}
              onChange={handleInputChange}
              placeholder="Enter context or example sentences (one per line)"
              rows="4"
              disabled={isLoading}
            />
          </div>

          {/* Label Selector */}
          <div className="form-group">
            <div className="label-selector-wrapper">
              <label htmlFor="label-selector" style={{ marginBottom: '8px', display: 'block', fontWeight: '500', fontSize: '14px' }}>
                User Labels (Optional)
              </label>
              <LabelSelector
                selectedLabels={selectedLabels}
                setSelectedLabels={setSelectedLabels}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="btn-cancel"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-save"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditCard
