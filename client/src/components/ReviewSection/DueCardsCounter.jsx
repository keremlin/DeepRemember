import React from 'react'
import './DueCardsCounter.css'

const DueCardsCounter = ({ count }) => {
  return (
    <div className="due-cards-counter-card">
      <div className="due-cards-icon-container">
        <span className="material-symbols-outlined due-cards-icon">diagnosis</span>
      </div>
      <div className="due-cards-content">
        <div className="due-cards-number">{count || 0}</div>
        <div className="due-cards-label">due cards</div>
      </div>
    </div>
  )
}

export default DueCardsCounter

