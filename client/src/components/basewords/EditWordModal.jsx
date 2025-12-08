import React, { useState, useEffect } from 'react'
import { useToast } from '../ToastProvider'
import { getApiUrl } from '../../config/api'
import { useWordBase } from './WordBaseContext'
import Modal from '../Modal'
import Button from '../Button'
import './WordList.css'

const EditWordModal = ({ isOpen, onClose, word, onWordUpdated }) => {
  const { showSuccess, showError } = useToast()
  const { updateWordInCache } = useWordBase()
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

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.word.trim() || !formData.groupAlphabetName.trim() || !formData.type_of_word.trim()) {
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
          word: formData.word.trim(),
          translate: formData.translate.trim() || null,
          sample_sentence: formData.sample_sentence.trim() || null,
          groupAlphabetName: formData.groupAlphabetName.trim(),
          type_of_word: formData.type_of_word.trim(),
          plural_sign: formData.plural_sign.trim() || null,
          article: formData.article.trim() || null,
          female_form: formData.female_form.trim() || null,
          meaning: formData.meaning.trim() || null,
          more_info: formData.more_info.trim() || null
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
        disabled={isLoading}
      >
        Cancel
      </Button>
      <Button
        onClick={handleSubmit}
        variant="primary"
        size="medium"
        disabled={isLoading}
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
            disabled={isLoading}
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
            disabled={isLoading}
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
            disabled={isLoading}
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
              disabled={isLoading}
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
              disabled={isLoading}
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
              disabled={isLoading}
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
              disabled={isLoading}
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
            disabled={isLoading}
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
            disabled={isLoading}
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
            disabled={isLoading}
          />
        </div>
      </form>
    </Modal>
  )
}

export default EditWordModal

