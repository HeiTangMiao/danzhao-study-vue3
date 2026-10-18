"""打交接包：只含 git 跟踪文件，且正确设置 zip 的 UTF-8 文件名标志。

为什么不用 `git archive --format=zip`：它不设置 UTF-8 flag（bit 11），
中文文件名在其他工具解压时会变成乱码（实测 `D-001_������...`）。
Python 的 zipfile 对非 ASCII 文件名会自动置 0x800 标志位。
"""
import subprocess, pathlib, zipfile, sys

REPO = pathlib.Path('/Users/iras17514/WorkBuddy/danzhao/danzhao-study-vue3')
OUT = pathlib.Path('/Users/iras17514/WorkBuddy/danzhao/danzhao-study-vue3-v0.3.1-交接包-2026-10-19.zip')
PREFIX = 'danzhao-study-vue3/'

if OUT.exists():
    OUT.unlink()

files = [f for f in subprocess.run(
    ['git', 'ls-files', '-z'], capture_output=True, text=True, cwd=REPO
).stdout.split('\0') if f]

# 读成 bytes 再解码：git ls-files -z 输出的是真实路径（不经八进制转义）
raw = subprocess.run(['git', 'ls-files', '-z'], capture_output=True, cwd=REPO).stdout
files = [p.decode('utf-8') for p in raw.split(b'\0') if p]

written = 0
skipped = []
with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
    for rel in files:
        src = REPO / rel
        if not src.is_file():
            skipped.append(rel)
            continue
        zi = zipfile.ZipInfo(PREFIX + rel, date_time=(2026, 10, 19, 0, 52, 0))
        zi.external_attr = 0o644 << 16
        zi.compress_type = zipfile.ZIP_DEFLATED
        with open(src, 'rb') as f:
            zf.writestr(zi, f.read())
        written += 1

print(f'打包完成: {OUT}')
print(f'  写入 {written} 个文件')
if skipped:
    print(f'  跳过 {len(skipped)} 个（不存在）')
print(f'  大小: {OUT.stat().st_size / 1024 / 1024:.1f} MB')

# 验证：中文文件名能否正确还原
with zipfile.ZipFile(OUT) as zf:
    names = zf.namelist()
    cn = [n for n in names if any('\u4e00' <= c <= '\u9fff' for c in n)]
    print(f'  含中文路径条目: {len(cn)} 个')
    for n in cn[:2]:
        print(f'    {n}')
