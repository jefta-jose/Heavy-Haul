"""Build the game's sound bank from the licensed recordings. No synthesis: everything is cut from
the CC0 / CC BY field recordings listed in assets/audio/sources.json.

    uv run --with numpy --with scipy --with imageio-ffmpeg python tools/prepare-audio.py

The masters live outside the repo (HAUL_AUDIO_MASTERS, default ~/heavy-haul-archive/audio-masters); one
that is missing is fetched from its `download` URL, and every file must match its SHA-256.

Reads the recipe assets/audio/sounds.json and writes assets/audio/bank/*.mp3 plus bank.json:
- engines: per truck class, recorded layers at their measured revs (idle, part-throttle `on` anchors, hard-working
  `pull` anchors, coast and an optional sub rumble) plus start and stop clips. A layer's `hz` is the firing frequency measured in the
  recording, so its true rpm is hz * 120 / cylinders and the game can pitch it to any revs in tune.
  `flatten` follows that frequency through a rev sweep and resamples it to one steady pitch, so a real
  pull-away becomes a layer that stays where the game puts it instead of revving by itself.
- effects: `clip` (one cut), `loop` (joined steady regions), `texture` (a smooth bed made offline from
  many short overlapping grains of a rhythmic recording, so footsteps become an even wade or squelch)
  and `oneshots` (the loudest separate events, each cut with fades).
"""
from pathlib import Path
import argparse
import hashlib
import io
import json
import os
import subprocess
import tempfile
import urllib.request
import wave
import zipfile
import numpy as np
from scipy.signal import butter, sosfilt, sosfiltfilt, resample_poly, medfilt
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'assets/audio'
OUT = BASE / 'bank'
MASTERS = Path(os.environ.get('HAUL_AUDIO_MASTERS', Path.home() / 'heavy-haul-archive/audio-masters'))
SR = 44100
FF = imageio_ffmpeg.get_ffmpeg_exe()
RNG = np.random.default_rng(7)
# loudness targets (weighted RMS, see loudness()): the game sets the mix, so every layer starts level
LEVEL = {'engine': 0.10, 'sub': 0.05, 'loop': 0.12, 'texture': 0.12}

_decoded = {}


def master(src):
    """A master's path, downloaded first if it is not on this machine, checked against its hash."""
    path = MASTERS / Path(src['file']).name
    if not path.exists():
        MASTERS.mkdir(parents=True, exist_ok=True)
        print(f'fetching {src["id"]} from {src["download"]}')
        req = urllib.request.Request(src['download'], headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=300) as r:
            raw = r.read()
        if src.get('archiveMember'):
            assert hashlib.sha256(raw).hexdigest() == src['archiveSha256'], 'source archive hash mismatch'
            with zipfile.ZipFile(io.BytesIO(raw)) as archive:
                raw = archive.read(src['archiveMember'])
        assert hashlib.sha256(raw).hexdigest() == src['sha256'], 'downloaded source hash mismatch'
        path.write_bytes(raw)
    assert hashlib.sha256(path.read_bytes()).hexdigest() == src['sha256'], f'{path} does not match sources.json'
    return path


def decode(sid, sources):
    if sid not in _decoded:
        raw = subprocess.check_output([FF, '-v', 'error', '-i', str(master(sources[sid])), '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'])
        x = np.frombuffer(raw, dtype='<f4').astype(np.float64)
        _decoded[sid] = sosfiltfilt(butter(2, 28, 'highpass', fs=SR, output='sos'), x)
    return _decoded[sid]


def filt(x, spec):
    if spec.get('highpass'):
        x = sosfiltfilt(butter(2, spec['highpass'], 'highpass', fs=SR, output='sos'), x)
    if spec.get('lowpass'):
        x = sosfiltfilt(butter(2, spec['lowpass'], 'lowpass', fs=SR, output='sos'), x)
    if spec.get('band'):
        x = sosfiltfilt(butter(2, spec['band'], 'bandpass', fs=SR, output='sos'), x)
    if spec.get('lowShelf'):
        # add body to a thin recording: its own lows mixed back in, louder
        hz, db = spec['lowShelf']
        x = x + (10 ** (db / 20) - 1) * sosfiltfilt(butter(2, hz, 'lowpass', fs=SR, output='sos'), x)
    return x


def cut(x, lo, hi):
    return x[round(lo * SR):round(hi * SR)].copy()


