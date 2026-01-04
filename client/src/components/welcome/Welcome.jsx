import React from 'react'
import RadialMenu from './RadialMenu'
import './Welcome.css'

const Welcome = ({ onNavigateToDeepRemember, onNavigateToPlayer, onNavigateToManagement, onNavigateToChat, onNavigateToUserManagement, onNavigateToWordList, onNavigateToCourses }) => {
  return (
    <div className="welcome-page">
      <div className="welcome-header">
        <h1 className="welcome-title">Deep Learning</h1>
        <p className="welcome-subtitle">Quick Access Menu</p>
      </div>
      
      <RadialMenu 
        onNavigateToDeepRemember={onNavigateToDeepRemember}
        onNavigateToPlayer={onNavigateToPlayer}
        onNavigateToManagement={onNavigateToManagement}
        onNavigateToChat={onNavigateToChat}
        onNavigateToUserManagement={onNavigateToUserManagement}
        onNavigateToWordList={onNavigateToWordList}
        onNavigateToCourses={onNavigateToCourses}
      />
      
      <div className="welcome-footer">
        <p>Click the center button to open the menu</p>
      </div>
    </div>
  )
}

export default Welcome
