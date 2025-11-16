import React from 'react'
import Button from './Button'
import './StatsSection.css'

const StatsSection = ({ 
  stats, 
  setShowHelp, 
  setShowCreateCard,
  onShowManageCards,
  onStartReview 
}) => {
  return (
    <div className="stats-section">
      <div className="create-card-button">
        <Button
          variant="primary"
          size="medium"
          onClick={() => setShowCreateCard(true)}
          className="btn-upload-modal"
          title="Create new card"
          iconName="add_circle"
          iconPosition="left"
        >
          Create New Card
        </Button>
        {onShowManageCards && (
          <Button
            variant="primary"
            size="medium"
            onClick={onShowManageCards}
            className="btn-upload-modal"
            title="Manage cards"
            iconName="menu_book"
            iconPosition="left"
          >
            Manage Cards
          </Button>
        )}
        {onStartReview && (
          <Button
            variant="primary"
            size="medium"
            onClick={onStartReview}
            className="btn-upload-modal"
            title="Start Review"
            iconName="menu_book"
            iconPosition="left"
          >
            Start Review
          </Button>
        )}
      </div>
      
      <div className="srs-card">
        <div className="stats-header">
          <h3>
            <span className="material-symbols-outlined">bar_chart</span>
            Learning Statistics
          </h3>
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
            <div className="stats-header">
            <h3>
              <span className="material-symbols-outlined">Loyalty</span>
              Cards by Labels
            </h3>
            </div>
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
    </div>
  )
}

export default StatsSection
