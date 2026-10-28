"""Build the game's sound bank from the licensed recordings. No synthesis: everything is cut from
the CC0 / CC BY field recordings listed in assets/audio/sources.json.

    uv run --with numpy --with scipy --with imageio-ffmpeg python tools/prepare-audio.py

Reads the recipe assets/audio/sounds.json and writes assets/audio/bank/*.mp3 plus bank.json:
- engines: per truck class, a start clip, idle / drive / pull layers (steady regions joined with
  crossfades and levelled, so the game's grain player can play any part of them) and an optional
  shutdown clip. The start clip's tail and the stop clip's head are matched to the idle level so the
  hand-over is smooth.
- effects: `clip` (one cut), `loop` (joined steady regions), `texture` (a smooth bed made offline from
  many short overlapping grains of a rhythmic recording, so footsteps become an even wade or squelch)
  and `oneshots` (the loudest separate events, each cut with fades).
"""
from pathlib import Path
import hashlib
import json
import subprocess
import tempfile
import wave
import numpy as np
from scipy.signal import butter, sosfiltfilt, resample_poly
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'assets/audio'
OUT = BASE / 'bank'
SR = 44100
FF = imageio_ffmpeg.get_ffmpeg_exe()
RNG = np.random.default_rng(7)
LEVEL = {'idle': 0.11, 'drive': 0.15, 'pull': 0.17, 'loop': 0.12, 'texture': 0.12}

_decoded = {}


def decode(sid, sources):
    if sid not in _decoded:
        src = sources[sid]
        path = BASE / src['file']
        assert hashlib.sha256(path.read_bytes()).hexdigest() == src['sha256'], f'{path} does not match sources.json'
        raw = subprocess.check_output([FF, '-v', 'error', '-i', str(path), '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'])
        x = np.frombuffer(raw, dtype='<f4').astype(np.float64)
        _decoded[sid] = sosfiltfilt(butter(2, 32, 'highpass', fs=SR, output='sos'), x)
    return _decoded[sid]


def filt(x, spec):
    if spec.get('highpass'):
        x = sosfiltfilt(butter(2, spec['highpass'], 'highpass', fs=SR, output='sos'), x)
    if spec.get('lowpass'):
        x = sosfiltfilt(butter(2, spec['lowpass'], 'lowpass', fs=SR, output='sos'), x)
    return x


def cut(x, lo, hi):
    return x[round(lo * SR):round(hi * SR)].copy()


def rms(x):
    return float(np.sqrt(np.mean(x * x)) + 1e-9)


def level(x, strength=0.65, win=1.0):
    """Even out slow loudness swings (strength 0..1) so any grain sits at the same level."""
    n = max(1, round(win * SR))
    env = np.sqrt(smooth(x * x, n) + 1e-9)
    env = smooth(env, n)
    return x * (np.median(env) / env) ** strength


