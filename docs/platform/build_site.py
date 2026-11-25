"""Build the data platform site (Architecture, Data lineage, Data model, Data catalog).

Everything on the page is read from the repo; nothing is typed into the page by hand:
  - pipeline/notebooks/*_ELT_*.ipynb   -> lineage (which function reads which table, writes which table)
  - model/definition/**/*.tmdl         -> semantic model tables, columns, measures, relationships, roles
  - app/src, pm-app/src                -> which model tables, columns and measures each app reads
  - docs/platform/catalog_notes.json   -> descriptions taken from docs/ (each with its doc reference)
  - docs/platform/model_stats.json     -> row counts, distinct counts, date ranges from the published model
  - design-system/tokens.css           -> Auxis colours and type

Usage (from the repo root, Python 3.10+, standard library only):
  python docs/platform/build_site.py                 # writes docs/platform/index.html
  python docs/platform/build_site.py stats-dax       # writes the DAX that refreshes model_stats.json
  python docs/platform/build_site.py import-stats rows.csv freshness.csv
                                                     # turns the two query results into model_stats.json

The page fetches nothing from the network and never shows a data value of a personal column.
"""

from __future__ import annotations

import csv
import datetime as dt
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
MODEL_DIR = ROOT / "model" / "definition"
NOTEBOOK_DIR = ROOT / "pipeline" / "notebooks"
NOTES = HERE / "catalog_notes.json"
STATS = HERE / "model_stats.json"
TEMPLATE = HERE / "template.html"
OUT = HERE / "index.html"
TOKENS = ROOT / "design-system" / "tokens.css"
APP_DIRS = {"app": ROOT / "app" / "src", "pm-app": ROOT / "pm-app" / "src"}
APP_EXT = {".dax", ".ts", ".tsx", ".json"}


# --------------------------------------------------------------------------- TMDL

def _unquote(name: str) -> str:
    name = name.strip()
    if len(name) >= 2 and name[0] == "'" and name[-1] == "'":
        return name[1:-1].replace("''", "'")
    return name


def parse_tmdl_table(path: Path) -> dict:
    lines = path.read_text(encoding="utf-8").splitlines()
    table = {"name": None, "description": "", "hidden": False, "mode": None, "entity": None,
             "columns": [], "measures": []}
    pending_doc: list[str] = []
    current = None  # dict of the column / measure being read
    in_partition = False
    for raw in lines:
        if not raw.strip():
            continue
        depth = len(raw) - len(raw.lstrip("\t"))
        text = raw.strip()
        if text.startswith("///"):
            pending_doc.append(text[3:].strip())
            continue
        if depth == 0 and text.startswith("table "):
            table["name"] = _unquote(text[6:])
            table["description"] = " ".join(pending_doc)
            pending_doc = []
            continue
        if depth == 1:
            in_partition = False
            current = None
            m = re.match(r"column\s+('(?:[^']|'')+'|[^=\s]+)", text)
            if m:
                current = {"name": _unquote(m.group(1)), "dataType": "", "hidden": False,
                           "description": " ".join(pending_doc), "calculated": "=" in text}
                table["columns"].append(current)
            m = re.match(r"measure\s+('(?:[^']|'')+'|[^=\s]+)\s*=\s*(.*)$", text)
            if m:
                current = {"name": _unquote(m.group(1)), "folder": "", "format": "", "hidden": False,
                           "description": " ".join(pending_doc), "expression": m.group(2)}
                table["measures"].append(current)
            if text.startswith("partition "):
                in_partition = True
            if text == "isHidden":
                table["hidden"] = True
            pending_doc = []
            continue
        if in_partition:
            m = re.match(r"(mode|entityName|schemaName):\s*(.+)$", text)
            if m:
                key, val = m.group(1), m.group(2).strip()
                if key == "mode":
                    table["mode"] = val
                elif key == "entityName":
                    table["entity"] = val + (("@" + table["entity"]) if table["entity"] else "")
                elif key == "schemaName":
                    table["schema"] = val
            continue
        if current is None:
            continue
        if depth == 2:
            m = re.match(r"(dataType|displayFolder|formatString):\s*(.+)$", text)
            if m:
                key = {"dataType": "dataType", "displayFolder": "folder", "formatString": "format"}[m.group(1)]
                current[key] = m.group(2).strip()
            elif text == "isHidden":
                current["hidden"] = True
        elif depth >= 3 and "expression" in current:
            current["expression"] += "\n" + text
    if table.get("entity"):
        table["entity"] = table["entity"].split("@")[0]
    return table


