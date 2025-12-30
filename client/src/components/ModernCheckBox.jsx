import React from 'react'
import './ModernCheckBox.css'

const ModernCheckBox = ({ 
  checked, 
  onChange, 
  iconName = 'check', 
  text = '',
  icon = null 
}) => {
  const handleClick = (e) => {
    e.preventDefault()
    onChange(!checked)
  }

  return (
    <div 
      className={`modern-checkbox-card ${checked ? 'checked' : ''}`}
      onClick={handleClick}
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onChange(!checked)
        }
      }}
    >
      <div className="modern-checkbox-indicator">
        <div className={`modern-checkbox-outline ${checked ? 'checked' : ''}`}></div>
        {checked && (
          <span className="material-symbols-outlined modern-checkbox-check">check</span>
        )}
      </div>
      <div className="modern-checkbox-icon-container">
        {icon || <span className="material-symbols-outlined modern-checkbox-icon">{iconName}</span>}
      </div>
      <div className="modern-checkbox-text">{text}</div>
      <input
        type="checkbox"
        checked={checked}
        onChange={() => {}} // Controlled by onClick
        className="modern-checkbox-input"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  )
}

export default ModernCheckBox

