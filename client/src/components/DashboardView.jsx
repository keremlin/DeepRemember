import React, { useState, useEffect } from 'react'
import ReviewSection from './ReviewSection/ReviewSection'
import StatsSection from './StatsSection'
import './DashboardView.css'

const DashboardView = ({ 
  currentCards, 
  currentCard, 
  showAnswer, 
  setShowAnswer, 
  answerCard,
  onDeleteCard,
  onEditCard,
  stats, 
  setShowHelp, 
  setShowCreateCard,
  onShowManageCards,
  onReviewModeChange
}) => {
  const [isReviewMode, setIsReviewMode] = useState(false)

  const handleStartReview = () => {
    setIsReviewMode(true)
    if (onReviewModeChange) {
      onReviewModeChange(true)
    }
  }

  const handleEndReview = () => {
    setIsReviewMode(false)
    if (onReviewModeChange) {
      onReviewModeChange(false)
    }
  }

  // Update parent when review mode changes
  useEffect(() => {
    if (onReviewModeChange) {
      onReviewModeChange(isReviewMode && currentCards.length > 0)
    }
  }, [isReviewMode, currentCards.length, onReviewModeChange])

  // Check if review is complete (no more cards)
  useEffect(() => {
    if (isReviewMode && currentCards.length === 0) {
      handleEndReview()
    }
  }, [currentCards.length, isReviewMode])

  return (
    <div className="dashboard-view">
      {/* Review Cards - only show in review mode */}
      {isReviewMode && currentCards.length > 0 && (
        <ReviewSection
          currentCard={currentCard}
          showAnswer={showAnswer}
          setShowAnswer={setShowAnswer}
          answerCard={answerCard}
          onDeleteCard={onDeleteCard}
          onEditCard={onEditCard}
          dueCardsCount={stats?.dueCards || 0}
        />
      )}

      {/* Statistics and Create Card Button - only show when not in review mode */}
      {!isReviewMode && (
        <StatsSection
          stats={stats}
          setShowHelp={setShowHelp}
          setShowCreateCard={setShowCreateCard}
          onShowManageCards={onShowManageCards}
          onStartReview={handleStartReview}
        />
      )}
    </div>
  )
}

export default DashboardView
