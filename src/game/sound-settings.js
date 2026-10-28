// The sound panel: master, engine and effects volume plus mute, saved by the audio module. Opened
// from the pause menu and the garage.
export function createSoundSettings({ audio, onClose }) {
  const $ = id => document.getElementById(id), ov = $('soundOv'), list = $('volList'), mute = $('muteBtn');
  const rows = [['master', 'Master'], ['engine', 'Engines'], ['effects', 'Effects']];
  function render() {
    list.innerHTML = '';
    for (const [key, label] of rows) {
      const row = document.createElement('label'); row.className = 'vol';
      const name = document.createElement('span'); name.textContent = label;
      const input = document.createElement('input'); input.type = 'range'; input.min = 0; input.max = 100; input.step = 5; input.id = `vol-${key}`;
      input.value = Math.round(audio.volumes[key] * 100);
      const val = document.createElement('b'); val.textContent = `${input.value}%`;
      input.addEventListener('input', () => { audio.setVolume(key, input.value / 100); val.textContent = `${input.value}%`; });
      // a short sound so the effects level can be heard while setting it
      input.addEventListener('change', () => { if (key !== 'engine') audio.clunk(true); });
      row.append(name, input, val); list.append(row);
    }
    mute.textContent = audio.volumes.muted ? 'Unmute' : 'Mute all';
    mute.setAttribute('aria-pressed', String(audio.volumes.muted));
  }
  mute.addEventListener('click', () => { audio.setVolume('muted', !audio.volumes.muted); render(); });
  $('soundDone').addEventListener('click', () => { ov.hidden = true; onClose?.(); });
  return {
    open() { audio.start(); render(); ov.hidden = false; },
    get isOpen() { return !ov.hidden; },
  };
}
