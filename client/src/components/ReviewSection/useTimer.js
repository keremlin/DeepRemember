import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../security/AuthContext';
import { getApiUrl } from '../../config/api';

/**
 * Custom hook for managing review timer
 * Handles starting, pausing, resuming, and saving timer sessions
 */
export const useTimer = () => {
  const { authenticatedFetch } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [todayTotalSeconds, setTodayTotalSeconds] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const pausedTimeRef = useRef(0);
  const isSavingRef = useRef(false);

  // Format seconds to HH:MM:SS
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Format seconds to readable format (e.g., "1h 30m" or "45m")
  const formatTimeReadable = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    } else if (mins > 0) {
      return `${mins}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // Fetch today's total time
  const fetchTodayTotal = useCallback(async () => {
    try {
      const response = await authenticatedFetch(getApiUrl('/api/timer/today-total'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTodayTotalSeconds(data.totalSeconds || 0);
        }
      }
    } catch (error) {
      console.error('[TIMER] Error fetching today total:', error);
    }
  }, [authenticatedFetch]);

  // Check for active session on mount only (once)
  const hasCheckedActiveSession = useRef(false);
  useEffect(() => {
    if (hasCheckedActiveSession.current) return;
    hasCheckedActiveSession.current = true; // Mark immediately to prevent race conditions
    
    const checkActiveSession = async () => {
      try {
        const response = await authenticatedFetch(getApiUrl('/api/timer/active'), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.session) {
            // End any existing active session (user left page, should restart fresh)
            const activeSession = data.session;
            try {
              const now = Date.now();
              const sessionStart = new Date(activeSession.start_datetime).getTime();
              const elapsed = Math.floor((now - sessionStart) / 1000);
              await authenticatedFetch(getApiUrl('/api/timer/pause'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sessionId: activeSession.id,
                  lengthSeconds: elapsed,
                }),
              });
            } catch (error) {
              // Ignore errors
            }
            // Don't reset state here - let the user start fresh manually
            // The active session was already ended above, so just mark as checked
          }
        }
        await fetchTodayTotal();
      } catch (error) {
        console.error('Error checking active session:', error);
        await fetchTodayTotal();
      }
    };

    checkActiveSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Periodically update today's total (every 30 seconds)
  useEffect(() => {
    fetchTodayTotal();
    const interval = setInterval(() => {
      fetchTodayTotal();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchTodayTotal]);

  // Update timer display
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only start interval if running and not paused and we have a start time
    if (isRunning && !isPaused && startTimeRef.current) {
      // Set initial elapsed time immediately
      const updateElapsed = () => {
        if (startTimeRef.current) {
          const now = Date.now();
          const elapsed = Math.floor((now - startTimeRef.current) / 1000) + pausedTimeRef.current;
          setElapsedSeconds(Math.max(0, elapsed));
        }
      };
      
      // Update immediately
      updateElapsed();
      
      // Start interval to update every second
      intervalRef.current = setInterval(() => {
        updateElapsed();
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, isPaused, sessionId]);

  // Start timer
  const startTimer = useCallback(async () => {
    try {
      // Clear interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // End existing session if any (use refs to avoid dependency issues)
      const currentSessionId = sessionId;
      const currentIsRunning = isRunning;
      const currentIsPaused = isPaused;
      
      if (currentSessionId && (currentIsRunning || currentIsPaused)) {
        try {
          let finalElapsed = elapsedSeconds;
          if (startTimeRef.current) {
            const now = Date.now();
            finalElapsed = Math.floor((now - startTimeRef.current) / 1000) + pausedTimeRef.current;
          }
          await authenticatedFetch(getApiUrl('/api/timer/pause'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: currentSessionId, lengthSeconds: finalElapsed }),
          });
        } catch (error) {
          // Ignore
        }
      }

      const response = await authenticatedFetch(getApiUrl('/api/timer/start'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const session = data.session;
          const startTime = new Date(session.start_datetime).getTime();
          
          // Reset everything for fresh start - set refs first, then state
          startTimeRef.current = startTime;
          pausedTimeRef.current = 0;
          setElapsedSeconds(0);
          setSessionId(session.id);
          setIsPaused(false);
          setIsRunning(true);
          await fetchTodayTotal();
        }
      }
    } catch (error) {
      console.error('[TIMER] Error starting timer:', error);
    }
  }, [authenticatedFetch, fetchTodayTotal]);

  // Pause timer
  const pauseTimer = useCallback(async () => {
    if (!isRunning || isPaused || !sessionId) {
      return;
    }

    try {
      // Calculate elapsed time
      let finalElapsed = elapsedSeconds;
      if (startTimeRef.current) {
        const now = Date.now();
        finalElapsed = Math.floor((now - startTimeRef.current) / 1000) + pausedTimeRef.current;
      }
      
      // Update UI immediately
      setIsPaused(true);
      setIsRunning(false);
      
      // Save to database
      const response = await authenticatedFetch(getApiUrl('/api/timer/pause'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, lengthSeconds: finalElapsed }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          await fetchTodayTotal();
        } else {
          // Revert on failure
          setIsPaused(false);
          setIsRunning(true);
        }
      } else {
        // Revert on failure
        setIsPaused(false);
        setIsRunning(true);
      }
    } catch (error) {
      console.error('[TIMER] Error pausing timer:', error);
      setIsPaused(false);
      setIsRunning(true);
    }
  }, [isRunning, isPaused, sessionId, elapsedSeconds, authenticatedFetch, fetchTodayTotal]);

  // Resume timer (starts fresh from 0)
  const resumeTimer = useCallback(async () => {
    if (!isPaused) return;

    try {
      // Clear interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      const response = await authenticatedFetch(getApiUrl('/api/timer/resume'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const session = data.session;
          const startTime = new Date(session.start_datetime).getTime();
          
          // Start fresh from 0
          setSessionId(session.id);
          startTimeRef.current = startTime;
          setElapsedSeconds(0);
          pausedTimeRef.current = 0;
          setIsPaused(false);
          setIsRunning(true);
          await fetchTodayTotal();
        }
      }
    } catch (error) {
      console.error('Error resuming timer:', error);
    }
  }, [isPaused, authenticatedFetch, fetchTodayTotal]);

  // Save current session (used for page close cleanup)
  const saveCurrentSession = useCallback(async () => {
    if (isSavingRef.current) return;
    if (!isRunning || isPaused || !sessionId) return;

    isSavingRef.current = true;

    try {
      let finalElapsed = elapsedSeconds;
      if (startTimeRef.current) {
        const now = Date.now();
        finalElapsed = Math.floor((now - startTimeRef.current) / 1000) + pausedTimeRef.current;
      }

      const token = localStorage.getItem('access_token');
      await fetch(getApiUrl('/api/timer/pause'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId, lengthSeconds: finalElapsed }),
        keepalive: true,
      });
    } catch (error) {
      console.error('[TIMER] Error saving session on page close:', error);
    } finally {
      isSavingRef.current = false;
    }
  }, [isRunning, isPaused, sessionId, elapsedSeconds]);

  // End timer
  const endTimer = useCallback(async () => {
    try {
      let finalElapsed = elapsedSeconds;
      if (startTimeRef.current) {
        const now = Date.now();
        finalElapsed = Math.floor((now - startTimeRef.current) / 1000) + pausedTimeRef.current;
      }
      
      const response = await authenticatedFetch(getApiUrl('/api/timer/end'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, lengthSeconds: finalElapsed }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setIsRunning(false);
          setIsPaused(false);
          setSessionId(null);
          setElapsedSeconds(0);
          pausedTimeRef.current = 0;
          startTimeRef.current = null;
          await fetchTodayTotal();
        }
      }
    } catch (error) {
      console.error('Error ending timer:', error);
      setIsRunning(false);
      setIsPaused(false);
      setSessionId(null);
      setElapsedSeconds(0);
      pausedTimeRef.current = 0;
      startTimeRef.current = null;
    }
  }, [sessionId, elapsedSeconds, authenticatedFetch, fetchTodayTotal]);

  // Handle page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isRunning && !isPaused && sessionId) {
        pauseTimer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isRunning, isPaused, sessionId, pauseTimer]);

  // Handle page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isRunning && !isPaused && sessionId) {
        saveCurrentSession();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRunning, isPaused, sessionId, saveCurrentSession]);

  return {
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
    fetchTodayTotal,
  };
};
