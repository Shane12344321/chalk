Repair the supplied CHALK annotation into exactly one compact JSON object.
Preserve request_id and manifest_version. Return one to five overlay ops.
Use only circle, underline, arrow, text, or equation and only IDs from the supplied visible_elements. Structured bounds are authoritative and use normalized y-down board coordinates.
When annotation_open_sides is present, arrow, text, and equation ops must choose `side` from annotation_open_sides[target_id].
Return no prose, markdown, code fences, HTML, URLs, styles, or additional keys.