def parse_relationships(path: Path) -> list[dict]:
    rels, cur = [], None
    for raw in path.read_text(encoding="utf-8").splitlines():
        text = raw.strip()
        if text.startswith("relationship "):
            cur = {"active": True, "crossFilter": "single", "fromCard": "many", "toCard": "one"}
            rels.append(cur)
            continue
        if cur is None or ":" not in text:
            continue
        key, val = [s.strip() for s in text.split(":", 1)]
        if key in ("fromColumn", "toColumn"):
            tbl, col = _split_column_ref(val)
            cur[key.replace("Column", "")] = {"table": tbl, "column": col}
        elif key == "isActive":
            cur["active"] = val.lower() != "false"
        elif key == "crossFilteringBehavior":
            cur["crossFilter"] = "both" if "both" in val.lower() else "single"
        elif key == "fromCardinality":
            cur["fromCard"] = val
        elif key == "toCardinality":
            cur["toCard"] = val
    return rels


def _split_column_ref(ref: str) -> tuple[str, str]:
    ref = ref.strip()
    if ref.startswith("'"):
        end = ref.index("'.", 1)
        return _unquote(ref[: end + 1]), _unquote(ref[end + 2:])
    tbl, col = ref.split(".", 1)
    return tbl, _unquote(col)


def parse_roles(folder: Path) -> list[dict]:
    """Role names, descriptions and the tables they filter. Members are never read."""
    roles = []
    for path in sorted(folder.glob("*.tmdl")):
        role = {"name": "", "description": "", "filters": []}
        doc = []
        for raw in path.read_text(encoding="utf-8").splitlines():
            text = raw.strip()
            if text.startswith("///"):
                doc.append(text[3:].strip())
            elif text.startswith("role "):
                role["name"] = _unquote(text[5:])
                role["description"] = " ".join(doc)
            elif text.startswith("tablePermission "):
                role["filters"].append(_unquote(text[len("tablePermission "):].split("=", 1)[0]))
        roles.append(role)
    return roles


def load_model() -> dict:
    tables = [parse_tmdl_table(p) for p in sorted((MODEL_DIR / "tables").glob("*.tmdl"))]
    return {
        "tables": tables,
        "relationships": parse_relationships(MODEL_DIR / "relationships.tmdl"),
        "roles": parse_roles(MODEL_DIR / "roles") if (MODEL_DIR / "roles").exists() else [],
    }


# --------------------------------------------------------------------------- notebooks

def _notebook_source(path: Path) -> str:
    nb = json.loads(path.read_text(encoding="utf-8"))
    return "\n".join("".join(c["source"]) for c in nb["cells"] if c["cell_type"] == "code")


def _config(src: str) -> dict:
    cfg = {}
    m = re.search(r"^class PipelineConfig:\n((?:[ \t]+.*\n|\s*\n)+)", src, re.M)
    if m:
        for k, v in re.findall(r"^\s+(\w+)\s*=\s*[\"']([^\"']*)[\"']", m.group(1), re.M):
            cfg[k] = v
    return cfg


def _blocks(src: str) -> dict[str, str]:
    """Top-level functions by name, plus '__main__' for the orchestration block."""
    blocks, name, buf = {}, None, []
    for line in src.splitlines():
        top = line and not line[0].isspace()
        if top:
            m = re.match(r"def (\w+)", line)
            if name:
                blocks[name] = "\n".join(buf)
            if m:
                name, buf = m.group(1), [line]
            elif line.startswith("if __name__"):
                name, buf = "__main__", [line]
            else:
                name, buf = None, []
            continue
        if name:
            buf.append(line)
    if name:
        blocks[name] = "\n".join(buf)
    return blocks


def _resolve(text: str, cfg: dict) -> str:
    text = re.sub(r"\{(?:PipelineConfig|self\._cfg)\.(\w+)\}", lambda m: cfg.get(m.group(1), m.group(0)), text)
    # local f-string variables that hold a catalog prefix, e.g. gold = f"{CATALOG}.gold"
    for var, val in re.findall(r"^\s*(\w+)\s*=\s*f?[\"']([^\"'{}]+)[\"']\s*$", text, re.M):
        text = text.replace("{" + var + "}", val)
    return text


def parse_notebook(path: Path) -> dict:
    src = _notebook_source(path)
    cfg = _config(src)
    catalog = cfg.get("TARGET_CATALOG", "")
    file_consts = dict(re.findall(r"^(\w+)\s*=\s*[\"'](Files/[^\"']+)[\"']", src, re.M))
    blocks = {k: _resolve(v, cfg) for k, v in _blocks(src).items()}
    table_re = re.compile(re.escape(catalog) + r"\.(\w+)\.(\w+)") if catalog else None

    def tables_in(text: str) -> set[str]:
        found = {f"{s}.{t}" for s, t in table_re.findall(text)} if table_re else set()
        for const, fpath in file_consts.items():
            if re.search(r"\b" + const + r"\b", text) and "read" in text:
                found.add("Files." + fpath.rsplit("/", 1)[-1])
        return found

    def writes_in(text: str) -> set[str]:
        out = set()
        for target in re.findall(r"saveAsTable\(\s*([^)]+?)\s*\)", text):
            target = target.strip()
            m = re.search(r"^\s*" + re.escape(target) + r"\s*=\s*f?[\"']([^\"']+)[\"']", text, re.M)
            literal = m.group(1) if m else target.strip("f\"'")
            found = table_re.findall(literal) if table_re else []
            out |= {f"{s}.{t}" for s, t in found}
        return out

    funcs = {n: b for n, b in blocks.items() if n != "__main__"}
    calls = {n: {c for c in funcs if c != n and re.search(r"\b" + c + r"\(", b)} for n, b in funcs.items()}
    own_reads = {n: tables_in(b) - writes_in(b) for n, b in funcs.items()}

    def all_reads(n: str, seen=None) -> set[str]:
        seen = seen or set()
        if n in seen:
            return set()
        seen.add(n)
        out = set(own_reads.get(n, set()))
        for c in calls.get(n, ()):
            out |= all_reads(c, seen)
        return out

    steps = []
    main = blocks.get("__main__", "")
    flat = re.sub(r"\\\s*\n\s*", "", main)  # join backslash continuations

    # pattern 1: df = build_x(...); target = "..."; df....saveAsTable(target)
    df_target = {}
    for stmt in flat.splitlines():
        m = re.match(r"\s*(\w+)\..*saveAsTable\(\s*(\w+)\s*\)", stmt)
        if m:
            df_target[m.group(1)] = m.group(2)
    df_table = {}
    for df, tvar in df_target.items():
        m = re.search(r"^\s*" + tvar + r"\s*=\s*f?[\"']([^\"']+)[\"']", flat, re.M)
        if not m:
            continue
        hit = table_re.findall(m.group(1)) if table_re else []
        if hit:
            df_table[df] = f"{hit[0][0]}.{hit[0][1]}"
    for df, table in df_table.items():
        m = re.search(r"^\s*" + df + r"\s*=\s*(.+)$", flat, re.M)
        expr = m.group(1) if m else ""
        fns = [f for f in funcs if re.search(r"\b" + f + r"\(", expr)]
        reads = set()
        for f in fns:
            reads |= all_reads(f)
        for other_df, other_table in df_table.items():
            if other_df != df and re.search(r"\b" + other_df + r"\b", expr):
                reads.add(other_table)
        steps.append({"writes": table, "functions": fns, "reads": sorted(reads - {table})})

    # pattern 2: process_incremental_load(source_schema=..., source_table=..., target_schema=..., ...)
    for call in re.findall(r"process_incremental_load\((.*?)\)\s*$", main, re.S | re.M):
        kw = dict(re.findall(r"(\w+)\s*=\s*([^,\n]+)", call))

        def val(k):
            v = kw.get(k, "").strip()
            m = re.match(r"PipelineConfig\.(\w+)", v)
            return cfg.get(m.group(1), v) if m else v.strip("\"'")
        reads = {f"{val('source_schema')}.{val('source_table')}"}
        fn = val("transform_func")
        if fn in funcs:
            reads |= all_reads(fn)
        steps.append({"writes": f"{val('target_schema')}.{val('target_table')}",
                      "functions": [f for f in ["process_incremental_load", fn] if f],
                      "reads": sorted(reads)})

    # pattern 3: functions called from main that write their own table
    for f in funcs:
        if f in calls.get("__main__", set()) or re.search(r"\b" + f + r"\(", main):
            for w in writes_in(funcs[f]):
                if not any(s["writes"] == w for s in steps):
                    steps.append({"writes": w, "functions": [f], "reads": sorted(all_reads(f) - {w})})

    refresh = None
    m = re.search(r"refresh_powerbi_model\(\s*PipelineConfig\.(\w+)\s*\)", main)
    if m:
        refresh = cfg.get(m.group(1))
    steps = [s for s in steps if not s["writes"].startswith("audit.")]
    return {"file": path.relative_to(ROOT).as_posix(), "name": path.stem, "catalog": catalog,
            "full_load": "RUN_FULL_LOAD = True" in src, "steps": steps, "refreshes_model": refresh}


