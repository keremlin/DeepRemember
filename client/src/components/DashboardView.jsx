import React from 'react'
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
  setShowCreateCard 
}) => {
  return (
    <div className="dashboard-view">
      {/* Review Cards */}
      {currentCards.length > 0 && (
        <ReviewSection
          currentCard={currentCard}
          showAnswer={showAnswer}
          setShowAnswer={setShowAnswer}
          answerCard={answerCard}
        />
      )}

      {/* Statistics and Create Card Button */}
      <StatsSection
        stats={stats}
        setShowHelp={setShowHelp}
        setShowCreateCard={setShowCreateCard}
      />
    </div>
  )
}

export default DashboardView
