import React, { useState, useRef, useEffect } from 'react'
import CloseButton from '../CloseButton'
import { useToast } from '../ToastProvider'
import './AddList.css'

const AddList = ({ isOpen, onClose, currentUserId, onCardsCreated }) => {
  const { showSuccess, showError, showWarning, showInfo } = useToast()
  
  // Form states
  const [inputText, setInputText] = useState('')
  const [processedItems, setProcessedItems] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Processing states
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(-1)
  const [processingProgress, setProcessingProgress] = useState(0)

  // Process the input text to extract words/sentences
  const processInputText = () => {
    if (!inputText.trim()) {
      showWarning('Please enter some words or sentences')
      return
    }

    const lines = inputText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)

    if (lines.length === 0) {
      showWarning('No valid words or sentences found')
      return
    }

    setIsProcessing(true)
    setCurrentProcessingIndex(0)
    setProcessingProgress(0)
    
    // Initialize processed items with empty translations
    const initialItems = lines.map((line, index) => ({
      id: index,
      word: line,
      translation: '',
      sampleSentence: '',
      isProcessing: false,
      hasError: false,
      errorMessage: ''
    }))
    
    setProcessedItems(initialItems)
    processItemsSequentially(initialItems, 0)
  }

  // Process items one by one to avoid overwhelming the API
  const processItemsSequentially = async (items, index) => {
    if (index >= items.length) {
      setIsProcessing(false)
      setCurrentProcessingIndex(-1)
      setProcessingProgress(100)
      showSuccess(`Processed ${items.length} items successfully!`)
      return
    }

    setCurrentProcessingIndex(index)
    setProcessingProgress((index / items.length) * 100)

    const item = items[index]
    
    // Update the item to show it's processing
    const updatedItems = [...items]
    updatedItems[index] = { ...item, isProcessing: true }
    setProcessedItems(updatedItems)

    try {
      const response = await fetch('http://localhost:4004/deepRemember/translate-word', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({ word: item.word })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.success) {
        // Update the item with translation data
        const finalItems = [...updatedItems]
        finalItems[index] = {
          ...item,
          translation: data.translation || 'No translation found',
          sampleSentence: data.sampleSentence || '',
          isProcessing: false,
          hasError: false
        }
        setProcessedItems(finalItems)
        
        // Process next item after a short delay, passing the updated items
        setTimeout(() => {
          processItemsSequentially(finalItems, index + 1)
        }, 500)
      } else {
        throw new Error(data.error || 'Translation failed')
      }
    } catch (error) {
      console.error('Error processing item:', error)
      const errorItems = [...updatedItems]
      errorItems[index] = {
        ...item,
        isProcessing: false,
        hasError: true,
        errorMessage: error.message,
        translation: 'Translation failed',
        sampleSentence: ''
      }
      setProcessedItems(errorItems)
      
      // Process next item after a short delay, passing the updated items
      setTimeout(() => {
        processItemsSequentially(errorItems, index + 1)
      }, 500)
    }
  }

  // Save all processed items as cards
  const saveAllCards = async () => {
    if (processedItems.length === 0) {
      showWarning('No items to save')
      return
    }

    const validItems = processedItems.filter(item => 
      item.word.trim() && 
      item.translation.trim() && 
      !item.hasError
    )

    if (validItems.length === 0) {
      showWarning('No valid items to save')
      return
    }

    setIsSaving(true)
    let successCount = 0
    let errorCount = 0

    try {
      for (const item of validItems) {
        try {
          const response = await fetch('http://localhost:4004/deepRemember/create-card', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
            },
            mode: 'cors',
            body: JSON.stringify({
              userId: currentUserId,
              word: item.word,
              translation: item.translation,
              context: item.sampleSentence,
              type: 'word' // Default to word type
            })
          })
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          
          const data = await response.json()
          if (data.success) {
            successCount++
          } else {
            throw new Error(data.error || 'Failed to create card')
          }
        } catch (error) {
          console.error('Error creating card for item:', item.word, error)
          errorCount++
        }
      }

      if (successCount > 0) {
        showSuccess(`Successfully created ${successCount} cards!`)
        if (errorCount > 0) {
          showWarning(`${errorCount} cards failed to create`)
        }
        
        // Reset form and close modal
        handleClose()
        if (onCardsCreated) {
          onCardsCreated()
        }
      } else {
        showError('Failed to create any cards')
      }
    } catch (error) {
      console.error('Error saving cards:', error)
      showError(`Failed to save cards: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle modal close
  const handleClose = () => {
    setInputText('')
    setProcessedItems([])
    setIsProcessing(false)
    setIsSaving(false)
    setCurrentProcessingIndex(-1)
    setProcessingProgress(0)
    onClose()
  }

  // Handle individual item edit
  const handleItemEdit = (index, field, value) => {
    const updatedItems = [...processedItems]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    setProcessedItems(updatedItems)
  }

  // Handle individual item refresh/retranslate
  const handleItemRefresh = async (index) => {
    const item = processedItems[index]
    if (!item.word.trim()) {
      showWarning('Please enter a word to translate')
      return
    }

    // Update the item to show it's processing
    const updatedItems = [...processedItems]
    updatedItems[index] = { 
      ...item, 
      isProcessing: true, 
      hasError: false, 
      errorMessage: '' 
    }
    setProcessedItems(updatedItems)

    try {
      const response = await fetch('http://localhost:4004/deepRemember/translate-word', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({ word: item.word })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.success) {
        // Update the item with new translation data
        const finalItems = [...updatedItems]
        finalItems[index] = {
          ...item,
          translation: data.translation || 'No translation found',
          sampleSentence: data.sampleSentence || '',
          isProcessing: false,
          hasError: false,
          errorMessage: ''
        }
        setProcessedItems(finalItems)
        showSuccess(`Translation refreshed for "${item.word}"`)
      } else {
        throw new Error(data.error || 'Translation failed')
      }
    } catch (error) {
      console.error('Error refreshing translation for item:', error)
      const errorItems = [...updatedItems]
      errorItems[index] = {
        ...item,
        isProcessing: false,
        hasError: true,
        errorMessage: error.message,
        translation: 'Translation failed',
        sampleSentence: ''
      }
      setProcessedItems(errorItems)
      showError(`Failed to refresh translation for "${item.word}": ${error.message}`)
    }
  }

  // Remove item from list
  const removeItem = (index) => {
    const updatedItems = processedItems.filter((_, i) => i !== index)
    setProcessedItems(updatedItems)
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="add-list-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📝 Add Multiple Cards</h3>
          <CloseButton 
            onClick={handleClose} 
            size="medium" 
            variant="default"
          />
        </div>
        
        <div className="add-list-content">
          {/* Input Section */}
          <div className="input-section">
            <label htmlFor="words-input">
              <strong>Enter words or sentences (one per line):</strong>
            </label>
            <textarea
              id="words-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter words or sentences, one per line:&#10;Haus&#10;Auto&#10;Ich gehe nach Hause.&#10;Das ist ein schönes Buch."
              rows={8}
              disabled={isProcessing || isSaving}
            />
            <div className="input-actions">
              <button 
                className="btn-process"
                onClick={processInputText}
                disabled={!inputText.trim() || isProcessing || isSaving}
              >
                {isProcessing ? '🔄 Processing...' : '🔍 Process & Translate'}
              </button>
            </div>
          </div>

          {/* Processing Progress */}
          {isProcessing && (
            <div className="processing-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${processingProgress}%` }}
                />
              </div>
              <div className="progress-text">
                Processing item {currentProcessingIndex + 1} of {processedItems.length}...
              </div>
            </div>
          )}

          {/* Preview Section */}
          {processedItems.length > 0 && (
            <div className="preview-section">
              <h4>📋 Preview ({processedItems.length} items)</h4>
              <div className="preview-items">
                {processedItems.map((item, index) => (
                  <div key={item.id} className={`preview-item ${item.hasError ? 'error' : ''}`}>
                    <div className="item-header">
                      <span className="item-number">#{index + 1}</span>
                      <div className="item-actions">
                        <button 
                          className="btn-refresh-item"
                          onClick={() => handleItemRefresh(index)}
                          disabled={isSaving || item.isProcessing}
                          title="Refresh translation"
                        >
                          {item.isProcessing ? '🔄' : '↻'}
                        </button>
                        <button 
                          className="btn-remove-item"
                          onClick={() => removeItem(index)}
                          disabled={isSaving}
                          title="Remove item"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    
                    <div className="item-content">
                      <div className="item-word">
                        <strong>Word/Sentence:</strong>
                        <input
                          type="text"
                          value={item.word}
                          onChange={(e) => handleItemEdit(index, 'word', e.target.value)}
                          disabled={isSaving}
                        />
                      </div>
                      
                      <div className="item-translation">
                        <strong>Translation:</strong>
                        <input
                          type="text"
                          value={item.translation}
                          onChange={(e) => handleItemEdit(index, 'translation', e.target.value)}
                          disabled={isSaving}
                          className={item.hasError ? 'error-input' : ''}
                        />
                      </div>
                      
                      <div className="item-context">
                        <strong>Sample Sentence:</strong>
                        <textarea
                          value={item.sampleSentence}
                          onChange={(e) => handleItemEdit(index, 'sampleSentence', e.target.value)}
                          disabled={isSaving}
                          rows={2}
                        />
                      </div>
                      
                      {item.isProcessing && (
                        <div className="item-processing">
                          🔄 Processing...
                        </div>
                      )}
                      
                      {item.hasError && (
                        <div className="item-error">
                          ❌ {item.errorMessage}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="modal-buttons">
            <button 
              className="btn-modal btn-modal-secondary" 
              onClick={handleClose} 
              disabled={isSaving}
            >
              Cancel
            </button>
            <button 
              className="btn-modal btn-modal-primary" 
              onClick={saveAllCards} 
              disabled={processedItems.length === 0 || isSaving || isProcessing}
            >
              {isSaving ? '💾 Saving...' : `Save ${processedItems.filter(item => !item.hasError).length} Cards`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddList
