#!/bin/zsh
# 把同一支的 a/b 兩版各抽每秒一格，上下拼成一張，方便挑片。用法：sheet.sh <name> <out.jpg>
n=$1; out=$2; tmp=$(mktemp -d)
for v in a b; do ffmpeg -v error -y -i raw/${n}_$v.mp4 -vf "fps=1.5,scale=200:-1,tile=12x1:padding=2" -frames:v 1 $tmp/$v.jpg; done
ffmpeg -v error -y -i $tmp/a.jpg -i $tmp/b.jpg -filter_complex vstack $out; rm -r $tmp
