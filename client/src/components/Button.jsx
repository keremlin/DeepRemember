import React from 'react'
import './Button.css'

const Button = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'medium',
  disabled = false,
  className = '',
  fullWidth = false,
  icon,
  iconName,
  iconPosition = 'left',
  ...props
}) => {
  const handleClick = (e) => {
    if (disabled) {
      e.preventDefault()
      return
    }
    if (onClick) {
      onClick(e)
    }
  }

  const buttonClasses = [
    'button',
    `button-${variant}`,
    `button-${size}`,
    fullWidth && 'button-full-width',
    disabled && 'button-disabled',
    className
  ]
    .filter(Boolean)
    .join(' ')

  // Automatically create Material icon if iconName is provided
  const renderIcon = () => {
    if (iconName) {
      return (
        <span className="material-symbols-outlined">{iconName}</span>
      )
    }
    return icon
  }

  const iconElement = renderIcon()

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={handleClick}
      disabled={disabled}
      aria-disabled={disabled}
      {...props}
    >
      {iconElement && iconPosition === 'left' && (
        <span className="button-icon button-icon-left">{iconElement}</span>
      )}
      {children && <span className="button-content">{children}</span>}
      {iconElement && iconPosition === 'right' && (
        <span className="button-icon button-icon-right">{iconElement}</span>
      )}
    </button>
  )
}

export default Button

