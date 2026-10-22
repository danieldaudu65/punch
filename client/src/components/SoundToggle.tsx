import { useSyncExternalStore } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { isSoundOn, playSound, setSoundOn, subscribeToSound } from '../lib/sound';

export function useSoundOn() {
  return useSyncExternalStore(subscribeToSound, isSoundOn, isSoundOn);
}

/** Mute button. The choice is remembered on this device. */
export function SoundToggle() {
  const on = useSoundOn();

  function toggle() {
    setSoundOn(!on);
    // A tap confirms sound is now on.
    if (!on) playSound('tap');
  }

  return (
    <button
      type="button"
      className="sound-toggle"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? 'Sound on. Turn sound off' : 'Sound off. Turn sound on'}
      title={on ? 'Sound on' : 'Sound off'}
    >
      {on ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
    </button>
  );
}
