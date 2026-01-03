import React, { useState } from 'react'
import Page from '../Page'
import LabelsModal from '../labels/LabelsModal'
import ChatTemplates from '../chat/ChatTemplates'
import UserConfigurationManager from './UserConfigurationManager'
import AppVariables from '../AppVariable/AppVariables'
import '../security/UserInfo.css'

const UserManagement = ({ 
  onUserSetup,
  onNavigateToWelcome,
  onNavigateToPlayer,
  onShowCards,
  onNavigateToUserManagement,
  onNavigateToManagement,
  onNavigateToChat,
  onNavigateToWordList
}) => {
  const [showLabelsModal, setShowLabelsModal] = useState(false)
  const [showChatTemplates, setShowChatTemplates] = useState(false)
  const [showUserConfigs, setShowUserConfigs] = useState(false)
  const [showAppVariables, setShowAppVariables] = useState(false)

  const handleLabelsClick = () => {
    setShowLabelsModal(true)
  }

  const handleChatTemplatesClick = () => {
    setShowChatTemplates(true)
  }

  const handleConfigClick = () => {
    setShowUserConfigs(true)
  }

  const handleVariablesClick = () => {
    setShowAppVariables(true)
  }

  if (showAppVariables) {
    return (
      <AppVariables
        onUserSetup={onUserSetup}
        onNavigateToWelcome={onNavigateToWelcome}
        onNavigateToPlayer={onNavigateToPlayer}
        onShowCards={onShowCards}
        onNavigateToUserManagement={onNavigateToUserManagement}
        onNavigateToManagement={() => {
          setShowAppVariables(false)
          onNavigateToManagement()
        }}
        onNavigateToChat={onNavigateToChat}
        onNavigateToWordList={onNavigateToWordList}
      />
    )
  }

  if (showUserConfigs) {
    return (
      <UserConfigurationManager
        onUserSetup={onUserSetup}
        onNavigateToWelcome={onNavigateToWelcome}
        onNavigateToPlayer={onNavigateToPlayer}
        onShowCards={onShowCards}
        onNavigateToUserManagement={onNavigateToUserManagement}
        onNavigateToManagement={() => {
          setShowUserConfigs(false)
          onNavigateToManagement()
        }}
        onNavigateToChat={onNavigateToChat}
        onNavigateToWordList={onNavigateToWordList}
      />
    )
  }

  if (showChatTemplates) {
    return (
      <ChatTemplates
        onUserSetup={onUserSetup}
        onNavigateToWelcome={onNavigateToWelcome}
        onNavigateToPlayer={onNavigateToPlayer}
        onShowCards={onShowCards}
        onNavigateToUserManagement={onNavigateToUserManagement}
        onNavigateToManagement={() => {
          setShowChatTemplates(false)
          onNavigateToManagement()
        }}
        onNavigateToChat={onNavigateToChat}
      />
    )
  }

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
    >
      <div className="user-management-content">
        <div className="user-info">
          <div 
            className="user-info-item" 
            onClick={handleLabelsClick} 
            title="Labels"
          >
            <div className="user-info-icon">
              <span className="material-symbols-outlined">label</span>
            </div>
            <div className="user-info-label">Labels</div>
          </div>
          <div 
            className="user-info-item" 
            onClick={handleChatTemplatesClick} 
            title="Chat Templates"
          >
            <div className="user-info-icon">
              <span className="material-symbols-outlined">chat_bubble_outline</span>
            </div>
            <div className="user-info-label">Chat Templates</div>
          </div>
          <div 
            className="user-info-item" 
            onClick={handleConfigClick} 
            title="Config"
          >
            <div className="user-info-icon">
              <span className="material-symbols-outlined">settings</span>
            </div>
            <div className="user-info-label">Config</div>
          </div>
          <div 
            className="user-info-item" 
            onClick={handleVariablesClick} 
            title="Variables"
          >
            <div className="user-info-icon">
              <span className="material-symbols-outlined">code</span>
            </div>
            <div className="user-info-label">Variables</div>
          </div>
        </div>
      </div>

      {/* Labels Modal */}
      <LabelsModal
        isOpen={showLabelsModal}
        onClose={() => setShowLabelsModal(false)}
      />
    </Page>
  )
}

export default UserManagement