def rms(x):
    return float(np.sqrt(np.mean(x * x)) + 1e-9)


def loudness(x):
    """RMS as the ear weighs it (roughly K-weighting): the sub-bass that fills up a recording counts
    for little, so a boomy cab recording and a bright exterior one come out equally loud."""
    y = sosfilt(butter(2, 80, 'highpass', fs=SR, output='sos'), x)
    return rms(y + 0.6 * sosfilt(butter(1, 1500, 'highpass', fs=SR, output='sos'), y))


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


def track_pitch(x, lo, hi):
    """The firing frequency over time: harmonic sum on a grid, joined by dynamic programming so one
    loud rattle or an octave error cannot throw the track. Returns (frame times, hz)."""
    down = 8
    y = sosfiltfilt(butter(4, 1200, 'lowpass', fs=SR, output='sos'), x)[::down]
    sr = SR / down
    win, hop = round(0.5 * sr), round(0.05 * sr)
    grid = np.arange(lo, hi + 0.25, 0.25)
    freqs = np.fft.rfftfreq(16384, 1 / sr)
    frames = range(0, max(1, len(y) - win), hop)
    score = np.zeros((len(frames), len(grid)))
    w = np.hanning(win)
    for k, s in enumerate(frames):
        z = y[s:s + win]
        p = np.abs(np.fft.rfft(z * w[:len(z)], 16384)) ** 2
        score[k] = sum(np.interp(grid * h, freqs, p) / h for h in range(1, 7))
        score[k] /= score[k].max() + 1e-12
    # best path, penalising jumps (firing frequency cannot leap between 50 ms frames)
    jump = np.abs(grid[:, None] - grid[None, :]) * 0.12
    best = score[0].copy()
    back = np.zeros(score.shape, dtype=int)
    for k in range(1, len(score)):
        cand = best[None, :] - jump
        back[k] = np.argmax(cand, axis=1)
        best = score[k] + cand[np.arange(len(grid)), back[k]]
    path = np.zeros(len(score), dtype=int)
    path[-1] = int(np.argmax(best))
    for k in range(len(score) - 1, 0, -1):
        path[k - 1] = back[k, path[k]]
    hz = medfilt(grid[path], 9 if len(path) > 9 else 1)
    return (np.array(list(frames)) + win / 2) / sr, hz


def flatten(x, target, lo, hi):
    """Resample a rev sweep to one steady firing frequency."""
    times, hz = track_pitch(x, lo, hi)
    t = np.arange(len(x)) / SR
    ratio = np.interp(t, times, hz) / target
    pos = np.cumsum(1 / np.maximum(ratio, 0.2)) / SR   # output time for each input sample
    out_t = np.arange(0, pos[-1], 1 / SR)
    return np.interp(out_t, pos, x), float(np.median(hz)), float(hz.min()), float(hz.max())


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


def to_level(x, target, peak=0.89):
    """Reach the loudness target; a soft limiter rounds any peak that would clip instead of the whole
    clip being turned down, so a clip with one rattle in it is not quieter than its neighbours."""
    y = x * target / loudness(x)
    return np.where(np.abs(y) > 0.6, np.sign(y) * (0.6 + (peak - 0.6) * np.tanh((np.abs(y) - 0.6) / (peak - 0.6))), y)


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


def engine_layer(cls, role, spec, cylinders, pitch, clips, sources):
    """One steady recorded layer of an engine, with the revs it was recorded at."""
    x = decode(spec['source'], sources)
    parts, hz = [], spec.get('hz')
    for a, b in spec['regions']:
        y = filt(cut(x, a, b), spec)
        if spec.get('flatten'):
            # search around the wanted frequency so the track locks on to the firing order
            y, med, lo, hi = flatten(y, hz, *spec['flatten'])
            print(f'  {cls}.{role} {a}-{b}: firing {lo:.0f}-{hi:.0f} Hz (median {med:.0f}), flattened to {hz}')
        parts.append(level(y, spec.get('leveling', 0.65)))
    y = to_level(join(parts, 0.4), LEVEL['sub' if role == 'sub' else 'engine'] * spec.get('gain', 1))
    name = f'engine-{cls}-{role}'
    clips[name] = {**encode(name, y, 128), 'kind': 'loop', 'sources': [spec['source']]}
    # the class's own pitch moves every layer together, keeping their rpm labels true to what plays
    rpm = spec['rpm'] if 'rpm' in spec else hz * 120 / cylinders
    return {'clip': name, 'rpm': round(rpm / pitch)}


