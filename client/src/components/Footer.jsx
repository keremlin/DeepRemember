import React from 'react'
import { useTheme } from './ThemeContext'
import './Footer.css'

const Footer = () => {
  const { isDarkMode, toggleTheme } = useTheme()

  return (
    <footer className="page-footer">
      <div className="footer-content">
        <p>&copy; {new Date().getFullYear()} DeepRemember Learning System. All rights reserved.</p>
        <p className="footer-subtitle">Spaced Repetition System for vocabulary learning</p>
        <button className="theme-toggle-btn" onClick={toggleTheme} title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </div>
    </footer>
  )
}

export default Footer

