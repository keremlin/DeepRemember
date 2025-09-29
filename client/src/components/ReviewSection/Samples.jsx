import React, { useState, useEffect } from 'react'
import SampleSentence from './SampleSentence'
import './Samples.css'

const Samples = ({ 
  showAnswer, 
  currentCard 
}) => {
  const [pressedKey, setPressedKey] = useState(null)

  // Keyboard shortcut handler for sample sentences
  const handleKeyDown = (event) => {
    if (!showAnswer || !currentCard) return
    
    // Number keys 1-9 for playing audio of corresponding sentences
    const key = event.key
    if (key >= '1' && key <= '9') {
      event.preventDefault()
      setPressedKey(key)
      setTimeout(() => setPressedKey(null), 300)
      
      // Find the corresponding SampleSentence and trigger its playAudio
      const sentenceIndex = parseInt(key) - 1
      const sentences = currentCard.context ? currentCard.context.split('\n').filter(s => s.trim()) : []
      
      if (sentenceIndex < sentences.length) {
        // Trigger playAudio for the specific sentence
        // We'll use a custom event to communicate with the specific SampleSentence
        const customEvent = new CustomEvent('playSentenceAudio', { 
          detail: { 
            sentenceIndex, 
            word: currentCard.word,
            sentence: sentences[sentenceIndex].trim()
          } 
        })
        document.dispatchEvent(customEvent)
      }
    }
  }

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showAnswer, currentCard])

  const formatContext = (context) => {
    if (!context) return ''
    return context.split('\n').map((line, index) => (
      <SampleSentence 
        key={index} 
        sentence={line} 
        index={index}
        word={currentCard?.word}
        showAnswer={showAnswer}
        pressedKey={pressedKey}
      />
    ))
  }

  return (
    <div className={`context-section ${!showAnswer ? 'disabled' : ''}`}>
      <h4>Samples</h4>
      <div className="context-text context-display">
        {showAnswer && currentCard ? formatContext(currentCard.context) : 'Click ANSWER to reveal sample sentences'}
      </div>
    </div>
  )
}

export default Samples
