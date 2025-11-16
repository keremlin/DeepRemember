import React from 'react'
import Header from './header/Header'
import Footer from './Footer'
import './Page.css'

const Page = ({ 
  children,
  // Header props
  isCardsView, 
  onUserSetup, 
  onToggleCardsView, 
  onNavigateToWelcome,
  onNavigateToPlayer,
  onShowCards,
  onNavigateToUserManagement
}) => {
  return (
    <div className="page-container">
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

