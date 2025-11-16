import React, { useState, useEffect } from 'react'
import { useToast } from '../ToastProvider'
import { getApiUrl } from '../../config/api'
import './EditCard.css'

const EditCard = ({ isOpen, onClose, card, currentUserId, onCardUpdated }) => {
  const { showSuccess, showError } = useToast()
  const [formData, setFormData] = useState({
    word: '',
    translation: '',
    context: ''
  })
  const [isLoading, setIsLoading] = useState(false)

  // Update form data when card prop changes
  useEffect(() => {
    if (card) {
      setFormData({
        word: card.word || '',
        translation: card.translation || '',
        context: card.context || ''
      })
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
