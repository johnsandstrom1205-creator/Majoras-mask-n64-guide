from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parents[1]
docs = root / "docs"
pages = list(docs.rglob("*.md")) + list(docs.rglob("*.html"))
errors = []

expected = {"Main Quest": 14, "Side Quest": 39, "Mask Quest": 24}
counts = {key: 0 for key in expected}
permalinks = set()

for page in pages:
    if any(part.startswith("_") for part in page.relative_to(docs).parts):
        continue
    text = page.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        errors.append(f"Missing front matter: {page.relative_to(root)}")
        continue
    for category in counts:
        if f'category: "{category}"' in text:
            counts[category] += 1
    match = re.search(r"^permalink:\s*(\S+)", text, re.M)
    if match:
        if match.group(1) in permalinks:
            errors.append(f"Duplicate permalink: {match.group(1)}")
        permalinks.add(match.group(1))

for category, wanted in expected.items():
    if counts[category] != wanted:
        errors.append(f"{category}: expected {wanted}, found {counts[category]}")

hp = (docs / "collectibles/heart-pieces.md").read_text(encoding="utf-8")
if len(re.findall(r"^\| \d+ \|", hp, re.M)) != 52:
    errors.append("Heart Piece table does not contain 52 numbered entries")

if errors:
    print("\n".join(errors))
    sys.exit(1)
print(f"Validated {len(pages)} files, 14 main chapters, 39 side quests, 24 masks, and 52 heart pieces.")
