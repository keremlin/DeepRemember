import React, { useState, useRef, useEffect } from 'react'
import CloseButton from '../CloseButton'
import { useToast } from '../ToastProvider'
import { useAuth } from '../security/AuthContext'
import { getApiUrl } from '../../config/api'
import LabelSelector from '../labels/LabelSelector'
import './AddList.css'

const AddList = ({ isOpen, onClose, currentUserId, onCardsCreated }) => {
  const { showSuccess, showError, showWarning, showInfo } = useToast()
  const { authenticatedFetch } = useAuth()
  
  // Form states
  const [inputMode, setInputMode] = useState('on-line') // 'on-line' or 'json'
  const [inputText, setInputText] = useState('')
  const [processedItems, setProcessedItems] = useState([])
  const [selectedLabels, setSelectedLabels] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [allLabels, setAllLabels] = useState([]) // All labels (system + user) for name-to-ID lookup
  
  // Processing states
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(-1)
  const [processingProgress, setProcessingProgress] = useState(0)

  // Load all labels (system + user) for name-to-ID conversion
  useEffect(() => {
    if (currentUserId && isOpen) {
      loadAllLabels()
    }
  }, [currentUserId, isOpen])

  const loadAllLabels = async () => {
    if (!currentUserId) return

    try {
      const response = await authenticatedFetch(getApiUrl(`/api/srs/labels/${currentUserId}`), {
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
        // Store all labels (both system and user) for name-to-ID lookup
        setAllLabels(data.labels || [])
      }
    } catch (error) {
      console.error('Error loading labels:', error)
      setAllLabels([])
    }
  }

  // Convert label name to label ID
  const getLabelIdByName = (labelName) => {
    if (!labelName) return null
    const label = allLabels.find(l => l.name === labelName)
    return label ? label.id : null
  }

  // Process JSON input
  const processJsonInput = () => {
    if (!inputText.trim()) {
      showWarning('Please enter JSON data')
      return
    }

    try {
      const jsonData = JSON.parse(inputText)
      
      if (!Array.isArray(jsonData)) {
        showError('JSON must be an array of objects')
        return
      }

      if (jsonData.length === 0) {
        showWarning('JSON array is empty')
        return
      }

      // Map JSON objects to processed items format
      const initialItems = jsonData.map((item, index) => ({
        id: index,
        word: item.word || '',
        translation: item.translation || '',
        sampleSentence: item.context || '',
        isWord: true, // Default to word, can be determined from word length if needed
        isProcessing: false,
        hasError: false,
        errorMessage: '',
        // Store original label from JSON if present
        jsonLabel: item.label || null
      }))

      // Filter out items with missing required fields
      const validItems = initialItems.filter(item => 
        item.word.trim() && item.translation.trim()
      )

      if (validItems.length === 0) {
        showError('No valid items found in JSON. Each object must have "word" and "translation" fields.')
        return
      }

      if (validItems.length < initialItems.length) {
        showWarning(`${initialItems.length - validItems.length} items were skipped due to missing required fields`)
      }

      setProcessedItems(validItems)
      showSuccess(`Loaded ${validItems.length} items from JSON!`)
    } catch (error) {
      console.error('Error parsing JSON:', error)
      showError(`Invalid JSON format: ${error.message}`)
    }
  }

  // Process the input text to extract words/sentences
  const processInputText = () => {
    if (inputMode === 'json') {
      processJsonInput()
      return
    }

    // Original on-line processing
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
      isWord: true, // Default to word
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
      const response = await authenticatedFetch(getApiUrl('/deepRemember/translate-word'), {
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
          isWord: data.isWord !== undefined ? data.isWord : true, // Use isWord from response, default to true
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
          // Merge JSON label (if present) with selected labels
          // Convert label names to IDs
          let labelsToUse = [...selectedLabels] // selectedLabels are already IDs
          
          if (item.jsonLabel) {
            // Convert JSON label name to ID
            const jsonLabelId = getLabelIdByName(item.jsonLabel)
            if (jsonLabelId && !labelsToUse.includes(jsonLabelId)) {
              labelsToUse.push(jsonLabelId)
            } else if (!jsonLabelId) {
              // Label name not found - log warning but continue
              console.warn(`Label "${item.jsonLabel}" not found in available labels for item: ${item.word}`)
            }
          }

          const response = await authenticatedFetch(getApiUrl('/deepRemember/create-card'), {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
            },
            mode: 'cors',
            body: JSON.stringify({
              word: item.word,
              translation: item.translation,
              context: item.sampleSentence,
              type: item.isWord ? 'word' : 'sentence', // Use isWord to determine type
              labels: labelsToUse // Array of label IDs
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
    setInputMode('on-line')
    setInputText('')
    setProcessedItems([])
    setSelectedLabels([])
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
      const response = await authenticatedFetch(getApiUrl('/deepRemember/translate-word'), {
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
          isWord: data.isWord !== undefined ? data.isWord : true, // Use isWord from response, default to true
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
          <h3><span className="material-symbols-outlined">note_add</span> Add Multiple Cards</h3>
          <CloseButton 
            onClick={handleClose} 
            size="medium" 
            variant="default"
          />
        </div>
        
        <div className="add-list-content">
          {/* Input Section */}
          <div className="input-section">
            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="input-mode-select" style={{ marginBottom: '8px', display: 'block', fontWeight: '500', fontSize: '14px' }}>
                <strong>Input Mode:</strong>
              </label>
              <select
                id="input-mode-select"
                value={inputMode}
                onChange={(e) => {
                  setInputMode(e.target.value)
                  setInputText('')
                  setProcessedItems([])
                }}
                disabled={isProcessing || isSaving}
                style={{
                  padding: '8px 12px',
                  fontSize: '14px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  width: '100%',
                  maxWidth: '300px'
                }}
              >
                <option value="on-line">Enter as on-line</option>
                <option value="json">Enter as JSON</option>
              </select>
            </div>
            
            <label htmlFor="words-input">
              <strong>
                {inputMode === 'json' 
                  ? 'Enter JSON array (like work_data.json format):' 
                  : 'Enter words or sentences (one per line):'}
              </strong>
            </label>
            <textarea
              id="words-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={inputMode === 'json' 
                ? '[\n  {\n    "word": "das Problem",\n    "translation": "problem",\n    "context": "Es gibt einen Fehler.",\n    "label": "work"\n  },\n  {\n    "word": "testen",\n    "translation": "test",\n    "context": "Ich muss das noch testen.",\n    "label": "work"\n  }\n]'
                : "Enter words or sentences, one per line:&#10;Haus&#10;Auto&#10;Ich gehe nach Hause.&#10;Das ist ein schönes Buch."}
              rows={8}
              disabled={isProcessing || isSaving}
            />
            
            {/* Label Selector */}
            <div className="label-selector-wrapper" style={{ marginTop: '15px', marginBottom: '15px' }}>
              <label htmlFor="label-selector" style={{ marginBottom: '8px', display: 'block', fontWeight: '500', fontSize: '14px' }}>
                Labels (Optional) - Applied to all cards
              </label>
              <LabelSelector
                selectedLabels={selectedLabels}
                setSelectedLabels={setSelectedLabels}
                disabled={isProcessing || isSaving}
              />
            </div>
            
            <div className="input-actions">
              <button 
                className="btn-process"
                onClick={processInputText}
                disabled={!inputText.trim() || isProcessing || isSaving}
              >
                {isProcessing ? (
                  <>
                    <span className="material-symbols-outlined">refresh</span> Processing...
                  </>
                ) : inputMode === 'json' ? (
                  <>
                    <span className="material-symbols-outlined">code</span> Load JSON
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">translate</span> Process & Translate
                  </>
                )}
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
              <h4><span className="material-symbols-outlined">preview</span> Preview ({processedItems.length} items)</h4>
              <div className="preview-items">
                {processedItems.map((item, index) => (
                  <div key={item.id} className={`preview-item ${item.hasError ? 'error' : ''}`}>
                    <div className="item-header">
                      <div className="item-header-left">
                        <span className="item-number">#{index + 1}</span>
                        <span className={`item-tag ${item.isWord ? 'tag-word' : 'tag-sentence'}`}>
                          <span className="material-symbols-outlined">
                            {item.isWord ? 'text_fields' : 'article'}
                          </span>
                          {item.isWord ? 'Word' : 'Sentence'}
                        </span>
                      </div>
                      <div className="item-actions">
                        <button 
                          className="btn-refresh-item"
                          onClick={() => handleItemRefresh(index)}
                          disabled={isSaving || item.isProcessing}
                          title="Refresh translation"
                        >
                          <span className="material-symbols-outlined">refresh</span>
                        </button>
                        <button 
                          className="btn-remove-item"
                          onClick={() => removeItem(index)}
                          disabled={isSaving}
                          title="Remove item"
                        >
                          <span className="material-symbols-outlined">close</span>
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
                          <span className="material-symbols-outlined">refresh</span> Processing...
                        </div>
                      )}
                      
                      {item.hasError && (
                        <div className="item-error">
                          <span className="material-symbols-outlined">error</span> {item.errorMessage}
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
              {isSaving ? (
                <>
                  <span className="material-symbols-outlined">save</span> Saving...
                </>
              ) : (
                `Save ${processedItems.filter(item => !item.hasError).length} Cards`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddList
