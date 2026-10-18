#!/bin/zsh
# usage: fetch.sh <name> <sec> <file1> <file2> ; downloads to raw/<name>_a.mp4 and _b.mp4
cd /Users/hermes/Public/0720/pachinko-modern/production
export RH_BASE=https://rh-hk-images.xiaoyaoyou.com/a653774803b0000f2dc3d6f468b37684/output
n=$1; shift; t=$1; shift
i=0
for f in "$@"; do
  s=(a b); suf=${s[$((i+1))]}; i=$((i+1))
  curl -s -o raw/${n}${SUF}_$suf.mp4 "$RH_BASE/${f%.mp4}.mp4"
  echo "${n}_$suf $(ffprobe -v error -show_entries stream=width,height,r_frame_rate -show_entries format=duration -of csv=p=0 raw/${n}${SUF}_$suf.mp4 | tr '\n' ' ') $(stat -f%z raw/${n}${SUF}_$suf.mp4)"
done
printf "%s\tdone\traw/%s${SUF}_a.mp4,raw/%s${SUF}_b.mp4\t%s\t\n" $n $n $n "$t" >> progress.tsv
