#!/bin/zsh
cd /Users/hermes/Public/0720/pachinko-modern/production
# print next pending job: name sec refs ; then prompt JS
done_names=$(cut -f1 progress.tsv)
awk -F'\t' 'NR>1{print $2"\t"$3"\t"$4"\t"$5"\t"$6}' jobs.tsv | while IFS=$'\t' read n s a b c; do
  echo "$done_names" | grep -qx "$n" && continue
  echo "NEXT $n sec=$s refs=$a $b $c"; python3 pjc.py $n; break
done
