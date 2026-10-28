// The sound panel: master, engine, effects and ambience volume plus mute, saved by the audio module,
// and the credits for the recordings the game plays. Opened from the pause menu and the garage.
export function createSoundSettings({ audio, credits = [], onClose }) {
  const $ = id => document.getElementById(id), ov = $('soundOv'), list = $('volList'), mute = $('muteBtn');
  const rows = [['master', 'Master'], ['engine', 'Engines'], ['effects', 'Effects'], ['ambience', 'Ambience']];
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
    const box = $('soundCredits'); box.innerHTML = '';
    for (const c of credits) {
      const li = document.createElement('li'), a = document.createElement('a');
      a.href = c.page; a.target = '_blank'; a.rel = 'noopener'; a.textContent = c.title;
      li.append(a, ` by ${c.author} (${c.license === 'CC0-1.0' ? 'CC0' : 'CC BY 4.0'})`); box.append(li);
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
