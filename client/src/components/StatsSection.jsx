import React from 'react'
import './StatsSection.css'

const StatsSection = ({ 
  stats, 
  setShowHelp, 
  setShowCreateCard 
}) => {
  return (
    <div className="stats-section">
      <div className="srs-card">
        <div className="stats-header">
          <h3>📊 Learning Statistics</h3>
          <button className="help-btn" onClick={() => setShowHelp(true)}>?</button>
        </div>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-number">{stats.totalCards}</div>
            <div className="stat-label">Total Cards</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{stats.dueCards}</div>
            <div className="stat-label">Due Cards</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{stats.learningCards}</div>
            <div className="stat-label">Learning</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{stats.reviewCards}</div>
            <div className="stat-label">Review</div>
          </div>
        </div>
      </div>
      
      <div className="create-card-button">
        <button className="btn-create-card" onClick={() => setShowCreateCard(true)}>
          ➕ Create New Card
        </button>
      </div>
    </div>
  )
}

export default StatsSection
