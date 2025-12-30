import React, { useEffect, useRef } from 'react';
import { useActivityTimer } from './useActivityTimer';
import './ActivityTimer.css';

/**
 * Reusable ActivityTimer component
 * Displays session time, today's total time, and pause/resume button
 * @param {string} activity - Activity type (e.g., 'review_card', 'reading', 'listening')
 * @param {boolean} autoStart - Whether to automatically start timer when component mounts
 * @param {boolean} shouldStart - External trigger to start timer (e.g., when currentCard appears)
 * @param {boolean} shouldEnd - External trigger to end timer (e.g., when currentCard is null)
 * @param {string} size - Size of the circles: 'small', 'medium', or 'large' (default: 'large')
 */
const ActivityTimer = ({ 
  activity = 'review_card',
  autoStart = false,
  shouldStart = false,
  shouldEnd = false,
  size = 'large'
}) => {
  const {
    isRunning,
    isPaused,
    elapsedSeconds,
    todayTotalSeconds,
    formatTime,
    formatTimeReadable,
    startTimer,
    pauseTimer,
    resumeTimer,
    endTimer,
  } = useActivityTimer(activity);

  const timerStartedRef = useRef(false);
  const isRunningRef = useRef(false);
  const isPausedRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    isRunningRef.current = isRunning;
    isPausedRef.current = isPaused;
  }, [isRunning, isPaused]);

  // Start timer when shouldStart becomes true
  useEffect(() => {
    if (shouldStart && !timerStartedRef.current) {
      if (!isRunning && !isPaused) {
        timerStartedRef.current = true;
        startTimer();
      }
    }
    // Reset flag when shouldStart becomes false
    if (!shouldStart) {
      timerStartedRef.current = false;
      if (isRunning || isPaused) {
        endTimer();
      }
    }
  }, [shouldStart, isRunning, isPaused, startTimer, endTimer]);

  // Auto-start timer on mount if autoStart is true
  useEffect(() => {
    if (autoStart && !timerStartedRef.current && !isRunning && !isPaused) {
      timerStartedRef.current = true;
      startTimer();
    }
  }, [autoStart, isRunning, isPaused, startTimer]);

  // End timer when shouldEnd becomes true
  useEffect(() => {
    if (shouldEnd && isRunningRef.current && !isPausedRef.current) {
      endTimer();
      timerStartedRef.current = false;
    }
  }, [shouldEnd, endTimer]);

  // Cleanup: pause timer when component unmounts
  const pauseTimerRef = useRef(pauseTimer);
  useEffect(() => {
    pauseTimerRef.current = pauseTimer;
  }, [pauseTimer]);

  useEffect(() => {
    return () => {
      if (isRunningRef.current && !isPausedRef.current) {
        pauseTimerRef.current();
      }
    };
  }, []);

  const handlePauseResume = () => {
    if (isPaused) {
      resumeTimer();
    } else if (isRunning) {
      pauseTimer();
    }
  };

  // Convert seconds to minutes for session (total minutes)
  const sessionMinutes = Math.floor(elapsedSeconds / 60);
  
  // Convert today's total seconds to hours and minutes
  const todayHours = Math.floor(todayTotalSeconds / 3600);
  const todayMinutes = Math.floor((todayTotalSeconds % 3600) / 60);

  // Calculate radius based on size
  const getRadius = () => {
    switch (size) {
      case 'small':
        return { inner: 22, outer: 25 };
      case 'medium':
        return { inner: 26.25, outer: 30 };
      case 'large':
      default:
        return { inner: 35, outer: 40 };
    }
  };

  const radius = getRadius();

  return (
    <div className={`activity-timer-display activity-timer-${size}`}>
      <div className="activity-timer-content">
        <div className="activity-timer-circles">
        {/* Session Minutes Circle */}
        <div className="timer-circle-wrapper">
          <div className="timer-current-label">CURRENT</div>
          <div className="timer-circle">
            <div className="timer-circle-progress">
              <svg className="timer-circle-svg" viewBox="0 0 100 100">
                {Array.from({ length: 60 }).map((_, i) => {
                  const angle = (i / 60) * 360 - 90;
                  const progressValue = sessionMinutes % 60;
                  const isActive = i <= progressValue;
                  const angleRad = (angle * Math.PI) / 180;
                  return (
                    <line
                      key={i}
                      x1={50 + radius.inner * Math.cos(angleRad)}
                      y1={50 + radius.inner * Math.sin(angleRad)}
                      x2={50 + radius.outer * Math.cos(angleRad)}
                      y2={50 + radius.outer * Math.sin(angleRad)}
                      stroke={isActive ? '#4a90e2' : '#1e3a5f'}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  );
                })}
              </svg>
            </div>
            <div className="timer-circle-content">
              <div className="timer-circle-value">{sessionMinutes}</div>
              {size !== 'small' && <div className="timer-circle-label">MINUTES</div>}
            </div>
          </div>
          {size === 'small' && <div className="timer-circle-label-below">MINUTES</div>}
        </div>

        {/* Today Hours and Minutes Circles */}
        <div className="timer-today-wrapper">
          <div className="timer-today-label">TODAY</div>
          <div className="timer-today-circles">
            {/* Today Hours Circle */}
            <div className="timer-circle-wrapper timer-circle-middle">
              <div className="timer-circle">
                <div className="timer-circle-progress">
                  <svg className="timer-circle-svg" viewBox="0 0 100 100">
                    {Array.from({ length: 24 }).map((_, i) => {
                      const angle = (i / 24) * 360 - 90;
                      const progressValue = todayHours % 24;
                      const isActive = i <= progressValue;
                      const angleRad = (angle * Math.PI) / 180;
                      return (
                        <line
                          key={i}
                          x1={50 + radius.inner * Math.cos(angleRad)}
                          y1={50 + radius.inner * Math.sin(angleRad)}
                          x2={50 + radius.outer * Math.cos(angleRad)}
                          y2={50 + radius.outer * Math.sin(angleRad)}
                          stroke={isActive ? '#4a90e2' : '#1e3a5f'}
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      );
                    })}
                  </svg>
                </div>
                <div className="timer-circle-content">
                  <div className="timer-circle-value">{todayHours}</div>
                  {size !== 'small' && <div className="timer-circle-label">HOURS</div>}
                </div>
              </div>
              {size === 'small' && <div className="timer-circle-label-below">HOURS</div>}
            </div>

            {/* Today Minutes Circle */}
            <div className="timer-circle-wrapper">
          <div className="timer-circle">
            <div className="timer-circle-progress">
              <svg className="timer-circle-svg" viewBox="0 0 100 100">
                {Array.from({ length: 60 }).map((_, i) => {
                  const angle = (i / 60) * 360 - 90;
                  const progressValue = todayMinutes % 60;
                  const isActive = i <= progressValue;
                  const angleRad = (angle * Math.PI) / 180;
                  return (
                    <line
                      key={i}
                      x1={50 + radius.inner * Math.cos(angleRad)}
                      y1={50 + radius.inner * Math.sin(angleRad)}
                      x2={50 + radius.outer * Math.cos(angleRad)}
                      y2={50 + radius.outer * Math.sin(angleRad)}
                      stroke={isActive ? '#4a90e2' : '#1e3a5f'}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  );
                })}
              </svg>
            </div>
                <div className="timer-circle-content">
                  <div className="timer-circle-value">{todayMinutes}</div>
                  {size !== 'small' && <div className="timer-circle-label">MINUTES</div>}
                </div>
              </div>
              {size === 'small' && <div className="timer-circle-label-below">MINUTES</div>}
            </div>
          </div>
        </div>
      </div>
      <button
          className="activity-timer-control-btn"
          onClick={handlePauseResume}
          title={isPaused ? 'Resume timer' : 'Pause timer'}
        >
          <span className="material-symbols-outlined">
            {isPaused ? 'play_arrow' : 'pause'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default ActivityTimer;

