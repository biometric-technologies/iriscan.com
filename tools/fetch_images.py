"""Materialize the blog photos listed in assets/img/blog/sources.json.

Each entry gets a 1200x750 image for articles and social cards and a 640x400
thumbnail for the blog grid. Entries with embedded_jpeg extract the original
JPEG from a local SVG instead, without resizing or network access. Existing
files are left alone.
"""
import base64, json, pathlib, urllib.request
import xml.etree.ElementTree as ET

root = pathlib.Path(__file__).resolve().parent.parent
out = root / "assets/img/blog"
sizes = {"": (1200, 750, 74), "-640": (640, 400, 70)}

for item in json.loads((out / "sources.json").read_text()):
    if "embedded_jpeg" in item:
        target = out / f"{item['file']}.jpg"
        if target.exists():
            continue
        image = ET.parse(out / item["embedded_jpeg"]).getroot().find(
            "{http://www.w3.org/2000/svg}image"
        )
        href = "" if image is None else image.get("href", "")
        prefix = "data:image/jpeg;base64,"
        if not href.startswith(prefix):
            raise ValueError(f"Expected an embedded JPEG in {item['embedded_jpeg']}")
        data = base64.b64decode(href[len(prefix):], validate=True)
        if not data.startswith(b"\xff\xd8\xff"):
            raise ValueError(f"Invalid JPEG in {item['embedded_jpeg']}")
        target.write_bytes(data)
        print(target.name, target.stat().st_size)
        continue
    for suffix, (w, h, q) in sizes.items():
        target = out / f"{item['file']}{suffix}.jpg"
        if target.exists():
            continue
        # "crop" in sources.json overrides the automatic crop, e.g. a focal point with zoom:
        # "crop=focalpoint&fp-x=0.67&fp-y=0.4&fp-z=1.9" (imgix parameters, which Unsplash serves)
        crop = item.get("crop", "crop=faces,entropy")
        url = f"{item['src']}?w={w}&h={h}&fit=crop&{crop}&q={q}&fm=jpg"
        req = urllib.request.Request(url, headers={"User-Agent": "iriscan.com image fetch"})
        with urllib.request.urlopen(req, timeout=60) as r:
            target.write_bytes(r.read())
        print(target.name, target.stat().st_size)
