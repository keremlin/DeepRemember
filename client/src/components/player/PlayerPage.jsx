import React from 'react'
import AudioPlayer from './AudioPlayer'
import './PlayerPage.css'

const PlayerPage = ({ onNavigateToWelcome }) => {
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
      </div>
      
      <div className="player-content">
        <AudioPlayer />
      </div>
    </div>
  )
}

export default PlayerPage
