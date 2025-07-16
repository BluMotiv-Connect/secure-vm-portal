import { useState, useEffect, useRef } from 'react'

export const useTimer = (initialTime = 0, autoStart = false) => {
  const [time, setTime] = useState(initialTime)
  const [isRunning, setIsRunning] = useState(autoStart)
  const [startTime, setStartTime] = useState(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTime(prevTime => prevTime + 1)
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning])

  const start = () => {
    if (!isRunning) {
      setIsRunning(true)
      setStartTime(new Date())
    }
  }

  const stop = () => {
    setIsRunning(false)
  }

  const reset = () => {
    setTime(0)
    setIsRunning(false)
    setStartTime(null)
  }

  const pause = () => {
    setIsRunning(false)
  }

  const resume = () => {
    setIsRunning(true)
  }

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getElapsedTime = () => {
    if (startTime) {
      return Math.floor((new Date() - startTime) / 1000)
    }
    return time
  }

  return {
    time,
    isRunning,
    startTime,
    start,
    stop,
    reset,
    pause,
    resume,
    formatTime: () => formatTime(time),
    getElapsedTime,
    hours: Math.floor(time / 3600),
    minutes: Math.floor((time % 3600) / 60),
    seconds: time % 60
  }
}
