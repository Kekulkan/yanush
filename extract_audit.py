# -*- coding: utf-8 -*-
import re
import sys
path = r'g:\Downloads\Telegram Desktop\saved_resource.html'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()
# Find all text nodes (between > and <) with Cyrillic, length 10-600
parts = re.findall(r'>([^<]{10,600})<', c)
seen = set()
for text in parts:
    text = text.strip()
    if not re.search(r'[а-яА-ЯёЁ]', text): continue
    if 'className' in text or 'function' in text: continue
    if 'path' in text and 'stroke' in text: continue
    key = text[:80]
    if key in seen: continue
    seen.add(key)
    if len(text) >= 20:
        print(text[:450])
        print('---')
