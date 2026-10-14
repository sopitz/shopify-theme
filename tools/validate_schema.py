#!/usr/bin/env python3
"""Focused offline Shopify schema and saved-setting validation.

Checks documented rules that Theme Check did not catch in this package.
It is deliberately not a replacement for Shopify's upload/runtime validation.
Schema `default` and saved values are separate: saved /pages/... URLs and
product/collection handles are valid, while those resource schema defaults
are restricted or unsupported.

Official references (checked 2026-10-14):
https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings
https://shopify.dev/docs/storefronts/themes/architecture/sections/section-schema
https://shopify.dev/docs/storefronts/themes/architecture/templates/json-templates
https://shopify.dev/docs/storefronts/themes/architecture/limits
"""

import argparse
from collections import Counter
from html.parser import HTMLParser
import json
import math
from pathlib import Path
import re
import sys

URL_DEFAULTS = {"/collections", "/collections/all"}
MENU_DEFAULTS = {"main-menu", "footer"}
# These single-resource types explicitly do not support a schema default.
NO_DEFAULT = {"article", "blog", "collection", "image_picker", "page", "product", "video"}
RESOURCE_TYPES = NO_DEFAULT | {"link_list", "font_picker"}
TEXT_TYPES = {"text", "textarea", "inline_richtext", "richtext", "html", "liquid", "url", "color", "color_background", "text_alignment"}
SECTION_KEYS = {"name", "tag", "class", "limit", "settings", "blocks", "max_blocks", "presets", "default", "locales", "enabled_on", "disabled_on"}
SECTION_TAGS = {"article", "aside", "div", "footer", "header", "section"}
SUPPORTED_TYPES = TEXT_TYPES | RESOURCE_TYPES | {"checkbox", "number", "range", "select", "radio", "collection_list", "product_list", "video_url", "metaobject", "metaobject_list", "color_scheme", "color_scheme_group", "color_palette", "header", "paragraph"}
SCHEMA = re.compile(r"{%-?\s*schema\s*-?%}([\s\S]*?){%-?\s*endschema\s*-?%}")


def numeric(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def duplicate_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"Duplicate JSON key: {key}")
        result[key] = value
    return result


