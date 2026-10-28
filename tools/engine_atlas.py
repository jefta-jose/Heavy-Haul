"""Build RPM-indexed grain atlases from the project's licensed diesel recordings.

Run with the same Python dependencies as prepare-audio.py. RPM and load are acoustic
estimates, not measured dyno telemetry. Source hashes and exact cut positions are retained.
Each class uses one running-engine recording, avoiding crossfades between different trucks.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import wave
import numpy as np
from scipy.signal import butter, sosfiltfilt, resample_poly, find_peaks
import imageio_ffmpeg

BASE = Path(__file__).resolve().parents[1] / 'assets/audio'
SR = 22050


def build_atlases(bank, recipe, sources):
    for cls, engine in recipe['engines'].items():
        spec = engine.get('atlas')
        if not spec:
            continue
        sid = spec['source']
        src = sources[sid]
        path = BASE / src['file']
        assert hashlib.sha256(path.read_bytes()).hexdigest() == src['sha256']
        raw = subprocess.check_output([imageio_ffmpeg.get_ffmpeg_exe(), '-v', 'error', '-i', str(path), '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'])
        x = np.frombuffer(raw, dtype='<f4').astype(float)
        x = sosfiltfilt(butter(2, 35, 'highpass', fs=SR, output='sos'), x)
        if spec.get('lowpass'):
            x = sosfiltfilt(butter(2, spec['lowpass'], 'lowpass', fs=SR, output='sos'), x)
        low = resample_poly(x, 80, 441)  # 4000 Hz, analysis only
        window = np.hanning(1600)
        freq = np.fft.rfftfreq(8192, 1 / 4000)
        candidates = []
        for t in np.arange(0.3, len(x) / SR - 0.6, 0.18):
            a = round((t - 0.2) * 4000)
            z = low[a:a + 1600]
            if len(z) != 1600:
                continue
            p = abs(np.fft.rfft(z * window, 8192)) ** 2
            # Track a strong combustion-band harmonic, supported by its harmonics.
            peaks, _ = find_peaks(p)
            peaks = peaks[(freq[peaks] >= 30) & (freq[peaks] <= 160)]
            if not len(peaks):
                continue
            scores = []
            for k in peaks:
                f = freq[k]
                scores.append(sum(np.interp(f * h, freq, p) / h for h in range(1, 5)))
            k = peaks[int(np.argmax(scores))]
            # Parabolic peak interpolation reduces pitch error from FFT-bin rounding.
            lp = np.log(np.maximum(p[k-1:k+2], 1e-20))
            correction = 0.5 * (lp[0]-lp[2]) / (lp[0]-2*lp[1]+lp[2])
            hz = freq[k] + float(np.clip(correction, -0.5, 0.5)) * (freq[1]-freq[0])
            rpm = hz * 120 / spec['cylinders']
            if not 550 <= rpm <= 3000:
                continue
            rms = float(np.sqrt(np.mean(z * z)))
            # Exclude loud impacts and ramps with large within-grain changes.
            env = np.sqrt(np.mean(z.reshape(4, -1) ** 2, axis=1))
            stability = float(np.std(env) / max(1e-8, np.mean(env)))
            tonal = float(sum(np.interp(hz * h, freq, p) for h in range(1, 5)) / max(1e-12, np.sum(p)))
            if stability > spec.get('maxStability', 0.3) or tonal < 0.025:
                continue
            # Reject material whose tone is already sweeping within a grain.
            local_hz = []
            for half in [z[:800], z[800:]]:
                power = abs(np.fft.rfft(half * np.hanning(800), 8192)) ** 2
                near = np.flatnonzero((freq >= hz * 0.88) & (freq <= hz * 1.12))
                local_hz.append(freq[near[np.argmax(power[near])]])
            if abs(local_hz[0] - local_hz[1]) / hz > 0.06:
                continue
            candidates.append({'time': float(t), 'rpm': float(rpm), 'rms': rms, 'stability': stability, 'tonal': tonal, 'hz': hz})
        if len(candidates) < 12:
            raise ValueError(f'{cls}: insufficient usable engine grains')
        threshold = np.percentile([c['rms'] for c in candidates], 25) * 0.6
        candidates = [c for c in candidates if c['rms'] >= threshold]
        selected = []
        # Select multiple low-/high-energy examples near every RPM band. Loudness is
        # a load proxy only; recordings with real on/off-load tags can replace this.
        for target in [700, 1000, 1300, 1650, 2050, 2500]:
            pool = sorted(candidates, key=lambda c: abs(np.log(c['rpm'] / target)) + c['stability'] * 0.12)[:max(16, len(candidates) // 12)]
            pool.sort(key=lambda c: c['rms'])
            for loaded, group in [(0, pool[:max(6, len(pool)//3)]), (1, list(reversed(pool[-max(6, len(pool)//3):])) )]:
                count = 0
                for c in group:
                    if any(abs(c['time'] - q['time']) < 0.12 for q in selected):
                        continue
                    selected.append({**c, 'load': loaded})
                    count += 1
                    if count == 6:
                        break
        frames, chunks, cursor = [], [], 0
        for c in selected:
            # Start on a positive combustion-band peak, reducing phase discontinuities.
            # The measured FFT is centered at time, not at the start of the cut.
            a = round((c['time'] - 0.2) * SR)
            period = SR / c['hz']
            band = sosfiltfilt(butter(2, [max(20,c['hz']*.8), c['hz']*1.2], 'bandpass', fs=SR, output='sos'), x[max(0,a-1024):a+4096])
            local = 1024 if a >= 1024 else a
            a += int(np.argmax(band[local:local+max(2,round(period))]))
            length = round(SR * 0.38)
            y = x[a:a + length].copy()
            gain = min(0.14 / max(c['rms'], 1e-8), 0.85 / max(float(np.max(abs(y))), 1e-8))
            y *= gain
            chunks.append(y)
            frames.append({'offset': round(cursor / SR, 7), 'seconds': len(y)/SR, 'rpm': round(c['rpm'], 2), 'load': c['load'], 'sourceTime': round(a/SR, 5), 'confidence': round(c['tonal'], 4)})
            cursor += len(y)
        samples = np.concatenate(chunks)
        name = f'engine-{cls}-atlas'
        path = BASE / 'bank' / (name + '.wav')
        with wave.open(str(path), 'wb') as out:
            out.setnchannels(1); out.setsampwidth(2); out.setframerate(SR)
            out.writeframes((np.clip(samples, -1, 1) * 32767).astype('<i2').tobytes())
        bank['clips'][name] = {'file': 'bank/' + path.name, 'seconds': len(samples)/SR, 'kind': 'atlas', 'sources': [sid]}
        bank['engines'][cls]['atlas'] = {'clip': name, 'cylinders': spec['cylinders'], 'frames': frames, 'rpmCalibration': 'estimated from dominant combustion-band harmonics; not measured RPM', 'loadCalibration': 'relative recording energy at similar RPM; not measured torque'}
        bank['engines'][cls]['name'] = engine['name']
        for key in ('grainCycles', 'cutoff', 'crossfade', 'leveling'):
            if key in spec:
                bank['engines'][cls]['atlas'][key] = spec[key]
        print(f'{cls}: {len(frames)} grains, estimated {min(c["rpm"] for c in frames):.0f}-{max(c["rpm"] for c in frames):.0f} RPM, {path.stat().st_size/1e6:.2f} MB')
    return bank


if __name__ == '__main__':
    recipe = json.loads((BASE/'sounds.json').read_text())
    sources = {s['id']: s for s in json.loads((BASE/'sources.json').read_text())['sources']}
    bank = build_atlases(json.loads((BASE/'bank/bank.json').read_text()), recipe, sources)
    (BASE/'bank/bank.json').write_text(json.dumps(bank, indent=2)+'\n')
