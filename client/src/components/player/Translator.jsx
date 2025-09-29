import React, { useState } from 'react'
import CreateCardModal from '../CreateCardModal'

const Translator = ({ 
  showTranslation, 
  setShowTranslation, 
  translationText, 
  translationType, 
  isTranslating,
  originalText,
  currentUserId 
}) => {
  const [showCreateCardModal, setShowCreateCardModal] = useState(false)
  
  if (!showTranslation) return null

  return (
    <div className="translation-display">
      <div className="translation-header">
        <span>
          🤖 {translationType === 'word' ? 'Word Translation' : 'Sentence Translation'}
        </span>
        <div className="translation-actions">
          <button 
            className="translation-add"
            onClick={() => setShowCreateCardModal(true)}
            title="Add to cards"
          >
            ➕
          </button>
          <button 
            className="translation-close"
            onClick={() => setShowTranslation(false)}
            title="Close translation"
          >
            ×
          </button>
        </div>
      </div>
      {originalText && (
        <div className="original-text">
          <strong>{translationType === 'word' ? 'Word' : 'Sentence'}:</strong> "{originalText}"
        </div>
      )}
      <p className="translation-text">
        <strong>Translation:</strong> {translationText}
      </p>
      
      <CreateCardModal
        isOpen={showCreateCardModal}
        onClose={() => setShowCreateCardModal(false)}
        onCreateCard={() => {
          setShowCreateCardModal(false)
          setShowTranslation(false)
        }}
        currentUserId={currentUserId}
        prefillData={{
          word: originalText,
          translation: translationText,
          type: translationType
        }}
      />
    </div>
  )
}

export default Translator
