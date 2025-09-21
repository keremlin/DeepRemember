import React, { useEffect } from 'react'
import './CloseButton.css'

const CloseButton = ({ onClick, size = 'medium', variant = 'default', enableEscKey = true }) => {
  const handleClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (onClick) {
      onClick(e)
    }
  }

  // ESC key handler
  useEffect(() => {
    if (!enableEscKey) return

    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        if (onClick) {
          onClick(event)
        }
      }
    }

    // Add event listener
    document.addEventListener('keydown', handleEscKey)

    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleEscKey)
    }
  }, [onClick, enableEscKey])

  return (
    <button
      type="button"
      className={`close-button close-button-${size} close-button-${variant}`}
      onClick={handleClick}
      aria-label="Close"
      title="Close (or press ESC)"
    >
      <svg
        className="close-icon"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M18 6L6 18M6 6L18 18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

export default CloseButton