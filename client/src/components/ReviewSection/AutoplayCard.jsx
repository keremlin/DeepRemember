import React from 'react'
import ModernCheckBox from '../ModernCheckBox'

const AutoplayCard = ({ autoPlay, setAutoPlay }) => {
  return (
    <ModernCheckBox
      checked={autoPlay}
      onChange={setAutoPlay}
      iconName="volume_up"
      text="autoplay"
    />
  )
}

export default AutoplayCard

