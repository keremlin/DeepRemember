import React, { useState, useEffect } from 'react'
import './Toast.css'

const Toast = ({ 
  message, 
  type = 'info', 
  duration = 4000, 
  position = 'top-right',
  onClose,
  show = false 
}) => {
  const [isVisible, setIsVisible] = useState(show)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    if (show) {
      setIsVisible(true)
      setIsLeaving(false)
      
      // Auto-hide after duration
      const timer = setTimeout(() => {
        handleClose()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [show, duration])

  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(() => {
      setIsVisible(false)
      if (onClose) {
        onClose()
      }
    }, 300) // Match CSS transition duration
  }

  if (!isVisible) return null

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'info':
      default:
        return 'ℹ️'
    }
  }

  return (
    <div className={`toast toast-${type} toast-${position} ${isLeaving ? 'toast-leaving' : ''}`}>
      <div className="toast-content">
        <div className="toast-icon">
          {getIcon()}
        </div>
        <div className="toast-message">
          {message}
        </div>
        <button 
          className="toast-close" 
          onClick={handleClose}
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
      <div className="toast-progress">
        <div className="toast-progress-bar"></div>
      </div>
    </div>
  )
}

export default Toast
