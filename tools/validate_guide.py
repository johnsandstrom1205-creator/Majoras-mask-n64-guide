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
page_texts = {}

for page in pages:
    if any(part.startswith("_") for part in page.relative_to(docs).parts):
        continue
    text = page.read_text(encoding="utf-8")
    page_texts[page] = text
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

progress_item_counts = {}
for page, text in page_texts.items():
    for item in re.findall(r'data-progress-item="([^"]+)"', text):
        progress_item_counts[item] = progress_item_counts.get(item, 0) + 1

    linked_targets = re.findall(r'data-completes-quest="([^"]+)"', text)
    linked_groups = re.findall(r'data-completes-quests="([^"]+)"', text)
    linked_targets.extend(target for group in linked_groups for target in group.split())
    for target in linked_targets:
        if target not in permalinks:
            errors.append(f"Unknown cross-progress permalink {target}: {page.relative_to(root)}")

    for group in re.findall(r'data-updates-items="([^"]+)"', text):
        for item in group.split():
            if item not in progress_item_counts and not any(
                re.search(fr'data-progress-item="{re.escape(item)}"', other_text)
                for other_text in page_texts.values()
            ):
                errors.append(f"Unknown shared progress item {item}: {page.relative_to(root)}")

for page in (docs / "main-quest").glob("*.md"):
    text = page_texts[page]
    for item in re.findall(r'data-progress-item="([^"]+)"', text):
        if progress_item_counts.get(item, 0) < 2:
            errors.append(f"Main-story progress item is not shared elsewhere ({item}): {page.relative_to(root)}")

for mask_page in (docs / "masks").glob("*.md"):
    mask_text = page_texts[mask_page]
    title_match = re.search(r'^title:\s*"([^"]+)"', mask_text, re.M)
    permalink_match = re.search(r'^permalink:\s*(\S+)', mask_text, re.M)
    if not title_match or not permalink_match:
        continue
    expected_text = f"{title_match.group(1)} obtained"
    for main_page in (docs / "main-quest").glob("*.md"):
        for line in page_texts[main_page].splitlines():
            if line.startswith("- [ ]") and expected_text in line and permalink_match.group(1) not in line:
                errors.append(f"Unlinked story mask ({title_match.group(1)}): {main_page.relative_to(root)}")

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
