import React, { useState, useEffect } from 'react'
import ReviewSection from './ReviewSection/ReviewSection'
import StatsSection from './StatsSection'
import Button from './Button'
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
        <>
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
            {handleStartReview && (
              <Button
                variant="primary"
                size="medium"
                onClick={handleStartReview}
                className="btn-upload-modal"
                title="Start Review"
                iconName="menu_book"
                iconPosition="left"
              >
                Start Review
              </Button>
            )}
          </div>
          <StatsSection
            stats={stats}
            setShowHelp={setShowHelp}
            setShowCreateCard={setShowCreateCard}
            onShowManageCards={onShowManageCards}
            onStartReview={handleStartReview}
          />
        </>
      )}
    </div>
  )
}

export default DashboardView