def load_pipeline() -> list[dict]:
    return [parse_notebook(p) for p in sorted(NOTEBOOK_DIR.glob("*_ELT_*.ipynb"))]


# --------------------------------------------------------------------------- consumers

def _measure_refs(expr: str, measure_names: set[str]) -> set[str]:
    return {m for m in re.findall(r"(?<![\w'\]])\[([^\]]+)\]", expr) if m in measure_names}


def _table_refs(text: str, table_names: list[str]) -> dict[str, set[str]]:
    out: dict[str, set[str]] = {}
    for t in table_names:
        pat = r"(?:'" + re.escape(t) + r"'|(?<![\w'])" + re.escape(t) + r")(?:\[([^\]]+)\])?"
        for m in re.finditer(pat, text):
            out.setdefault(t, set())
            if m.group(1):
                out[t].add(m.group(1))
    return out


def load_consumers(model: dict) -> dict:
    measures = {m["name"]: m for t in model["tables"] for m in t["measures"]}
    names = set(measures)
    tables = [t["name"] for t in model["tables"] if t["name"] != "_Measures"]

    # what each measure reaches, through the measures it calls
    direct_tables = {n: _table_refs(m["expression"], tables) for n, m in measures.items()}
    direct_measures = {n: _measure_refs(m["expression"], names) - {n} for n, m in measures.items()}

    def reach(n, seen=None):
        seen = seen or set()
        if n in seen:
            return {}
        seen.add(n)
        out = {k: set(v) for k, v in direct_tables[n].items()}
        for d in direct_measures[n]:
            for k, v in reach(d, seen).items():
                out.setdefault(k, set()).update(v)
        return out
    measure_tables = {n: reach(n) for n in measures}

    result = {}
    for app, folder in APP_DIRS.items():
        if not folder.exists():
            continue
        files = [p for p in folder.rglob("*") if p.suffix in APP_EXT and p.is_file()
                 and "node_modules" not in p.parts and not p.name.endswith((".spec.ts", ".test.ts"))]
        used_tables: dict[str, set[str]] = {}
        used_measures: set[str] = set()
        query_files = 0
        for p in files:
            text = p.read_text(encoding="utf-8", errors="ignore")
            refs = _table_refs(text, tables)
            ms = _measure_refs(text, names)
            if p.suffix == ".dax" or (refs and ms):
                query_files += 1 if p.suffix == ".dax" else 0
            for t, cols in refs.items():
                used_tables.setdefault(t, set()).update(cols)
            used_measures |= ms
        via_measures: dict[str, set[str]] = {}
        for m in used_measures:
            for t, cols in measure_tables[m].items():
                via_measures.setdefault(t, set()).update(cols)
        result[app] = {
            "query_files": query_files,
            "tables_direct": {k: sorted(v) for k, v in used_tables.items()},
            "tables_via_measures": {k: sorted(v) for k, v in via_measures.items()},
            "measures": sorted(used_measures),
        }
    return {"apps": result,
            "measure_tables": {n: {k: sorted(v) for k, v in d.items()} for n, d in measure_tables.items()}}


