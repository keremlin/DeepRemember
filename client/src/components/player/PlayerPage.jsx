import React, { useState, useRef } from 'react'
import AudioPlayer from './AudioPlayer'
import FileUpload from './FileUpload'
import CloseButton from '../CloseButton'
import Page from '../Page'
import UserManage from '../header/user/UserManage'
import { useToast } from '../ToastProvider'
import { useAuth } from '../security/AuthContext'
import './PlayerPage.css'

function PlayerPage({ onNavigateToWelcome, onNavigateToPlayer, onNavigateToDeepRemember, onNavigateToUserManagement, onNavigateToManagement, onNavigateToChat, onNavigateToWordList, onNavigateToCourses }) {
  const { showSuccess, showError } = useToast()
  const { user } = useAuth()
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showUserSetup, setShowUserSetup] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(user?.email || 'user123')
  const audioPlayerRef = useRef(null)

  const handleUploadSuccess = (result) => {
    const { files, refreshPlaylist } = result
    showSuccess(`Files uploaded successfully! ${files.subtitleFile ? 'Subtitle generated.' : 'Media uploaded.'}`)
    setShowUploadModal(false)
    
    // Refresh playlist if requested by backend
    if (refreshPlaylist && audioPlayerRef.current) {
      audioPlayerRef.current.refreshPlaylist()
    }
  }

  const handleUploadError = (error) => {
    showError(error)
  }

  return (
    <Page
      isCardsView={false}
      onUserSetup={() => setShowUserSetup(true)}
      onToggleCardsView={() => {}}
      onNavigateToWelcome={onNavigateToWelcome}
      onNavigateToPlayer={onNavigateToPlayer}
      onShowCards={() => onNavigateToDeepRemember(true)}
      onNavigateToUserManagement={onNavigateToUserManagement}
      onNavigateToManagement={onNavigateToManagement}
      onNavigateToChat={onNavigateToChat}
      onNavigateToWordList={onNavigateToWordList}
      onNavigateToCourses={onNavigateToCourses}
    >
      <div className="player-content">
        <AudioPlayer 
          ref={audioPlayerRef}
          onUploadClick={() => setShowUploadModal(true)}
        />
      </div>
      
      {/* User Setup Modal */}
      <UserManage
        isOpen={showUserSetup}
        onClose={() => setShowUserSetup(false)}
        currentUserId={currentUserId}
        onUserIdChange={setCurrentUserId}
        onLoadUserData={() => {}}
      />

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📁 Upload Media Files</h3>
              <CloseButton onClick={() => setShowUploadModal(false)} size="small" variant="light" />
            </div>
            <div className="modal-content">
              <FileUpload 
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />
            </div>
          </div>
        </div>
      )}
    </Page>
  )
}

export default PlayerPage
