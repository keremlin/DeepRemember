import React from 'react'
import './SampleSentence.css'

const SampleSentence = ({ 
  sentence, 
  index 
}) => {
  return (
    <div className="context-line">
      {sentence.trim()}
    </div>
  )
}

export default SampleSentence
