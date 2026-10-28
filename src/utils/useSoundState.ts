import { useState, useEffect, useCallback } from 'react'
import { soundEngine } from './soundEngine'

export function useSoundState() {
  const [isMuted, setIsMuted] = useState<boolean>(() => soundEngine.getMuted())

  useEffect(() => {
    const unsubscribe = soundEngine.subscribe((muted) => {
      setIsMuted(muted)
    })
    return unsubscribe
  }, [])

  const toggleSound = useCallback(() => {
    soundEngine.toggleMute()
  }, [])

  const setMuted = useCallback((muted: boolean) => {
    soundEngine.setMuted(muted)
  }, [])

  return { isMuted, toggleSound, setMuted }
}
