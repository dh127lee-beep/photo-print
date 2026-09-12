#!/bin/sh
# 배포 전 캐시 버전 올리기. 파일 이름 뒤 ?v= 숫자를 전부 1 올립니다.
# 사용법: sh bump.sh
set -e
cd "$(dirname "$0")"
now=$(sed -n 's/.*app\.mjs?v=\([0-9]*\).*/\1/p' index.html | head -1)
[ -n "$now" ] || { echo "index.html에서 버전을 찾지 못했습니다."; exit 1; }
next=$((now + 1))
for file in index.html app.mjs renderer.mjs; do
  sed -i.bak "s/?v=$now/?v=$next/g" "$file" && rm -f "$file.bak"
done
echo "캐시 버전 $now → $next"
grep -o "[a-z.]*?v=$next" index.html app.mjs renderer.mjs