def smooth(x, n):
    """Centred moving average of width n (a running sum, so long recordings stay fast)."""
    c = np.concatenate([[0.0], np.cumsum(x)])
    i = np.arange(len(x))
    lo, hi = np.clip(i - n // 2, 0, len(x)), np.clip(i + n // 2 + 1, 0, len(x))
    return (c[hi] - c[lo]) / (hi - lo)


def join(parts, fade=0.5):
    """Join parts with equal-power crossfades, and fold the end over the start so it also loops."""
    f = round(fade * SR)
    out_, in_ = (lambda k: np.cos(np.linspace(0, np.pi / 2, k))), (lambda k: np.sin(np.linspace(0, np.pi / 2, k)))
    y = parts[0]
    for p in parts[1:]:
        k = min(f, len(y) // 3, len(p) // 3)
        y = np.concatenate([y[:-k], y[-k:] * out_(k) + p[:k] * in_(k), p[k:]])
    k = min(f, len(y) // 4)
    head = y[:k] * in_(k) + y[-k:] * out_(k)
    return np.concatenate([head, y[k:-k]])


def fades(x, fin=0.005, fout=0.08):
    a, b = round(fin * SR), round(fout * SR)
    x[:a] *= np.linspace(0, 1, a)
    x[-b:] *= np.linspace(1, 0, b)
    return x


def to_rms(x, target, peak=0.89):
    return x * min(target / rms(x), peak / max(float(np.max(np.abs(x))), 1e-9))


def to_rms_soft(x, target):
    """Reach the target loudness even on peaky material (birds, splashes): a soft limiter rounds the peaks."""
    y = x * target / rms(x)
    return np.tanh(y / 0.8) * 0.8


def texture(x, spec):
    """Overlap-add random Hann-windowed grains into a smooth, even bed."""
    total = round(spec['seconds'] * SR)
    y = np.zeros(total + SR * 2)
    lo, hi = spec['grain']
    count = round(spec['density'] * spec['seconds'])
    spans = [(round(a * SR), round(b * SR)) for a, b in spec['regions']]
    for _ in range(count):
        n = round(RNG.uniform(lo, hi) * SR)
        a, b = spans[RNG.integers(len(spans))]
        s = RNG.integers(a, max(a + 1, b - n))
        g = x[s:s + n] * np.hanning(len(x[s:s + n]))
        # every grain at the same loudness (skip near-silent ones), so the bed is even
        r = rms(g)
        if r < 1e-4:
            continue
        g = g / r * RNG.uniform(0.8, 1.0)
        at = RNG.integers(0, total)
        y[at:at + len(g)] += g
    # wrap the overhang onto the start so the bed loops
    y[:SR * 2] += y[total:total + SR * 2]
    return y[:total]


def oneshots(x, spec):
    """The loudest separate events in the regions, each cut with short fades."""
    hop = round(0.01 * SR)
    env = np.sqrt(smooth(x * x, hop))[::hop]
    mask = np.zeros_like(env, dtype=bool)
    for a, b in spec['regions']:
        mask[round(a * 100):round(b * 100)] = True
    env = np.where(mask, env, 0)
    length, picks = spec['len'], []
    order = np.argsort(env)[::-1]
    for i in order:
        if len(picks) >= spec['count'] or env[i] <= 0:
            break
        if all(abs(i - j) > length * 100 for j in picks):
            picks.append(i)
    outs = []
    for i in sorted(picks):
        lo = max(0, i / 100 - 0.06)
        outs.append(fades(cut(x, lo, lo + length), 0.004, min(0.3, length * 0.35)))
    return outs


def encode(name, x, kbps):
    OUT.mkdir(exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
        pcm = np.round(np.clip(x, -1, 1) * 32767).astype('<i2')
        with wave.open(tmp.name, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
        subprocess.check_call([FF, '-v', 'error', '-y', '-i', tmp.name, '-c:a', 'libmp3lame', '-b:a', f'{kbps}k', str(OUT / f'{name}.mp3')])
    return {'file': f'bank/{name}.mp3', 'seconds': round(len(x) / SR, 3)}


def main():
    sources = {s['id']: s for s in json.loads((BASE / 'sources.json').read_text())['sources']}
    recipe = json.loads((BASE / 'sounds.json').read_text())
    clips, engines, effects = {}, {}, {}
    for cls, e in recipe['engines'].items():
        layers = {}
        for role in ('idle', 'drive', 'pull'):
            if role not in e:
                continue
            spec = e[role]
            x = decode(spec['source'], sources)
            parts = [level(filt(cut(x, a, b), spec)) for a, b in spec['regions']]
            y = to_rms(join(parts), LEVEL[role])
            name = f'engine-{cls}-{role}'
            clips[name] = {**encode(name, y, 112), 'kind': 'loop', 'sources': [spec['source']]}
            layers[role] = name
        idle_rms = LEVEL['idle']
        for role in ('start', 'stop'):
            if role not in e:
                continue
            spec = e[role]
            x = cut(decode(spec['source'], sources), *spec['region'])
            if spec.get('pitch'):
                p = round(spec['pitch'] * 100)
                x = resample_poly(x, 100, p)
            x = fades(x, 0.01, 0.25 if role == 'start' else 0.4)
            # match the running level: the start's tail and the stop's head sit at idle loudness
            edge = x[-round(0.8 * SR):-round(0.25 * SR)] if role == 'start' else x[:round(0.6 * SR)]
            x = x * min(idle_rms * 1.1 / rms(edge), 0.89 / max(float(np.max(np.abs(x))), 1e-9))
            name = f'engine-{cls}-{role}'
            clips[name] = {**encode(name, x, 112), 'kind': 'clip', 'sources': [spec['source']]}
            layers[role] = name
        engines[cls] = {'name': e['name'], 'layers': layers, **{k: e[k] for k in ('crankS', 'pitch', 'cutoff', 'airBrakes')}}
    for name, spec in recipe['effects'].items():
        x = filt(decode(spec['source'], sources), spec)
        kind = spec['kind']
        if kind == 'clip':
            y = fades(cut(x, *spec['region']), 0.004, 0.15)
            ys = [to_rms(y, 0.12, 0.9) if rms(y) * 6 < np.max(np.abs(y)) else y * 0.85 / max(float(np.max(np.abs(y))), 1e-9)]
        elif kind == 'loop':
            ys = [to_rms_soft(join([level(cut(x, a, b)) for a, b in spec['regions']]), LEVEL['loop'])]
        elif kind == 'texture':
            ys = [to_rms_soft(level(texture(x, spec), 0.5, 0.5), LEVEL['texture'])]
        else:
            ys = [y * 0.85 / max(float(np.max(np.abs(y))), 1e-9) for y in oneshots(x, spec)]
        names = []
        for i, y in enumerate(ys):
            n = name if len(ys) == 1 and kind != 'oneshots' else f'{name}-{i + 1}'
            clips[n] = {**encode(n, y, 96), 'kind': 'loop' if kind in ('loop', 'texture') else 'clip', 'sources': [spec['source']]}
            names.append(n)
        effects[name] = names
    bank = {'about': 'Generated by tools/prepare-audio.py from sounds.json; do not edit.', 'clips': clips, 'engines': engines, 'effects': effects}
    from engine_atlas import build_atlases
    bank = build_atlases(bank, recipe, sources)
    (OUT / 'bank.json').write_text(json.dumps(bank, indent=2) + '\n')
    size = sum((BASE / c['file']).stat().st_size for c in clips.values())
    print(f'Built {len(clips)} clips ({size / 1e6:.2f} MB MP3) for {len(engines)} engine classes and {len(effects)} effects.')


if __name__ == '__main__':
    main()
