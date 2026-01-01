import React, { useState, useEffect, useRef } from 'react'
import WordTranslationPopover from '../chat/WordTranslationPopover'
import SentenceTranslationPopover from '../chat/SentenceTranslationPopover'
import './TranslatableText.css'

const TranslatableText = ({
  text,
  enabled = true,
  wordClassName = 'translatable-word',
  translateButtonClassName = 'translatable-translate-button',
  containerClassName = '',
  contentClassName = '',
  textWrapperClassName = '',
  showTranslateButton = true,
  formatText,
  onWordClick,
  onTranslateClick,
  textRef: externalTextRef,
  contentRef: externalContentRef,
}) => {
  const [popoverState, setPopoverState] = useState({ word: null, position: null })
  const [sentencePopoverState, setSentencePopoverState] = useState({ text: null, position: null })
  const internalContentRef = useRef(null)
  const internalTextRef = useRef(null)
  const translateButtonRef = useRef(null)

  // Use external refs if provided, otherwise use internal refs
  const contentRef = externalContentRef || internalContentRef
  const textRef = externalTextRef || internalTextRef

  // Close popovers on scroll
  useEffect(() => {
    if (!popoverState.word && !sentencePopoverState.text) return

    const handleScroll = () => {
      setPopoverState({ word: null, position: null })
      setSentencePopoverState({ text: null, position: null })
    }

    window.addEventListener('scroll', handleScroll, true)
    return () => {
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [popoverState.word, sentencePopoverState.text])

  const handleWordClick = (e, word) => {
    if (!enabled) return
    
    e.stopPropagation()
    
    // Close sentence popover if open
    setSentencePopoverState({ text: null, position: null })
    
    // Clean the word (remove punctuation)
    const cleanWord = word.replace(/[.,!?;:()\[\]{}'"`]/g, '').trim()
    if (!cleanWord) return
    
    // Call optional callback
    if (onWordClick) {
      onWordClick(e, cleanWord)
    }
    
    // Get the position of the clicked element relative to viewport
    const rect = e.currentTarget.getBoundingClientRect()
    const contentRect = contentRef.current?.getBoundingClientRect()
    
    if (!contentRect) return
    
    // Calculate position relative to the content container (for absolute positioning)
    const popoverHeight = 50 // Approximate popover height
    const popoverMaxWidth = 375 // Max width of popover (50% bigger)
    const wordCenterX = rect.left - contentRect.left + rect.width / 2
    let x = wordCenterX
    let y = rect.top - contentRect.top - popoverHeight - 8 // Position above the word with spacing
    
    // Adjust if popover would go off screen horizontally
    const halfPopoverWidth = popoverMaxWidth / 2
    if (x - halfPopoverWidth < 0) {
      x = halfPopoverWidth
    } else if (x + halfPopoverWidth > contentRect.width) {
      x = contentRect.width - halfPopoverWidth
    }
    
    // Adjust if popover would go off screen vertically (show below instead)
    const showBelow = y < 0
    if (showBelow) {
      y = rect.bottom - contentRect.top + 8 // Position below the word with spacing
    }
    
    const position = {
      x: x, // Center of the word - popover will be centered using transform
      y: y,
      showBelow: showBelow
    }
    
    setPopoverState({ word: cleanWord, position })
  }

  const handleClosePopover = () => {
    setPopoverState({ word: null, position: null })
  }

  const handleTranslateClick = (e) => {
    if (!enabled || !text) return
    
    e.stopPropagation()
    
    // Close word popover if open
    setPopoverState({ word: null, position: null })
    
    // Call optional callback
    if (onTranslateClick) {
      onTranslateClick(e)
    }
    
    const textRect = textRef.current?.getBoundingClientRect()
    const contentRect = contentRef.current?.getBoundingClientRect()
    
    if (!textRect || !contentRect) return
    
    // Position popover below the text, centered horizontally on the text
    // Calculate position relative to contentRef (where popover will be positioned)
    const popoverMaxWidth = 600 // Max width of popover (50% bigger)
    const popoverEstimatedHeight = 150 // Estimated height of popover
    const textCenterX = textRect.left - contentRect.left + textRect.width / 2
    let x = textCenterX
    
    // Check if there's enough space below, if not, position above
    // Get viewport dimensions to check available space
    const viewportHeight = window.innerHeight
    const textBottomViewport = textRect.bottom
    const textTopViewport = textRect.top
    
    // Check space below and above in viewport
    const spaceBelowViewport = viewportHeight - textBottomViewport
    const spaceAboveViewport = textTopViewport
    
    // Prefer showing below, but switch to above if not enough space
    const showBelow = spaceBelowViewport >= popoverEstimatedHeight || 
                     (spaceBelowViewport > spaceAboveViewport && spaceBelowViewport >= 100)
    
    let y
    if (showBelow) {
      // Position below the text
      y = textRect.bottom - contentRect.top + 8
    } else {
      // Position above the text
      y = textRect.top - contentRect.top - popoverEstimatedHeight - 8
      // Ensure it doesn't go above the container
      if (y < 0) {
        y = 8 // Fallback to top of container with small padding
      }
    }
    
    // Adjust if popover would go off screen horizontally
    const halfPopoverWidth = popoverMaxWidth / 2
    if (x - halfPopoverWidth < 0) {
      x = halfPopoverWidth
    } else if (x + halfPopoverWidth > contentRect.width) {
      x = contentRect.width - halfPopoverWidth
    }
    
    setSentencePopoverState({ 
      text: text, 
      position: { x, y, showBelow } 
    })
  }

  const handleCloseSentencePopover = () => {
    setSentencePopoverState({ text: null, position: null })
  }

  const renderWord = (word, wordIndex, lineIndex = 0) => {
    const trimmedWord = word.trim()
    if (!trimmedWord) {
      // Return whitespace as-is
      return <span key={`${lineIndex}-${wordIndex}`}>{word}</span>
    }
    
    if (!enabled) {
      return <span key={`${lineIndex}-${wordIndex}`}>{word}</span>
    }
    
    return (
      <span
        key={`${lineIndex}-${wordIndex}`}
        className={wordClassName}
        onClick={(e) => handleWordClick(e, trimmedWord)}
        title="Click to translate"
      >
        {word}
      </span>
    )
  }

  // Default text formatter - simple word splitting
  const defaultFormatText = (text) => {
    if (!text) return ''
    
    // Split into words (preserve whitespace)
    const words = text.split(/(\s+)/)
    return words.map((word, wordIndex) => renderWord(word, wordIndex))
  }

  // Use custom formatter if provided, otherwise use default
  const formattedContent = formatText 
    ? formatText(text, renderWord)
    : defaultFormatText(text)

  return (
    <div className={`translatable-text-container ${containerClassName}`}>
      <div 
        ref={textRef}
        className={`translatable-text-wrapper ${contentClassName}`}
      >
        <div 
          ref={contentRef}
          className={`translatable-text-content ${textWrapperClassName}`}
          style={{ position: 'relative' }}
        >
          {formattedContent}
          {popoverState.word && popoverState.position && (
            <WordTranslationPopover
              word={popoverState.word}
              position={popoverState.position}
              onClose={handleClosePopover}
            />
          )}
          {sentencePopoverState.text && sentencePopoverState.position && (
            <SentenceTranslationPopover
              text={sentencePopoverState.text}
              position={sentencePopoverState.position}
              onClose={handleCloseSentencePopover}
            />
          )}
        </div>
        {showTranslateButton && enabled && (
          <div className="translatable-text-actions">
            <button
              ref={translateButtonRef}
              className={translateButtonClassName}
              onClick={handleTranslateClick}
              title="Translate text"
            >
              <span className="material-symbols-outlined google-icon">translate</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default TranslatableText

