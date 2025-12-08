import React, { useState, useEffect } from 'react'
import { useToast } from '../ToastProvider'
import { getApiUrl } from '../../config/api'
import { useWordBase } from './WordBaseContext'
import { useAuth } from '../security/AuthContext'
import Modal from '../Modal'
import Button from '../Button'
import './WordList.css'

const EditWordModal = ({ isOpen, onClose, word, onWordUpdated }) => {
  const { showSuccess, showError } = useToast()
  const { updateWordInCache } = useWordBase()
  const { authenticatedFetch } = useAuth()
  const [formData, setFormData] = useState({
    word: '',
    translate: '',
    sample_sentence: '',
    groupAlphabetName: '',
    type_of_word: '',
    plural_sign: '',
    article: '',
    female_form: '',
    meaning: '',
    more_info: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isAutoCompleting, setIsAutoCompleting] = useState(false)

  // Update form data when word prop changes
  useEffect(() => {
    if (word) {
      setFormData({
        word: word.word || '',
        translate: word.translate || '',
        sample_sentence: word.sample_sentence || '',
        groupAlphabetName: word.groupAlphabetName || word.group_alphabet_name || '',
        type_of_word: word.type_of_word || '',
        plural_sign: word.plural_sign || '',
        article: word.article || '',
        female_form: word.female_form || '',
        meaning: word.meaning || '',
        more_info: word.more_info || ''
      })
    }
  }, [word])

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle auto-complete
  const handleAutoComplete = async () => {
    if (!formData.word.trim()) {
      showError('Word is required for auto-complete!')
      return
    }

    setIsAutoCompleting(true)
    try {
      // Send the current form data as JSON to the API
      const wordRecord = {
        word: formData.word || '',
        translate: formData.translate || '',
        sample_sentence: formData.sample_sentence || '',
        groupAlphabetName: formData.groupAlphabetName || '',
        type_of_word: formData.type_of_word || '',
        plural_sign: formData.plural_sign || '',
        article: formData.article || '',
        female_form: formData.female_form || '',
        meaning: formData.meaning || '',
        more_info: formData.more_info || ''
      }

      const response = await authenticatedFetch(getApiUrl('/deepRemember/translate-word'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify({ wordRecord })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success && data.wordData) {
        // Update form with LLM response, only filling empty fields
        const fillIfEmpty = (current, newValue) => {
          // Convert current to string and check if it has content
          const currentStr = current ? (Array.isArray(current) ? current.join('\n') : String(current)).trim() : ''
          return currentStr ? currentStr : (newValue || '')
        }
        
        setFormData(prev => ({
          word: fillIfEmpty(prev.word, data.wordData.word),
          translate: fillIfEmpty(prev.translate, data.wordData.translate),
          sample_sentence: fillIfEmpty(prev.sample_sentence, data.wordData.sample_sentence),
          groupAlphabetName: fillIfEmpty(prev.groupAlphabetName, data.wordData.groupAlphabetName),
          type_of_word: fillIfEmpty(prev.type_of_word, data.wordData.type_of_word),
          plural_sign: fillIfEmpty(prev.plural_sign, data.wordData.plural_sign),
          article: fillIfEmpty(prev.article, data.wordData.article),
          female_form: fillIfEmpty(prev.female_form, data.wordData.female_form),
          meaning: fillIfEmpty(prev.meaning, data.wordData.meaning),
          more_info: fillIfEmpty(prev.more_info, data.wordData.more_info)
        }))
        showSuccess('Auto-complete completed successfully!')
      } else {
        throw new Error(data.error || 'Failed to auto-complete word')
      }
    } catch (error) {
      console.error('Error auto-completing word:', error)
      showError(`Failed to auto-complete word: ${error.message}`)
    } finally {
      setIsAutoCompleting(false)
    }
  }

  // Helper function to safely convert value to string and trim
  const safeTrim = (value) => {
    if (value === null || value === undefined) return null
    if (Array.isArray(value)) return value.join('\n').trim() || null
    if (typeof value === 'object') return JSON.stringify(value).trim() || null
    return String(value).trim() || null
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const trimmedWord = safeTrim(formData.word)
    const trimmedGroupAlphabet = safeTrim(formData.groupAlphabetName)
    const trimmedTypeOfWord = safeTrim(formData.type_of_word)
    
    if (!trimmedWord || !trimmedGroupAlphabet || !trimmedTypeOfWord) {
      showError('Word, group alphabet name, and type of word are required!')
      return
    }

    if (!word?.id) {
      showError('Word ID is missing!')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(getApiUrl(`/api/word-base/${word.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify({
          word: trimmedWord,
          translate: safeTrim(formData.translate),
          sample_sentence: safeTrim(formData.sample_sentence),
          groupAlphabetName: trimmedGroupAlphabet,
          type_of_word: trimmedTypeOfWord,
          plural_sign: safeTrim(formData.plural_sign),
          article: safeTrim(formData.article),
          female_form: safeTrim(formData.female_form),
          meaning: safeTrim(formData.meaning),
          more_info: safeTrim(formData.more_info)
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        showSuccess('Word updated successfully!')
        // Update cache with the updated word
        if (data.word) {
          updateWordInCache(data.word)
        }
        onWordUpdated()
      } else {
        throw new Error(data.error || 'Failed to update word')
      }
    } catch (error) {
      console.error('Error updating word:', error)
      showError(`Failed to update word: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const footer = (
    <div className="edit-word-modal-footer">
      <Button
        onClick={onClose}
        variant="secondary"
        size="medium"
        disabled={isLoading || isAutoCompleting}
      >
        Cancel
      </Button>
      <Button
        onClick={handleAutoComplete}
        variant="secondary"
        size="medium"
        disabled={isLoading || isAutoCompleting}
        iconName="auto_fix_high"
      >
        {isAutoCompleting ? 'Auto Completing...' : 'Auto Complete'}
      </Button>
      <Button
        onClick={handleSubmit}
        variant="primary"
        size="medium"
        disabled={isLoading || isAutoCompleting}
        iconName="save"
      >
        {isLoading ? 'Saving...' : 'Save'}
      </Button>
    </div>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Word"
      footer={footer}
      size="large"
    >
      <form className="edit-word-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="word">Word *</label>
          <input
            type="text"
            id="word"
            name="word"
            value={formData.word}
            onChange={handleInputChange}
            required
            disabled={isLoading || isAutoCompleting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="translate">Translation</label>
          <input
            type="text"
            id="translate"
            name="translate"
            value={formData.translate}
            onChange={handleInputChange}
            disabled={isLoading || isAutoCompleting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="sample_sentence">Sample Sentence</label>
          <textarea
            id="sample_sentence"
            name="sample_sentence"
            value={formData.sample_sentence}
            onChange={handleInputChange}
            rows="3"
            disabled={isLoading || isAutoCompleting}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="groupAlphabetName">Alphabet Group *</label>
            <input
              type="text"
              id="groupAlphabetName"
              name="groupAlphabetName"
              value={formData.groupAlphabetName}
              onChange={handleInputChange}
              required
              maxLength="1"
              disabled={isLoading || isAutoCompleting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="type_of_word">Type of Word *</label>
            <select
              id="type_of_word"
              name="type_of_word"
              value={formData.type_of_word}
              onChange={handleInputChange}
              required
              disabled={isLoading || isAutoCompleting}
            >
              <option value="">Select type</option>
              <option value="noun">Noun</option>
              <option value="verb">Verb</option>
              <option value="adjective">Adjective</option>
              <option value="adverb">Adverb</option>
              <option value="preposition">Preposition</option>
              <option value="pronoun">Pronoun</option>
              <option value="conjunction">Conjunction</option>
              <option value="article">Article</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="article">Article</label>
            <select
              id="article"
              name="article"
              value={formData.article}
              onChange={handleInputChange}
              disabled={isLoading || isAutoCompleting}
            >
              <option value="">None</option>
              <option value="der">der</option>
              <option value="die">die</option>
              <option value="das">das</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="plural_sign">Plural Sign</label>
            <input
              type="text"
              id="plural_sign"
              name="plural_sign"
              value={formData.plural_sign}
              onChange={handleInputChange}
              disabled={isLoading || isAutoCompleting}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="female_form">Female Form</label>
          <input
            type="text"
            id="female_form"
            name="female_form"
            value={formData.female_form}
            onChange={handleInputChange}
            disabled={isLoading || isAutoCompleting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="meaning">Meaning</label>
          <textarea
            id="meaning"
            name="meaning"
            value={formData.meaning}
            onChange={handleInputChange}
            rows="2"
            disabled={isLoading || isAutoCompleting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="more_info">More Info</label>
          <textarea
            id="more_info"
            name="more_info"
            value={formData.more_info}
            onChange={handleInputChange}
            rows="2"
            disabled={isLoading || isAutoCompleting}
          />
        </div>
      </form>
    </Modal>
  )
}

export default EditWordModal

