import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../security/AuthContext'
import { getApiUrl } from '../../config/api'
import './SentenceTranslationPopover.css'

const SentenceTranslationPopover = ({ text, position, onClose }) => {
  const { authenticatedFetch } = useAuth()
  const [translation, setTranslation] = useState('Loading...')
  const [isLoading, setIsLoading] = useState(true)
  const popoverRef = useRef(null)

  useEffect(() => {
    if (!text) return

    const fetchTranslation = async () => {
      setIsLoading(true)
      try {
        const response = await authenticatedFetch(getApiUrl('/deepRemember/translate'), {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
          },
          body: JSON.stringify({ text, type: 'sentence' })
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
  }, [text, authenticatedFetch])

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

  if (!text || !position) return null

  const style = {
    position: 'absolute',
    left: `${position.x}px`,
    top: `${position.y}px`,
    zIndex: 1000
  }

  return (
    <div 
      ref={popoverRef}
      className={`sentence-translation-popover ${position.showBelow ? 'arrow-up' : ''}`}
      style={style}
    >
      <div className="sentence-translation-popover-content">
        {isLoading ? (
          <div className="sentence-translation-popover-loading">
            <span></span>
            <span></span>
            <span></span>
          </div>
        ) : (
          <div className="sentence-translation-popover-translation">
            {translation}
          </div>
        )}
      </div>
      <div className="sentence-translation-popover-arrow"></div>
    </div>
  )
}

export default SentenceTranslationPopover