# --------------------------------------------------------------------------- stats

DATE_TYPES = {"dateTime"}
NUM_TYPES = {"int64", "double", "decimal"}


def stats_dax(model: dict) -> str:
    rows, cols = [], []
    for t in model["tables"]:
        if t["name"] == "_Measures":
            continue
        q = "'" + t["name"].replace("'", "''") + "'"
        rows.append(f'ROW("table", "{t["name"]}", "rows", COUNTROWS({q}))')
        if t["mode"] != "directLake":
            continue
        for c in t["columns"]:
            ref = f"{q}[{c['name']}]"
            if c["dataType"] in DATE_TYPES:
                lo, hi = f'FORMAT(MIN({ref}), "yyyy-mm-dd")', f'FORMAT(MAX({ref}), "yyyy-mm-dd")'
            elif c["dataType"] in NUM_TYPES:
                lo, hi = f'FORMAT(MIN({ref}), "0.##")', f'FORMAT(MAX({ref}), "0.##")'
            else:
                lo = hi = '""'
            cols.append(f'ROW("table", "{t["name"]}", "column", "{c["name"]}", '
                        f'"distinct", DISTINCTCOUNT({ref}), "blank", COUNTBLANK({ref}), "min", {lo}, "max", {hi})')
    return ("// 1) row counts\nEVALUATE UNION(\n  " + ",\n  ".join(rows) + "\n)\n\n"
            "// 2) column statistics (run as a separate query)\nEVALUATE UNION(\n  " + ",\n  ".join(cols) + "\n)\n")


