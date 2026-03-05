import React from 'react'
import Page from '../Page'
import UserInfo from '../security/UserInfo'

const UserManagement = ({ 
  onUserSetup,
  onNavigateToWelcome,
  onNavigateToPlayer,
  onShowCards,
  onNavigateToUserManagement,
  onNavigateToManagement,
  onNavigateToChat,
  onNavigateToWordList,
  onNavigateToCourses,
  onNavigateToArtikelGame
}) => {
  return (
    <Page
      isCardsView={false}
      onUserSetup={onUserSetup}
      onToggleCardsView={() => {}}
      onNavigateToWelcome={onNavigateToWelcome}
      onNavigateToPlayer={onNavigateToPlayer}
      onShowCards={onShowCards}
      onNavigateToUserManagement={onNavigateToUserManagement}
      onNavigateToManagement={onNavigateToManagement}
      onNavigateToChat={onNavigateToChat}
      onNavigateToWordList={onNavigateToWordList}
      onNavigateToCourses={onNavigateToCourses}
      onNavigateToArtikelGame={onNavigateToArtikelGame}
    >
      <UserInfo onUserSetup={onUserSetup} />
    </Page>
  )
}

export default UserManagement

