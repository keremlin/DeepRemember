import React from 'react'
import './DueCardsCounter.css'

const DueCardsCounter = ({ count }) => {
  return (
    <div className="due-cards-counter">
      <span className="due-cards-label">Due:</span>
      <span className="due-cards-number">{count || 0}</span>
    </div>
  )
}

export default DueCardsCounter

