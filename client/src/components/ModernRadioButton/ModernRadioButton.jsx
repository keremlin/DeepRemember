import React from 'react'
import './ModernRadioButton.css'

const ModernRadioButton = ({ options, value, onChange, name }) => {
  const handleChange = (optionValue) => {
    if (onChange) {
      onChange(optionValue)
    }
  }

  return (
    <div className="modern-radio-button-group" role="radiogroup" aria-label={name}>
      {options.map((option, index) => {
        const isSelected = value === option.value
        const isFirst = index === 0
        const isLast = index === options.length - 1
        
        return (
          <button
            key={option.value}
            type="button"
            className={`modern-radio-button ${isSelected ? 'selected' : ''} ${isFirst ? 'first' : ''} ${isLast ? 'last' : ''}`}
            onClick={() => handleChange(option.value)}
            aria-checked={isSelected}
            role="radio"
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export default ModernRadioButton