def engine_clip(cls, role, spec, idle_level, clips, sources):
    x = cut(decode(spec['source'], sources), *spec['region'])
    x = filt(x, spec)
    if spec.get('pitch'):
        x = resample_poly(x, 100, round(spec['pitch'] * 100))
    x = fades(x, 0.01, 0.25 if role == 'start' else 0.4)
    # match the running level: the start's tail and the stop's head sit at idle loudness
    edge = x[-round(0.8 * SR):-round(0.25 * SR)] if role == 'start' else x[:round(0.6 * SR)]
    y = x * min(idle_level * 1.1 / loudness(edge), 0.89 / max(float(np.max(np.abs(x))), 1e-9))
    name = f'engine-{cls}-{role}'
    clips[name] = {**encode(name, y, 128), 'kind': 'clip', 'sources': [spec['source']]}
    return name


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--effects', nargs='+', help='rebuild only these named effects, preserving other clips')
    args = parser.parse_args()
    sources = {s['id']: s for s in json.loads((BASE / 'sources.json').read_text())['sources']}
    recipe = json.loads((BASE / 'sounds.json').read_text())
    if args.effects:
        unknown = set(args.effects) - recipe['effects'].keys()
        if unknown:
            parser.error(f'unknown effects: {", ".join(sorted(unknown))}')
        previous = json.loads((OUT / 'bank.json').read_text())
        clips, engines, effects = previous['clips'], previous['engines'], previous['effects']
        recipe['engines'] = {}
        recipe['effects'] = {name: recipe['effects'][name] for name in args.effects}
        for name in args.effects:
            for clip in effects.pop(name, []):
                (BASE / clips.pop(clip)['file']).unlink(missing_ok=True)
    else:
        clips, engines, effects = {}, {}, {}
        # nothing stale: the bank is exactly what this recipe builds
        OUT.mkdir(exist_ok=True)
        for old in OUT.iterdir():
            old.unlink()
    for cls, e in recipe['engines'].items():
        print(cls)
        cyl, pitch = e['cylinders'], e.get('pitch', 1)
        layer = lambda role, spec: engine_layer(cls, role, spec, cyl, pitch, clips, sources)
        pack = {k: e[k] for k in ('name', 'idleRpm', 'governedRpm', 'gears', 'shiftS', 'holdS', 'grain', 'fade', 'revUp', 'revDown', 'stall', 'crankS', 'airBrakes', 'cutoff') if k in e}
        pack['pitch'] = pitch
        pack['idle'] = layer('idle', e['idle'])
        pack['on'] = sorted((layer(f'on{i + 1}', spec) for i, spec in enumerate(e['on'])), key=lambda l: l['rpm'])
        if 'pull' in e:
            pack['pull'] = sorted((layer(f'pull{i + 1}', spec) for i, spec in enumerate(e['pull'])), key=lambda l: l['rpm'])
        pack['coast'] = layer('coast', e['coast'])
        if 'sub' in e:
            pack['sub'] = layer('sub', e['sub'])
        pack['start'] = engine_clip(cls, 'start', e['start'], LEVEL['engine'], clips, sources)
        if 'stop' in e:
            pack['stop'] = engine_clip(cls, 'stop', e['stop'], LEVEL['engine'], clips, sources)
        engines[cls] = pack
    for name, spec in recipe['effects'].items():
        x = filt(decode(spec['source'], sources), spec)
        kind = spec['kind']
        if kind == 'clip':
            y = fades(cut(x, *spec['region']), 0.004, spec.get('fadeOut', 0.15))
            peak = max(float(np.max(np.abs(y))), 1e-9)
            ys = [y * min(0.12 / rms(y), 0.9 / peak) if rms(y) * 6 < peak else y * 0.85 / peak]
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
    (OUT / 'bank.json').write_text(json.dumps(bank, indent=2) + '\n')
    size = sum((BASE / c['file']).stat().st_size for c in clips.values())
    print(f'Built {len(clips)} clips ({size / 1e6:.2f} MB MP3) for {len(engines)} engine classes and {len(effects)} effects.')


if __name__ == '__main__':
    main()
