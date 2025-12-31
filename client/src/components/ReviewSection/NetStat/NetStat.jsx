import React, { useState, useEffect } from 'react'
import { useAuth } from '../../security/AuthContext'
import { getApiUrl } from '../../../config/api'
import ModernRadioButton from '../../ModernRadioButton/ModernRadioButton'
import './NetStat.css'

const NetStat = () => {
  const { authenticatedFetch } = useAuth()
  const [activityStats, setActivityStats] = useState([])
  const [prevActivityStats, setPrevActivityStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [error, setError] = useState(null)
  const [timePeriod, setTimePeriod] = useState('today')

  const timePeriodOptions = [
    { value: 'today', label: 'Today' },
    { value: 'this_week', label: 'This Week' },
    { value: 'this_month', label: 'This Month' }
  ]

  useEffect(() => {
    const fetchActivityStats = async () => {
      try {
        // Keep previous data visible during transition
        setActivityStats(prevStats => {
          if (prevStats.length > 0) {
            setPrevActivityStats(prevStats)
            setIsTransitioning(true)
          }
          return prevStats
        })
        
      setError(null)
      const url = `${getApiUrl('/api/timer/activity-stats')}?period=${timePeriod}`
      const response = await authenticatedFetch(url)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.success && Array.isArray(data.stats)) {
        setTimeout(() => {
          setActivityStats(data.stats)
          setPrevActivityStats([])
          setIsTransitioning(false)
        }, 150)
        } else {
          setError('Failed to load activity statistics')
          setIsTransitioning(false)
        }
      } catch (err) {
        console.error('[NetStat] Error fetching activity stats:', err)
        setError(err.message || 'Failed to load activity statistics')
        setIsTransitioning(false)
      } finally {
        setLoading(prev => {
          if (prev) {
            return false
          }
          return prev
        })
      }
    }
    
    fetchActivityStats()
  }, [timePeriod, authenticatedFetch])

  // Format activity name for display
  const formatActivityName = (activity) => {
    if (!activity) return 'Unknown'
    return activity
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Calculate normalized values for radar chart (0-5 scale)
  const getNormalizedData = () => {
    if (!activityStats || activityStats.length === 0) {
      return []
    }
    
    // Filter out entries with 0 or negative seconds
    const validStats = activityStats.filter(s => s && s.totalSeconds > 0)
    
    if (validStats.length === 0) {
      return []
    }
    
    // Find max value for normalization
    const maxSeconds = Math.max(...validStats.map(s => s.totalSeconds))
    
    if (maxSeconds === 0) {
      return []
    }
    
    // Normalize to 0-5 scale
    return validStats.map(stat => ({
      activity: stat.activity,
      label: formatActivityName(stat.activity),
      value: Math.min(5, (stat.totalSeconds / maxSeconds) * 5),
      totalSeconds: stat.totalSeconds
    }))
  }

  const normalizedData = getNormalizedData()
  
  // Get previous normalized data for transition
  const getPrevNormalizedData = () => {
    if (!prevActivityStats || prevActivityStats.length === 0) {
      return []
    }
    
    const validStats = prevActivityStats.filter(s => s && s.totalSeconds > 0)
    
    if (validStats.length === 0) {
      return []
    }
    
    const maxSeconds = Math.max(...validStats.map(s => s.totalSeconds))
    
    if (maxSeconds === 0) {
      return []
    }
    
    return validStats.map(stat => ({
      activity: stat.activity,
      label: formatActivityName(stat.activity),
      value: Math.min(5, (stat.totalSeconds / maxSeconds) * 5),
      totalSeconds: stat.totalSeconds
    }))
  }
  
  const prevNormalizedData = getPrevNormalizedData()
  const displayData = isTransitioning && prevNormalizedData.length > 0 ? prevNormalizedData : normalizedData

  // Radar chart configuration (smaller size for horizontal layout)
  const chartSize = 300
  const centerX = chartSize / 2
  const centerY = chartSize / 2
  const radius = 100
  const levels = 5
  const angleStep = (2 * Math.PI) / (displayData.length || 6)

  // Calculate point on circle
  const getPoint = (angle, distance) => {
    const x = centerX + Math.cos(angle) * distance
    const y = centerY + Math.sin(angle) * distance
    return { x, y }
  }

  // Generate polygon points for data
  const getDataPoints = (data = displayData) => {
    if (data.length === 0) return ''
    
    const dataAngleStep = (2 * Math.PI) / (data.length || 6)
    return data.map((item, index) => {
      const angle = (index * dataAngleStep) - (Math.PI / 2) // Start from top
      const distance = (item.value / 5) * radius
      const point = getPoint(angle, distance)
      return `${point.x},${point.y}`
    }).join(' ')
  }

  // Generate grid circles
  const getGridCircles = () => {
    const circles = []
    for (let i = 1; i <= levels; i++) {
      const r = (i / levels) * radius
      circles.push(
        <circle
          key={i}
          cx={centerX}
          cy={centerY}
          r={r}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="1"
        />
      )
    }
    return circles
  }

  // Generate grid lines (spokes)
  const getGridLines = (data = displayData) => {
    if (data.length === 0) return []
    
    const dataAngleStep = (2 * Math.PI) / (data.length || 6)
    const lines = []
    for (let i = 0; i < data.length; i++) {
      const angle = (i * dataAngleStep) - (Math.PI / 2)
      const endPoint = getPoint(angle, radius)
      lines.push(
        <line
          key={i}
          x1={centerX}
          y1={centerY}
          x2={endPoint.x}
          y2={endPoint.y}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="1"
        />
      )
    }
    return lines
  }

  // Generate labels
  const getLabels = (data = displayData) => {
    if (data.length === 0) return []
    
    const dataAngleStep = (2 * Math.PI) / (data.length || 6)
    return data.map((item, index) => {
      const angle = (index * dataAngleStep) - (Math.PI / 2)
      const labelDistance = radius + 20
      const point = getPoint(angle, labelDistance)
      
      return (
        <text
          key={`${item.activity}-${index}`}
          x={point.x}
          y={point.y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="radar-label"
        >
          {item.label}
        </text>
      )
    })
  }

  // Generate value labels
  const getValueLabels = (data = displayData) => {
    if (data.length === 0) return []
    
    const dataAngleStep = (2 * Math.PI) / (data.length || 6)
    return data.map((item, index) => {
      const angle = (index * dataAngleStep) - (Math.PI / 2)
      const distance = (item.value / 5) * radius
      const point = getPoint(angle, distance)
      
      return (
        <text
          key={`${item.activity}-${index}`}
          x={point.x}
          y={point.y - 15}
          textAnchor="middle"
          dominantBaseline="middle"
          className="radar-value"
        >
          {item.value.toFixed(1)}
        </text>
      )
    })
  }

  // Format time
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  if (error && !isTransitioning) {
    return (
      <div className="net-stat-container">
        <div className="net-stat-header">
          <h3>
            <span className="material-symbols-outlined">radar</span>
            Activity Statistics
          </h3>
          <div className="net-stat-period-selector">
            <ModernRadioButton
              options={timePeriodOptions}
              value={timePeriod}
              onChange={setTimePeriod}
              name="time-period"
            />
          </div>
        </div>
        <div className="net-stat-error">{error}</div>
      </div>
    )
  }
  
  if (loading && activityStats.length === 0) {
    return (
      <div className="net-stat-container">
        <div className="net-stat-header">
          <h3>
            <span className="material-symbols-outlined">radar</span>
            Activity Statistics
          </h3>
          <div className="net-stat-period-selector">
            <ModernRadioButton
              options={timePeriodOptions}
              value={timePeriod}
              onChange={setTimePeriod}
              name="time-period"
            />
          </div>
        </div>
        <div className="net-stat-loading">Loading activity statistics...</div>
      </div>
    )
  }

  if (!loading && normalizedData.length === 0 && !isTransitioning) {
    return (
      <div className="net-stat-container">
        <div className="net-stat-header">
          <h3>
            <span className="material-symbols-outlined">radar</span>
            Activity Statistics
          </h3>
          <div className="net-stat-period-selector">
            <ModernRadioButton
              options={timePeriodOptions}
              value={timePeriod}
              onChange={setTimePeriod}
              name="time-period"
            />
          </div>
        </div>
        <div className="net-stat-empty">No activity data available</div>
      </div>
    )
  }
  
  // Show content even if transitioning or if we have previous data
  if (displayData.length === 0 && !isTransitioning && !loading) {
    return (
      <div className="net-stat-container">
        <div className="net-stat-header">
          <h3>
            <span className="material-symbols-outlined">radar</span>
            Activity Statistics
          </h3>
          <div className="net-stat-period-selector">
            <ModernRadioButton
              options={timePeriodOptions}
              value={timePeriod}
              onChange={setTimePeriod}
              name="time-period"
            />
          </div>
        </div>
        <div className="net-stat-empty">No activity data available</div>
      </div>
    )
  }

  return (
    <div className="net-stat-container">
      <div className="net-stat-header">
        <h3>
          <span className="material-symbols-outlined">radar</span>
          Activity Statistics
        </h3>
        <div className="net-stat-period-selector">
          <ModernRadioButton
            options={timePeriodOptions}
            value={timePeriod}
            onChange={setTimePeriod}
            name="time-period"
          />
        </div>
      </div>
      
      <div className={`net-stat-content ${isTransitioning ? 'transitioning' : ''}`}>
        <div className="radar-chart-container">
          <svg width={chartSize} height={chartSize} viewBox={`0 0 ${chartSize} ${chartSize}`} className="radar-chart">
            {/* Grid circles */}
            {getGridCircles()}
            
            {/* Grid lines (spokes) */}
            {getGridLines()}
            
            {/* Previous data polygon (fading out) */}
            {isTransitioning && prevNormalizedData.length > 0 && (
              <polygon
                points={getDataPoints(prevNormalizedData)}
                fill="rgba(102, 126, 234, 0.15)"
                stroke="rgba(102, 126, 234, 0.4)"
                strokeWidth="2"
                className="radar-polygon radar-polygon-fade-out"
              />
            )}
            
            {/* Current data polygon */}
            {displayData.length > 0 && (
              <polygon
                points={getDataPoints()}
                fill="rgba(102, 126, 234, 0.3)"
                stroke="rgba(102, 126, 234, 0.8)"
                strokeWidth="2"
                className={`radar-polygon ${isTransitioning ? 'radar-polygon-fade-in' : ''}`}
              />
            )}
            
            {/* Data points */}
            {displayData.map((item, index) => {
              const dataAngleStep = (2 * Math.PI) / (displayData.length || 6)
              const angle = (index * dataAngleStep) - (Math.PI / 2)
              const distance = (item.value / 5) * radius
              const point = getPoint(angle, distance)
              
              return (
                <circle
                  key={`${item.activity}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill="rgba(102, 126, 234, 1)"
                  stroke="white"
                  strokeWidth="2"
                  className="radar-point"
                />
              )
            })}
            
            {/* Labels */}
            {getLabels()}
            
            {/* Value labels */}
            {getValueLabels()}
          </svg>
        </div>
        
        {/* Legend */}
        <div className={`net-stat-legend ${isTransitioning ? 'legend-transitioning' : ''}`}>
          {displayData.map((item, index) => (
            <div key={`${item.activity}-${index}`} className="legend-item">
              <div className="legend-color" style={{ backgroundColor: 'rgba(102, 126, 234, 0.8)' }}></div>
              <div className="legend-content">
                <span className="legend-label">{item.label}</span>
                <span className="legend-separator">•</span>
                <span className="legend-time">{formatTime(item.totalSeconds)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default NetStat

