import React from 'react'
import Modal from './Modal'

/**
 * Generic confirmation modal used instead of window.confirm
 */
const AreYouSureModal = ({
  isOpen,
  title = 'Please Confirm',
  question = 'Are you sure?',
  description = '',
  confirmLabel = 'Yes',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isConfirming = false,
  confirmButtonVariant = 'danger'
}) => {
  const getConfirmButtonClass = () => {
    switch (confirmButtonVariant) {
      case 'primary':
        return 'btn-modal btn-modal-primary'
      case 'secondary':
        return 'btn-modal btn-modal-secondary'
      case 'danger':
      default:
        return 'btn-modal btn-modal-danger'
    }
  }

  const footer = (
    <div className="modal-buttons modal-buttons-right">
      <button
        type="button"
        className="btn-modal btn-modal-secondary"
        onClick={onCancel}
        disabled={isConfirming}
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        className={getConfirmButtonClass()}
        onClick={onConfirm}
        disabled={isConfirming}
      >
        {confirmLabel}
      </button>
    </div>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      footer={footer}
      size="small"
      closeOnOverlayClick={!isConfirming}
    >
      <div className="are-you-sure-modal-content">
        <p className="are-you-sure-modal-question">{question}</p>
        {description && (
          <p className="are-you-sure-modal-description">{description}</p>
        )}
      </div>
    </Modal>
  )
}

export default AreYouSureModal




