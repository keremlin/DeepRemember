import React from 'react'
import '../ManageCards/ManageCards.css'

const CardLabelList = ({ card, getCardType, getUserLabelsFromCard }) => {
  const cardType = getCardType ? getCardType(card) : 'word'
  const userLabels = getUserLabelsFromCard ? getUserLabelsFromCard(card) : []

  return (
    <div className="card-label-list">
      {/* User Labels - Show only color chips */}
      {userLabels.length > 0 && (
        <div className="card-user-labels">
          {userLabels.map((label) => (
            <span
              key={label.id}
              className="card-label-chip"
              style={{ backgroundColor: label.color || '#3B82F6' }}
              title={label.name}
            />
          ))}
        </div>
      )}
      {/* Card Type Tag */}
      <span className={`card-tag ${cardType === 'word' ? 'tag-word' : 'tag-sentence'}`}>
        <span className="material-symbols-outlined">
          {cardType === 'word' ? 'text_fields' : 'article'}
        </span>
        {cardType === 'word' ? 'Word' : 'Sentence'}
      </span>
    </div>
  )
}

export default CardLabelList

