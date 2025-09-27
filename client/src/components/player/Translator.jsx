import React, { useState } from 'react'

const Translator = ({ 
  showTranslation, 
  setShowTranslation, 
  translationText, 
  translationType, 
  isTranslating,
  originalText 
}) => {
  if (!showTranslation) return null

  return (
    <div className="translation-display">
      <div className="translation-header">
        <span>
          🤖 {translationType === 'word' ? 'Word Translation' : 'Sentence Translation'}
        </span>
        <button 
          className="translation-close"
          onClick={() => setShowTranslation(false)}
          title="Close translation"
        >
          ×
        </button>
      </div>
      {originalText && (
        <div className="original-text">
          <strong>{translationType === 'word' ? 'Word' : 'Sentence'}:</strong> "{originalText}"
        </div>
      )}
      <p className="translation-text">
        <strong>Translation:</strong> {translationText}
      </p>
    </div>
  )
}

export default Translator
