import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../security/AuthContext'
import { getApiUrl } from '../../config/api'
import './WordTranslationPopover.css'

const WordTranslationPopover = ({ word, position, onClose }) => {
  const { authenticatedFetch } = useAuth()
  const [translation, setTranslation] = useState('Loading...')
  const [isLoading, setIsLoading] = useState(true)
  const popoverRef = useRef(null)

  useEffect(() => {
    if (!word) return

    const fetchTranslation = async () => {
      setIsLoading(true)
      try {
        const response = await authenticatedFetch(getApiUrl('/deepRemember/translate'), {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
          },
          body: JSON.stringify({ text: word, type: 'word' })
        })
        
        const data = await response.json()
        const translationText = data?.translation || 'No translation found.'
        setTranslation(translationText)
      } catch (error) {
        console.error('Translation error:', error)
        setTranslation('Error fetching translation.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTranslation()
  }, [word, authenticatedFetch])

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  if (!word || !position) return null

  const style = {
    position: 'absolute',
    left: `${position.x}px`,
    top: `${position.y}px`,
    zIndex: 1000
  }

  return (
    <div 
      ref={popoverRef}
      className={`word-translation-popover ${position.showBelow ? 'arrow-up' : ''}`}
      style={style}
    >
      <div className="word-translation-popover-content">
        {isLoading ? (
          <div className="word-translation-popover-loading">
            <span></span>
            <span></span>
            <span></span>
          </div>
        ) : (
          <div className="word-translation-popover-translation">
            {translation}
          </div>
        )}
      </div>
      <div className="word-translation-popover-arrow"></div>
    </div>
  )
}

export default WordTranslationPopover