def import_stats(rows_file: str, cols_file: str | None = None) -> None:
    """Either two CSV files (Power BI modeling MCP results), or one JSON printed by
    `npx fabric-app-semantic-model-tools run-dax-query --dax q1 --dax q2 --sample 400` (from app/)."""
    def read(path):
        with open(path, encoding="utf-8-sig", newline="") as f:
            rdr = csv.reader(f)
            head = [h.strip("[]") for h in next(rdr)]
            return [dict(zip(head, r)) for r in rdr]

    if rows_file.endswith(".json") or cols_file is None:
        result = json.loads(Path(rows_file).read_text(encoding="utf-8-sig"))
        tables = []
        for q in result["queries"]:
            if q["status"] != "success" or len(q["sample"]) != q["rows"]:
                sys.exit(f"query {q['dax']} failed or was cut ({len(q['sample'])} of {q['rows']} rows): "
                         "rerun with a larger --sample")
            head = [h.strip("[]") for h in q["columns"]]
            tables.append([{k: ("" if v is None else v) for k, v in zip(head, r)} for r in q["sample"]])
        row_rows, col_rows = tables[0], tables[1]
    else:
        row_rows, col_rows = read(rows_file), read(cols_file)
    stats = {"captured_at": dt.datetime.now().strftime("%Y-%m-%d %H:%M"), "rows": {}, "columns": {}}
    for r in row_rows:
        stats["rows"][r["table"]] = int(float(r["rows"] or 0))
    for r in col_rows:
        stats["columns"].setdefault(r["table"], {})[r["column"]] = {
            "distinct": int(float(r["distinct"] or 0)), "blank": int(float(r["blank"] or 0)),
            "min": r.get("min", ""), "max": r.get("max", "")}
    if STATS.exists():
        old = json.loads(STATS.read_text(encoding="utf-8"))
        stats["freshness"] = old.get("freshness", {})
    STATS.write_text(json.dumps(stats, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {STATS.relative_to(ROOT)}: {len(stats['rows'])} tables, "
          f"{sum(len(v) for v in stats['columns'].values())} columns")


# --------------------------------------------------------------------------- assemble

def tokens_css() -> str:
    css = TOKENS.read_text(encoding="utf-8")
    m = re.search(r"\[data-theme=\"dark\"\]\s*\{(.*?)\n\}", css, re.S)
    if m:  # follow the viewer's system theme when no explicit theme is set
        css += ("\n@media (prefers-color-scheme: dark) { :root:not([data-theme=\"light\"]) {"
                + m.group(1) + "\n color-scheme: dark; } }\n[data-theme=\"dark\"] { color-scheme: dark; }\n")
    return css


def build() -> None:
    model = load_model()
    pipeline = load_pipeline()
    consumers = load_consumers(model)
    notes = json.loads(NOTES.read_text(encoding="utf-8"))
    stats = json.loads(STATS.read_text(encoding="utf-8")) if STATS.exists() else {}

    # personal columns: never ship values for them (we ship none anyway, only counts)
    for t in model["tables"]:
        personal = set(notes["tables"].get(t["name"], {}).get("personal", []))
        for c in t["columns"]:
            c["personal"] = c["name"] in personal
        for m in t["measures"]:
            m.pop("expression", None)
            m["tables"] = sorted(consumers["measure_tables"].get(m["name"], {}).keys())

    data = {
        "built_at": dt.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "git": _git_head(),
        "model_name": next((nb["refreshes_model"] for nb in pipeline if nb["refreshes_model"]),
                           "semantic model"),
        "model": model,
        "pipeline": pipeline,
        "apps": consumers["apps"],
        "notes": notes,
        "stats": stats,
    }
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    html = TEMPLATE.read_text(encoding="utf-8")
    html = html.replace("/*__TOKENS__*/", tokens_css()).replace("__DATA__", payload)
    OUT.write_text(html, encoding="utf-8")

    n_ext = len({r for nb in pipeline for s in nb["steps"] for r in s["reads"]}
                - {s["writes"] for nb in pipeline for s in nb["steps"]})
    n_cols = sum(len(t["columns"]) for t in model["tables"] if t["name"] != "_Measures")
    described = sum(1 for t in model["tables"] for c in t["columns"]
                    if c["description"] or notes["tables"].get(t["name"], {}).get("columns", {}).get(c["name"]))
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB)")
    print(f"  notebooks {len(pipeline)}, steps {sum(len(nb['steps']) for nb in pipeline)}, "
          f"source tables {n_ext}")
    print(f"  model tables {len(model['tables'])}, columns {n_cols} ({described} described), "
          f"measures {sum(len(t['measures']) for t in model['tables'])}, "
          f"relationships {len(model['relationships'])}, roles {len(model['roles'])}")
    for app, a in consumers["apps"].items():
        print(f"  {app}: {a['query_files']} DAX files, {len(a['measures'])} measures, "
              f"tables {sorted(set(a['tables_direct']) | set(a['tables_via_measures']))}")
    if not stats:
        print("  no model_stats.json yet: row counts and column statistics are empty")


def _git_head() -> str:
    head = ROOT / ".git" / "HEAD"
    try:
        ref = head.read_text().strip()
        if ref.startswith("ref: "):
            branch = ref[5:]
            sha = (ROOT / ".git" / branch).read_text().strip() if (ROOT / ".git" / branch).exists() else ""
            return f"{branch.rsplit('/', 1)[-1]} @ {sha[:7]}"
        return ref[:7]
    except OSError:
        return ""


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "build"
    if cmd == "stats-dax":
        out = HERE / "model_stats.dax"
        out.write_text(stats_dax(load_model()), encoding="utf-8")
        print(f"wrote {out.relative_to(ROOT)}: run both queries against the published model, "
              f"save the results as CSV and run: import-stats rows.csv columns.csv")
    elif cmd == "import-stats":
        import_stats(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
    elif cmd == "build":
        build()
    else:
        sys.exit(__doc__)
