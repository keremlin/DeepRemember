import React from 'react'
import Modal from '../Modal'
import './CompletionModal.css'

const CompletionModal = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="small"
      closeOnOverlayClick={true}
      closeOnEsc={true}
      className="completion-modal"
    >
      <div className="completion-content">
        <div className="completion-icon">🎉</div>
        <h2 className="completion-message">Hurra you Finish Today !</h2>
        <button 
          className="completion-button"
          onClick={onClose}
        >
          Great!
        </button>
      </div>
    </Modal>
  )
}

export default CompletionModal

