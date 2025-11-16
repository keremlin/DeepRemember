import React, { useState } from 'react'
import ReviewSection from './ReviewSection/ReviewSection'
import StatsSection from './StatsSection'
import './DashboardView.css'

const DashboardView = ({ 
  currentCards, 
  currentCard, 
  showAnswer, 
  setShowAnswer, 
  answerCard, 
  stats, 
  setShowHelp, 
  setShowCreateCard,
  onShowManageCards 
}) => {
  const [isReviewMode, setIsReviewMode] = useState(false)

  return (
    <div className="dashboard-view">
      {/* Review Cards - only show in review mode */}
      {isReviewMode && currentCards.length > 0 && (
        <ReviewSection
          currentCard={currentCard}
          showAnswer={showAnswer}
          setShowAnswer={setShowAnswer}
          answerCard={answerCard}
        />
      )}

      {/* Statistics and Create Card Button - only show when not in review mode */}
      {!isReviewMode && (
        <StatsSection
          stats={stats}
          setShowHelp={setShowHelp}
          setShowCreateCard={setShowCreateCard}
          onShowManageCards={onShowManageCards}
          onStartReview={() => setIsReviewMode(true)}
        />
      )}
    </div>
  )
}

export default DashboardView
