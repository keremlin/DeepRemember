import React, { useState } from 'react'
import AudioPlayer from './AudioPlayer'
import FileUpload from './FileUpload'
import CloseButton from '../CloseButton'
import { useToast } from '../ToastProvider'
import './PlayerPage.css'

const PlayerPage = ({ onNavigateToWelcome }) => {
  const { showSuccess, showError } = useToast()
  const [showUploadModal, setShowUploadModal] = useState(false)

  const handleUploadSuccess = (files) => {
    showSuccess(`Files uploaded successfully! ${files.subtitleFile ? 'Subtitle generated.' : 'Media uploaded.'}`)
    setShowUploadModal(false)
  }

  const handleUploadError = (error) => {
    showError(error)
  }

  return (
    <div className="player-page">
      <div className="player-header">
        <button 
          className="btn-back" 
          onClick={onNavigateToWelcome}
          title="Back to Welcome"
        >
          ← Back
        </button>
        <h1>🎵 Deep Player</h1>
        <button 
          className="btn-upload-modal"
          onClick={() => setShowUploadModal(true)}
          title="Upload new files"
        >
          📁 Upload Files
        </button>
      </div>
      
      <div className="player-content">
        <AudioPlayer />
      </div>
      
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
    </div>
  )
}

export default PlayerPage
