import React from 'react'
import Modal from '../../Modal'
import { diffWords } from 'diff'
import './DictationCheckModal.css'

const DictationCheckModal = ({ isOpen, onClose, originalText, userText }) => {
  if (!isOpen) return null

  // Use diffWords for word-level comparison (case-sensitive)
  const differences = diffWords(originalText, userText)

  // Calculate statistics
  const stats = {
    total: differences.length,
    added: differences.filter(d => d.added).length,
    removed: differences.filter(d => d.removed).length,
    unchanged: differences.filter(d => !d.added && !d.removed).length
  }

  const footer = (
    <button
      className="btn-modal btn-modal-primary"
      onClick={onClose}
    >
      OK
    </button>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Dictation Check Results"
      size="large"
      className="dictation-check-modal"
      footer={footer}
    >
      <div className="dictation-check-content">
        {/* Statistics */}
        <div className="dictation-check-stats">
          <div className="stat-item">
            <span className="stat-label">Total Differences:</span>
            <span className="stat-value">{stats.added + stats.removed}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Added:</span>
            <span className="stat-value added">{stats.added}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Removed:</span>
            <span className="stat-value removed">{stats.removed}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Correct:</span>
            <span className="stat-value correct">{stats.unchanged}</span>
          </div>
        </div>

        {/* Comparison Display */}
        <div className="dictation-check-comparison">
          <div className="comparison-section">
            <h4 className="comparison-title">Original Text</h4>
            <div className="comparison-text original">
              {differences.map((part, index) => {
                if (part.added) return null
                return (
                  <span
                    key={index}
                    className={part.removed ? 'diff-removed' : 'diff-unchanged'}
                  >
                    {part.value}
                  </span>
                )
              })}
            </div>
          </div>

          <div className="comparison-section">
            <h4 className="comparison-title">Your Text</h4>
            <div className="comparison-text user">
              {differences.map((part, index) => {
                if (part.removed) return null
                return (
                  <span
                    key={index}
                    className={part.added ? 'diff-added' : 'diff-unchanged'}
                  >
                    {part.value}
                  </span>
                )
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="dictation-check-legend">
          <div className="legend-item">
            <span className="legend-color diff-added"></span>
            <span className="legend-text">Added/Extra words</span>
          </div>
          <div className="legend-item">
            <span className="legend-color diff-removed"></span>
            <span className="legend-text">Removed/Missing words</span>
          </div>
          <div className="legend-item">
            <span className="legend-color diff-unchanged"></span>
            <span className="legend-text">Correct words</span>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default DictationCheckModal

