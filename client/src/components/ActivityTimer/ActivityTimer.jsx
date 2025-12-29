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
 */
const ActivityTimer = ({ 
  activity = 'review_card',
  autoStart = false,
  shouldStart = false,
  shouldEnd = false
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

  return (
    <div className="activity-timer-display">
      <div className="activity-timer-info">
        <span className="activity-timer-label">Session:</span>
        <span className="activity-timer-value">{formatTime(elapsedSeconds)}</span>
      </div>
      <div className="activity-timer-info">
        <span className="activity-timer-label">Today:</span>
        <span className="activity-timer-value">{formatTimeReadable(todayTotalSeconds)}</span>
      </div>
      <button
        className="activity-timer-pause-resume-btn"
        onClick={handlePauseResume}
        title={isPaused ? 'Resume timer' : 'Pause timer'}
      >
        <span className="material-symbols-outlined">
          {isPaused ? 'play_arrow' : 'pause'}
        </span>
        {isPaused ? 'Resume' : 'Pause'}
      </button>
    </div>
  );
};

export default ActivityTimer;

