import React, { useState } from 'react'
import './Welcome.css'

const Welcome = () => {
  const [isHovered, setIsHovered] = useState(false)

  const handleGetStarted = () => {
    alert('Welcome to the Subtitle Client! 🎉')
  }

  const handleLearnMore = () => {
    alert('This is a React.js application built with modern styling! 🚀')
  }

  return (
    <div className="welcome-container">
      <div className="welcome-header">
        <h1 className="welcome-title">
          🎵 Welcome to Subtitle Client
        </h1>
        <p className="welcome-subtitle">
          A modern React.js application with beautiful styling
        </p>
      </div>

      <div className="welcome-content">
        <div className="welcome-card">
          <div className="card-icon">🚀</div>
          <h3>Modern React.js</h3>
          <p>Built with the latest React.js features and best practices</p>
        </div>

        <div className="welcome-card">
          <div className="card-icon">🎨</div>
          <h3>Beautiful Design</h3>
          <p>Styled with modern CSS and gradient effects</p>
        </div>

        <div className="welcome-card">
          <div className="card-icon">⚡</div>
          <h3>Fast & Responsive</h3>
          <p>Optimized for performance and mobile devices</p>
        </div>
      </div>

      <div className="welcome-actions">
        <button 
          className={`btn btn-primary ${isHovered ? 'btn-hover' : ''}`}
          onClick={handleGetStarted}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          🚀 Get Started
        </button>
        <button 
          className="btn btn-secondary"
          onClick={handleLearnMore}
        >
          📚 Learn More
        </button>
      </div>

      <div className="welcome-footer">
        <p>Built with ❤️ using React.js and Vite</p>
      </div>
    </div>
  )
}

export default Welcome
