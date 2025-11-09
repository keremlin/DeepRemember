import React from 'react'
import './StatsSection.css'

const StatsSection = ({ 
  stats, 
  setShowHelp, 
  setShowCreateCard,
  onShowManageCards 
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
        
        {/* Label Statistics */}
        {stats.labelCounts && stats.labelCounts.length > 0 && (
          <div className="label-stats-section">
            <h4>🏷️ Cards by Labels</h4>
            <div className="label-stats-grid">
              {stats.labelCounts.map((label, index) => (
                <div key={index} className="label-stat-item">
                  <div className="label-stat-header">
                    <div 
                      className="label-color-indicator" 
                      style={{ backgroundColor: label.color }}
                    ></div>
                    <span className="label-name">{label.name}</span>
                  </div>
                  <div className="label-stat-number">{label.count}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="create-card-button">
        <button className="btn-create-card" onClick={() => setShowCreateCard(true)}>
          ➕ Create New Card
        </button>
        {onShowManageCards && (
          <button className="btn-manage-cards" onClick={onShowManageCards}>
            📚 Manage Cards
          </button>
        )}
      </div>
    </div>
  )
}

export default StatsSection
