#!/usr/bin/env python3
"""把選好的版本壓縮進 assets/clips，並登記到 game.js 的 CLIPS。
用法：python3 production/install.py <name> <a|b> [秒數上限]
"""
import os, re, subprocess, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
name, ver = sys.argv[1], sys.argv[2]
src = f'{root}/production/raw/{name}_{ver}.mp4'
dst = f'{root}/assets/clips/{name}.mp4'
cmd = ['ffmpeg', '-v', 'error', '-y', '-i', src]
if len(sys.argv) > 3: cmd += ['-t', sys.argv[3]]
cmd += ['-c:v', 'libx264', '-crf', '27', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-ac', '2', '-movflags', '+faststart', dst]
subprocess.run(cmd, check=True)
g = f'{root}/game.js'; s = open(g, encoding='utf-8').read()
m = re.search(r"const CLIPS = \[(.*?)\];", s)
names = sorted(set(re.findall(r"'([^']+)'", m.group(1))) | {name})
s = s[:m.start()] + 'const CLIPS = [' + ','.join(f"'{n}'" for n in names) + '];' + s[m.end():]
open(g, 'w', encoding='utf-8').write(s)
print(f'{name} ← {ver}: {os.path.getsize(dst) // 1024} KB, {len(names)} clips registered')
