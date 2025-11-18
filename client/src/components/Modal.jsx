import React, { useEffect } from 'react'
import CloseButton from './CloseButton'
import './Modal.css'

/**
 * Reusable Modal Component Template
 * 
 * @param {boolean} isOpen - Controls modal visibility
 * @param {function} onClose - Callback when modal should close
 * @param {string} title - Modal title text
 * @param {React.ReactNode} children - Modal content
 * @param {React.ReactNode} footer - Optional footer content (buttons, etc.)
 * @param {string} size - Modal size: 'small', 'medium', 'large', 'full' (default: 'medium')
 * @param {boolean} closeOnOverlayClick - Whether clicking overlay closes modal (default: true)
 * @param {boolean} closeOnEsc - Whether ESC key closes modal (default: true)
 * @param {string} className - Additional CSS classes for the modal
 * @param {string} overlayClassName - Additional CSS classes for the overlay
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'medium',
  closeOnOverlayClick = true,
  closeOnEsc = true,
  className = '',
  overlayClassName = ''
}) => {
  // Handle ESC key press
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return

    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscKey)

    return () => {
      document.removeEventListener('keydown', handleEscKey)
    }
  }, [isOpen, closeOnEsc, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose()
    }
  }

  // Handle modal content click (prevent closing when clicking inside)
  const handleModalClick = (e) => {
    e.stopPropagation()
  }

  if (!isOpen) return null

  return (
    <div 
      className={`modal-overlay ${overlayClassName}`.trim()}
      onClick={handleOverlayClick}
    >
      <div 
        className={`modal modal-${size} ${className}`.trim()}
        onClick={handleModalClick}
      >
        {title && (
          <div className="modal-header">
            <h3 className="modal-title">{title}</h3>
            <CloseButton 
              onClick={onClose} 
              size="medium" 
              variant="default"
              enableEscKey={false} // We handle ESC separately
            />
          </div>
        )}
        
        <div className="modal-content">
          {children}
        </div>

        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export default Modal

