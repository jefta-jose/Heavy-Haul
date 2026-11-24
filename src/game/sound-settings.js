// The settings panel, opened from the pause menu and the garage's gear: volumes (saved by the audio module), the reminders
// switch (phone only), the privacy policy, and resetting the saved game. Reset sits behind a second, spelled-out confirmation
// (user, 2026-11-24: two taps on a top-bar button were too easy to hit).
import { PRIVACY_URL } from '../game-config.js';

export function createSoundSettings({ audio, uiAudio, onClose, notify = null, onReset = null }) {
  const $ = id => document.getElementById(id), ov = $('soundOv'), list = $('volList'), mute = $('muteBtn');
  const rows = [['master', 'Master'], ['engine', 'Engine'], ['effects', 'Effects'], ['music', 'Music']];
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
      input.addEventListener('change', () => { if (key === 'master' || key === 'effects') uiAudio.play(); });
      row.append(name, input, val); list.append(row);
    }
    mute.textContent = audio.volumes.muted ? 'Unmute' : 'Mute all';
    mute.setAttribute('aria-pressed', String(audio.volumes.muted));
  }
  mute.addEventListener('click', () => { audio.setVolume('muted', !audio.volumes.muted); render(); });
  $('soundDone').addEventListener('click', () => { ov.hidden = true; onClose?.(); });

  // reminders: shown only where the phone can send them
  const remind = $('remindBtn');
  function renderRemind() {
    $('remindRow').hidden = !notify?.available;
    if (!notify?.available) return;
    const on = notify.enabled;
    remind.textContent = on ? 'On' : 'Off'; remind.classList.toggle('on', on); remind.setAttribute('aria-pressed', String(on));
    $('remindNote').textContent = notify.answer === 'denied' ? 'Blocked in Android settings' : 'A nudge every few days';
  }
  remind.addEventListener('click', async () => { remind.disabled = true; await notify.setEnabled(!notify.enabled); remind.disabled = false; renderRemind(); });
  const privacy = $('privacyLink');
  privacy.href = PRIVACY_URL; privacy.hidden = !PRIVACY_URL;
  // reset: the first tap only shows what will be lost
  const confirmBox = $('resetConfirm');
  $('resetBtn').addEventListener('click', () => { confirmBox.hidden = false; confirmBox.scrollIntoView({ block: 'nearest' }); $('resetCancel').focus({ preventScroll: true }); });
  $('resetCancel').addEventListener('click', () => { confirmBox.hidden = true; });
  $('resetYes').addEventListener('click', () => { confirmBox.hidden = true; onReset?.(); });
  return {
    open() { audio.start(); render(); renderRemind(); confirmBox.hidden = true; ov.hidden = false; },
    get isOpen() { return !ov.hidden; },
  };
}
