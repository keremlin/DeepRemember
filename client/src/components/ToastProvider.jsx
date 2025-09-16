import React, { createContext, useContext, useState, useCallback } from 'react'
import Toast from './Toast'

const ToastContext = createContext()

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, options = {}) => {
    const id = Date.now() + Math.random()
    const toast = {
      id,
      message,
      type: options.type || 'info',
      duration: options.duration || 4000,
      position: options.position || 'top-right',
      show: true
    }

    setToasts(prev => [...prev, toast])

    // Auto-remove after duration + animation time
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, (options.duration || 4000) + 300)

    return id
  }, [])

  const hideToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const clearAllToasts = useCallback(() => {
    setToasts([])
  }, [])

  // Convenience methods
  const showSuccess = useCallback((message, options = {}) => {
    return showToast(message, { ...options, type: 'success' })
  }, [showToast])

  const showError = useCallback((message, options = {}) => {
    return showToast(message, { ...options, type: 'error' })
  }, [showToast])

  const showWarning = useCallback((message, options = {}) => {
    return showToast(message, { ...options, type: 'warning' })
  }, [showToast])

  const showInfo = useCallback((message, options = {}) => {
    return showToast(message, { ...options, type: 'info' })
  }, [showToast])

  const value = {
    showToast,
    hideToast,
    clearAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={`toast-container ${toasts.length > 0 ? toasts[0].position : 'top-right'}`}>
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            position={toast.position}
            show={toast.show}
            onClose={() => hideToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
