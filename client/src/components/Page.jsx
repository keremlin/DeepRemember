import React from 'react'
import Header from './header/Header'
import Footer from './Footer'
import './Page.css'

function Page({ 
  children,
  // Header props
  isCardsView, 
  onUserSetup, 
  onToggleCardsView, 
  onNavigateToWelcome,
  onNavigateToPlayer,
  onShowCards,
  onNavigateToUserManagement,
  isReviewMode
}) {
  return (
    <div className={`page-container ${isReviewMode ? 'review-mode' : ''}`}>
      <Header
        isCardsView={isCardsView}
        onUserSetup={onUserSetup}
        onToggleCardsView={onToggleCardsView}
        onNavigateToWelcome={onNavigateToWelcome}
        onNavigateToPlayer={onNavigateToPlayer}
        onShowCards={onShowCards}
        onNavigateToUserManagement={onNavigateToUserManagement}
      />
      
      <main className="page-body">
        {children}
      </main>
      
      <Footer />
    </div>
  )
}

export default Page

