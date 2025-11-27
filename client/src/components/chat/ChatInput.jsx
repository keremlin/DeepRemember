import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import Button from '../Button'
import './ChatInput.css'

const ChatInput = forwardRef(({ value, onChange, onSend, disabled = false }, ref) => {
  const textareaRef = useRef(null)

  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus()
    }
  }))

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [value])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = () => {
    if (value.trim() && !disabled) {
      onSend(value.trim())
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleChange = (e) => {
    onChange(e.target.value)
  }

  return (
    <div className="chat-input-container">
      <div className="chat-input-wrapper">
        <textarea
          ref={textareaRef}
          className="chat-input"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
          disabled={disabled}
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          variant="primary"
          size="medium"
          iconName="send"
          className="chat-send-button"
        >
          Send
        </Button>
      </div>
    </div>
  )
})

ChatInput.displayName = 'ChatInput'

export default ChatInput

