"""Read or restore a Sketch archive's document identity after staged saving."""

import json
import os
import sys
import tempfile
import zipfile


def read_id(path):
    with zipfile.ZipFile(path) as archive:
        return json.loads(archive.read("document.json"))["do_objectID"]


path = sys.argv[1]
if len(sys.argv) == 2:
    print(read_id(path))
elif len(sys.argv) == 3:
    original_id = sys.argv[2]
    with zipfile.ZipFile(path) as source:
        document = json.loads(source.read("document.json"))
        document["do_objectID"] = original_id
        descriptor, temporary = tempfile.mkstemp(
            prefix=".Kerf-identity-", suffix=".sketch", dir=os.path.dirname(path)
        )
        try:
            with os.fdopen(descriptor, "wb") as output, zipfile.ZipFile(output, "w") as target:
                target.comment = source.comment
                for entry in source.infolist():
                    content = (
                        json.dumps(document, separators=(",", ":")).encode("utf-8")
                        if entry.filename == "document.json"
                        else source.read(entry)
                    )
                    target.writestr(entry, content)
            os.replace(temporary, path)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)
    if read_id(path) != original_id:
        raise SystemExit("Sketch document identity was not restored")
else:
    raise SystemExit("Usage: document-id.py <library.sketch> [original-id]")
