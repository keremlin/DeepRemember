import React from 'react'
import Modal from '../Modal'
import './GrammarCheckModal.css'

const GrammarCheckModal = ({ isOpen, onClose, content, isLoading }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Grammar Check Results"
      size="large"
      className="grammar-check-modal"
    >
      <div className="grammar-check-content">
        {isLoading ? (
          <div className="grammar-check-loading">
            <div className="grammar-check-loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p>Checking grammar and spelling...</p>
          </div>
        ) : (
          <div className="grammar-check-results">
            {content ? (
              <div className="grammar-check-text">
                {content.split('\n').map((line, index) => {
                  // Check if line is empty
                  if (!line.trim()) {
                    return <br key={index} />
                  }
                  
                  // Check if line looks like a heading (starts with number or bullet)
                  const isHeading = /^(\d+\.|[-•*])\s/.test(line.trim())
                  
                  // Check if line looks like a correction entry
                  const isCorrection = /^(Original|Corrected|Sample)/i.test(line.trim())
                  
                  if (isHeading) {
                    return (
                      <h4 key={index} className="grammar-check-heading">
                        {line}
                      </h4>
                    )
                  } else if (isCorrection) {
                    return (
                      <div key={index} className="grammar-check-correction-line">
                        {line}
                      </div>
                    )
                  } else {
                    return (
                      <p key={index} className="grammar-check-paragraph">
                        {line}
                      </p>
                    )
                  }
                })}
              </div>
            ) : (
              <p className="grammar-check-empty">No results to display.</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

export default GrammarCheckModal

