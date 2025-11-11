import React from 'react'
import './Footer.css'

const Footer = () => {
  return (
    <footer className="page-footer">
      <div className="footer-content">
        <p>&copy; {new Date().getFullYear()} DeepRemember Learning System. All rights reserved.</p>
        <p className="footer-subtitle">Spaced Repetition System for vocabulary learning</p>
      </div>
    </footer>
  )
}

export default Footer

