"""Prepare the licensed recordings. Run with uv --with numpy --with scipy --with imageio-ffmpeg.
No synthesis: trim field recordings, remove subsonic/harsh noise and crossfade loop boundaries.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import wave
import numpy as np
from scipy.signal import butter, sosfiltfilt
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'assets/audio'
SR = 24000
FF = imageio_ffmpeg.get_ffmpeg_exe()
REGIONS = {
    'scout-v8': (8, 12.5, 2, 6.5, 'scout-v8', 0.05, 1.2),
    'mesa-cummins': (12, 16.5, 4, 8.5, 'mesa-cummins', 1.4, 3.1),
    'fuel-delivery': (12, 16.5, 4, 8.5, 'fuel-delivery', 0, 1.2),
    'wrecker-diesel': (4, 8.5, 22, 26.5, 'mesa-cummins', 1.4, 3.1),
    'ice-semi': (8, 12.5, 34, 38.5, 'mesa-cummins', 1.4, 3.1),
    'mountain-construction': (1, 5.5, 19, 23.5, 'mesa-cummins', 1.4, 3.1),
}

def main():
    sources = {r['id']: r for r in json.loads((BASE / 'sources.json').read_text())['sources']}
    decoded = {}
    for key, source in sources.items():
        path = BASE / source['file']
        assert hashlib.sha256(path.read_bytes()).hexdigest() == source['sha256']
        raw = subprocess.check_output([FF, '-v', 'error', '-i', str(path), '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'])
        x = np.frombuffer(raw, dtype='<f4').copy()
        x = sosfiltfilt(butter(2, 38, 'highpass', fs=SR, output='sos'), x)
        decoded[key] = sosfiltfilt(butter(2, 4800, 'lowpass', fs=SR, output='sos'), x)
    clips = {}
    (BASE / 'clips').mkdir(exist_ok=True)
    for key, (a, b, c, d, start_source, start_a, start_b) in REGIONS.items():
        for role, origin, lo, hi in [('idle', key, a, b), ('drive', key, c, d), ('start', start_source, start_a, start_b)]:
            x = decoded[origin][round(lo * SR):round(hi * SR)].copy()
            if role != 'start':
                # Linear overlap preserves correlated engine level; the endpoint joins the next
                # source sample exactly before fading back into the beginning of the recording.
                n = round(0.16 * SR)
                weight = np.linspace(0, 1, n)
                x[:n] = x[-n:] * (1 - weight) + x[:n] * weight
                x = x[:-n]
            else:
                n = round(0.018 * SR)
                x[:n] *= np.linspace(0, 1, n)
                x[-n:] *= np.linspace(1, 0, n)
            rms = float(np.sqrt(np.mean(x * x)))
            target = {'idle': 0.14, 'drive': 0.19, 'start': 0.17}[role]
            x *= min(target / max(rms, 1e-8), 0.7 / max(float(np.max(np.abs(x))), 1e-8))
            name = f'{key}-{role}'
            file = f'clips/{name}.wav'
            with wave.open(str(BASE / file), 'wb') as out:
                out.setnchannels(1); out.setsampwidth(2); out.setframerate(SR)
                out.writeframes(np.round(x * 32767).astype('<i2').tobytes())
            clips[name] = dict(file=file, source=origin, regionSeconds=[lo, hi], loop=role != 'start',
                               duration=round(len(x) / SR, 4), rms=round(float(np.sqrt(np.mean(x * x))), 4),
                               peak=round(float(np.max(np.abs(x))), 4))
    (BASE / 'audio.json').write_text(json.dumps({'clips': clips}, indent=2) + '\n')
    print(f'Prepared {len(clips)} recorded clips; {sum((BASE / c["file"]).stat().st_size for c in clips.values()) / 1e6:.2f} MB PCM WAV.')

if __name__ == '__main__':
    main()