class RichtextDefault(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.problems = []

    def handle_starttag(self, tag, attrs):
        if not self.stack and tag not in {"p", "ul"}:
            self.problems.append(f"Top-level <{tag}> must be <p> or <ul>")
        if tag not in {"p", "ul", "li", "br", "strong", "b", "em", "i", "u", "span", "a"}:
            self.problems.append(f"Unsupported richtext tag <{tag}>")
        if tag != "br":
            self.stack.append(tag)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag != "br":
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if not self.stack or self.stack[-1] != tag:
            self.problems.append(f"Unbalanced </{tag}>")
        else:
            self.stack.pop()

    def handle_data(self, data):
        if not self.stack and data.strip():
            self.problems.append("Unwrapped richtext text")


class Validator:
    def __init__(self, root):
        self.root = Path(root).resolve()
        self.findings = []
        self.sections = {}
        self.globals = {}
        self.counts = Counter()

    def add(self, location, rule, detail):
        self.findings.append({"location": str(location), "rule": rule, "detail": detail})

    def read_json(self, path):
        try:
            return json.loads(path.read_text(), object_pairs_hook=duplicate_keys)
        except (OSError, ValueError) as error:
            self.add(path.relative_to(self.root), "json", str(error))
            return None

    def value(self, definition, value, location, is_default=False):
        typ = definition.get("type")
        if is_default and typ in NO_DEFAULT:
            self.add(location, "resource_no_default", f"{typ} does not support schema default")
            return
        if is_default and typ == "url" and value not in URL_DEFAULTS:
            self.add(location, "url_default", f"{value!r}; allowed: /collections or /collections/all")
            return
        if is_default and typ == "link_list" and value not in MENU_DEFAULTS:
            self.add(location, "link_list_default", f"{value!r}; allowed: main-menu or footer")
            return
        if typ == "checkbox" and not isinstance(value, bool):
            self.add(location, "boolean_value", f"Expected boolean, got {value!r}")
        elif typ in {"number", "range"}:
            if not numeric(value):
                self.add(location, "numeric_value", f"Expected number, got {value!r}")
            elif typ == "range":
                mn, mx, step = definition.get("min"), definition.get("max"), definition.get("step", 1)
                if all(numeric(x) for x in (mn, mx, step)) and step > 0:
                    if not mn <= value <= mx or not math.isclose((value - mn) / step, round((value - mn) / step), abs_tol=1e-7):
                        self.add(location, "range_value", f"{value!r} is outside range or step")
        elif typ in {"select", "radio", "text_alignment"}:
            options = {o.get("value") for o in definition.get("options", [])} if typ != "text_alignment" else {"left", "right", "center"}
            if value not in options:
                self.add(location, "option_value", f"{value!r} not in {sorted(options)!r}")
        elif typ in TEXT_TYPES | RESOURCE_TYPES:
            if not isinstance(value, str):
                self.add(location, "string_value", f"Expected string, got {type(value).__name__}")
            elif is_default and not value and typ in {"text", "textarea", "inline_richtext", "richtext", "liquid", "html"}:
                self.add(location, "empty_default", f"{typ} schema default must not be empty")
            elif typ == "richtext" and is_default:
                parser = RichtextDefault()
                parser.feed(value)
                parser.close()
                for problem in parser.problems + (["Unclosed richtext tags"] if parser.stack else []):
                    self.add(location, "richtext_default", problem)
        elif typ in {"product_list", "collection_list"} and not isinstance(value, list):
            self.add(location, "resource_list_value", f"Expected list, got {type(value).__name__}")

    def settings(self, settings, location):
        result = {}
        if not isinstance(settings, list):
            self.add(location, "settings_list", "Settings must be an array")
            return result
        for index, definition in enumerate(settings):
            where = f"{location}/{definition.get('id', index)}"
            typ = definition.get("type")
            self.counts["setting_definitions"] += 1
            if typ not in SUPPORTED_TYPES:
                self.add(where, "setting_type", f"Unknown setting type: {typ!r}")
            if typ in {"header", "paragraph"}:
                continue
            key = definition.get("id")
            if not isinstance(key, str) or not key:
                self.add(where, "setting_id", "Setting id required")
            elif key in result:
                self.add(where, "duplicate_setting_id", key)
            else:
                result[key] = definition
            if not isinstance(definition.get("label"), str) and typ not in {"color_palette", "color_scheme_group"}:
                self.add(where, "setting_label", "Setting label required")
            if typ == "range":
                values = [definition.get("min"), definition.get("max"), definition.get("step", 1)]
                if not all(numeric(x) for x in values) or values[0] >= values[1] or values[2] <= 0:
                    self.add(where, "range_bounds", f"Invalid min/max/step: {values!r}")
                if "default" not in definition:
                    self.add(where, "range_default_required", "Range schema default is required")
            if typ == "font_picker" and "default" not in definition:
                self.add(where, "font_default_required", "Font picker schema default is required")
            if typ in {"select", "radio"}:
                options = definition.get("options", [])
                if not isinstance(options, list) or not options:
                    self.add(where, "options_required", "Options array must not be empty")
                else:
                    vals = [o.get("value") for o in options]
                    if len(vals) != len(set(vals)) or any(not isinstance(v, str) for v in vals):
                        self.add(where, "option_definitions", "Option values must be unique strings")
            if "default" in definition:
                self.value(definition, definition["default"], where + "/default", True)
        return result

    def saved_settings(self, saved, definitions, location):
        if not isinstance(saved, dict):
            self.add(location, "saved_settings_object", "Saved settings must be an object")
            return
        for key, value in saved.items():
            where = f"{location}/{key}"
            self.counts["saved_setting_values"] += 1
            if key not in definitions:
                self.add(where, "unknown_saved_setting", key)
            else:
                self.value(definitions[key], value, where)

    def section_instance(self, instance, location):
        if not isinstance(instance, dict):
            self.add(location, "section_instance", "Section data must be an object")
            return
        typ = instance.get("type")
        schema = self.sections.get(typ)
        if schema is None:
            self.add(location, "missing_section_type", str(typ))
            return
        self.counts["section_instances"] += 1
        self.saved_settings(instance.get("settings", {}), schema["settings"], location + "/settings")
        blocks = instance.get("blocks", {})
        if not isinstance(blocks, dict):
            self.add(location, "saved_blocks_object", "Blocks must be an object")
            return
        if len(blocks) > schema["max_blocks"]:
            self.add(location, "max_blocks", f"{len(blocks)} exceeds {schema['max_blocks']}")
        self.order(instance.get("block_order", []), blocks, location + "/block_order", bool(blocks))
        totals = Counter()
        for blockid, block in blocks.items():
            where = location + "/blocks/" + blockid
            blocktype = block.get("type")
            if isinstance(blocktype, str) and blocktype.startswith("shopify://apps/"):
                if "@app" not in schema["blocks"]:
                    self.add(where, "app_block_unsupported", blocktype)
                continue
            definition = schema["blocks"].get(blocktype)
            if not definition:
                self.add(where, "unknown_block_type", str(blocktype))
                continue
            totals[blocktype] += 1
            self.saved_settings(block.get("settings", {}), definition["settings"], where + "/settings")
        for blocktype, total in totals.items():
            limit = schema["blocks"][blocktype]["limit"]
            if total > limit:
                self.add(location, "block_type_limit", f"{blocktype}: {total} exceeds {limit}")

    def order(self, order, items, location, require_all=False):
        if not isinstance(order, list):
            self.add(location, "order_array", "Order must be an array")
            return
        if len(order) != len(set(order)):
            self.add(location, "duplicate_order_id", str(order))
        for key in order:
            if key not in items:
                self.add(location, "missing_order_id", str(key))
        if require_all and set(order) != set(items):
            self.add(location, "unordered_items", str(sorted(set(items) - set(order))))

    def scan(self):
        if not self.root.is_dir():
            self.add(".", "missing_theme", str(self.root))
            return self.report()
        for path in sorted((self.root / "sections").glob("*.liquid")):
            location = path.relative_to(self.root).as_posix()
            schemas = SCHEMA.findall(path.read_text())
            if len(schemas) != 1:
                self.add(location, "schema_count", f"Expected one schema, got {len(schemas)}")
                continue
            try:
                schema = json.loads(schemas[0], object_pairs_hook=duplicate_keys)
            except ValueError as error:
                self.add(location, "schema_json", str(error))
                continue
            self.counts["section_schemas"] += 1
            if set(schema) - SECTION_KEYS:
                self.add(location, "schema_keys", str(sorted(set(schema) - SECTION_KEYS)))
            if not isinstance(schema.get("name"), str) or len(schema["name"]) > 25:
                self.add(location, "schema_name", "Section name required; max 25 characters")
            if schema.get("tag", "div") not in SECTION_TAGS:
                self.add(location, "section_tag", str(schema.get("tag")))
            if "limit" in schema and schema["limit"] not in (1, 2):
                self.add(location, "section_limit", "Section limit must be 1 or 2")
            max_blocks = schema.get("max_blocks", 50)
            if not isinstance(max_blocks, int) or isinstance(max_blocks, bool) or not 0 <= max_blocks <= 50:
                self.add(location, "schema_max_blocks", str(max_blocks))
                max_blocks = 50
            parsed = {"settings": self.settings(schema.get("settings", []), location + "/settings"), "blocks": {}, "max_blocks": max_blocks}
            names = set()
            for block in schema.get("blocks", []):
                typ = block.get("type")
                where = location + "/blocks/" + str(typ)
                if typ in parsed["blocks"]:
                    self.add(where, "duplicate_block_type", str(typ))
                if typ != "@app":
                    name = block.get("name")
                    if not isinstance(name, str) or len(name) > 25:
                        self.add(where, "block_name", "Block name required; max 25 characters")
                    if name in names:
                        self.add(where, "duplicate_block_name", str(name))
                    names.add(name)
                limit = block.get("limit", max_blocks)
                if not isinstance(limit, int) or isinstance(limit, bool) or not 1 <= limit <= 50:
                    self.add(where, "block_limit", str(limit))
                    limit = 50
                parsed["blocks"][typ] = {"settings": self.settings(block.get("settings", []), where + "/settings"), "limit": limit}
            self.sections[path.stem] = parsed
            # Preset/default values are saved-value configurations, not schema defaults.
            for n, preset in enumerate(schema.get("presets", []) + ([schema["default"]] if "default" in schema else [])):
                where = location + f"/preset_or_default/{n}"
                self.saved_settings(preset.get("settings", {}), parsed["settings"], where)
                for b, block in enumerate(preset.get("blocks", [])):
                    definition = parsed["blocks"].get(block.get("type"))
                    if not definition:
                        self.add(where, "preset_block_type", str(block.get("type")))
                    else:
                        self.saved_settings(block.get("settings", {}), definition["settings"], where + f"/blocks/{b}")
        globals_path = self.root / "config/settings_schema.json"
        groups = self.read_json(globals_path)
        if isinstance(groups, list):
            for n, group in enumerate(groups):
                definitions = self.settings(group.get("settings", []), f"config/settings_schema.json/groups/{n}")
                for key in definitions:
                    if key in self.globals:
                        self.add("config/settings_schema.json", "duplicate_global_id", key)
                self.globals.update(definitions)
        templates = sorted((self.root / "templates").rglob("*.json"))
        if len(templates) > 1000:
            self.add("templates", "template_limit", str(len(templates)))
        for path in templates:
            template = self.read_json(path)
            if not isinstance(template, dict):
                continue
            self.counts["json_templates"] += 1
            location = path.relative_to(self.root).as_posix()
            if set(template) - {"layout", "wrapper", "sections", "order"}:
                self.add(location, "template_keys", str(sorted(set(template) - {"layout", "wrapper", "sections", "order"})))
            sections = template.get("sections", {})
            if not isinstance(sections, dict) or not 1 <= len(sections) <= 25:
                self.add(location, "template_sections", "Requires 1–25 sections")
                continue
            self.order(template.get("order", []), sections, location + "/order", True)
            for sectionid, instance in sections.items():
                self.section_instance(instance, location + "/sections/" + sectionid)
            layout = template.get("layout", "theme")
            if layout is not False and (not isinstance(layout, str) or not (self.root / "layout" / (layout + ".liquid")).is_file()):
                self.add(location, "missing_layout", str(layout))
        settings_data = self.read_json(self.root / "config/settings_data.json")
        if isinstance(settings_data, dict):
            configs = [("current", settings_data.get("current", {}))] + [("presets/" + key, val) for key, val in settings_data.get("presets", {}).items()]
            for label, values in configs:
                if not isinstance(values, dict):
                    self.add("config/settings_data.json/" + label, "saved_config_object", "Expected object")
                    continue
                reserved = {"sections", "content_for_index", "blocks", "block_order"}
                self.saved_settings({key: val for key, val in values.items() if key not in reserved}, self.globals, "config/settings_data.json/" + label)
                for sectionid, instance in values.get("sections", {}).items():
                    self.section_instance(instance, "config/settings_data.json/" + label + "/sections/" + sectionid)
        for path in sorted((self.root / "layout").glob("*.liquid")):
            for typ in re.findall(r"{%-?\s*section\s+['\"]([^'\"]+)['\"]\s*-?%}", path.read_text()):
                self.counts["static_section_references"] += 1
                if typ not in self.sections:
                    self.add(path.relative_to(self.root), "static_section_missing", typ)
        return self.report()

    def report(self):
        return {"theme": str(self.root), "counts": dict(self.counts), "finding_count": len(self.findings), "findings": self.findings, "scope": "Focused offline rules; actual Shopify upload/runtime remains authoritative."}


def self_test():
    invalid = [
        ({"type": "url"}, "/pages/kontakt", "url_default"),
        ({"type": "product"}, "some-product", "resource_no_default"),
        ({"type": "collection"}, "some-collection", "resource_no_default"),
        ({"type": "image_picker"}, "image.jpg", "resource_no_default"),
        ({"type": "link_list"}, "custom-menu", "link_list_default"),
        ({"type": "checkbox"}, "true", "boolean_value"),
        ({"type": "number"}, "42", "numeric_value"),
        ({"type": "richtext"}, "<h2>Bad default</h2>", "richtext_default"),
        ({"type": "select", "options": [{"value": "a"}]}, "b", "option_value"),
    ]
    for definition, value, rule in invalid:
        v = Validator(".")
        v.value(definition, value, "fixture", True)
        assert any(item["rule"] == rule for item in v.findings), (definition, v.findings)
    valid = [("url", "/collections", True), ("url", "/pages/kontakt", False), ("url", "https://upswing.ch/pages/filialubersicht#Filialen", False), ("product", "kybun-magglingen-light-grey-men", False), ("collection", "kybun-schuhe", False), ("color_background", "linear-gradient(#fff,#000)", True), ("richtext", "<p>Text <strong>bold</strong></p><ul><li>Item</li></ul>", True)]
    for typ, value, default in valid:
        v = Validator(".")
        v.value({"type": typ}, value, "fixture", default)
        assert not v.findings, (typ, v.findings)
    for definition, rule in [({"type": "range", "id": "x", "label": "X", "min": 0, "max": 10}, "range_default_required"), ({"type": "font_picker", "id": "x", "label": "X"}, "font_default_required")]:
        v = Validator(".")
        v.settings([definition], "fixture")
        assert any(item["rule"] == rule for item in v.findings)
    return len(invalid) + len(valid) + 2


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("themes", nargs="*", type=Path)
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--output", type=Path, help="Optional report path in work/; source themes are read-only")
    args = parser.parse_args()
    result = {"self_test_cases": self_test() if args.self_test else None, "reports": [Validator(path).scan() for path in args.themes]}
    encoded = json.dumps(result, ensure_ascii=False, indent=2)
    if args.output:
        args.output.write_text(encoded + "\n")
    print(encoded)
    return 1 if any(report["finding_count"] for report in result["reports"]) else 0


if __name__ == "__main__":
    sys.exit(main())
