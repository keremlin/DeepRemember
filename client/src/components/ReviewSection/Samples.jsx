import React from 'react'
import SampleSentence from './SampleSentence'
import './Samples.css'

const Samples = ({ 
  showAnswer, 
  currentCard 
}) => {
  const formatContext = (context) => {
    if (!context) return ''
    return context.split('\n').map((line, index) => (
      <SampleSentence 
        key={index} 
        sentence={line} 
        index={index} 
      />
    ))
  }

  return (
    <div className={`context-section ${!showAnswer ? 'disabled' : ''}`}>
      <h4>Samples</h4>
      <div className="context-text context-display">
        {showAnswer && currentCard ? formatContext(currentCard.context) : 'Click ANSWER to reveal sample sentences'}
      </div>
    </div>
  )
}

export default Samples
