"""Check committed repository syntax without installing application dependencies."""
import ast
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tokenize
import tomllib

import yaml


def main():
    paths = [Path(name) for name in subprocess.check_output(
        ['git', 'ls-files', '-z'], text=True).split('\0') if name]
    errors = []
    checked = 0
    go_files = []
    for path in paths:
        if not path.is_file() or any(part in {'fixtures', 'vendor', 'node_modules', 'bindings'} for part in path.parts):
            continue
        try:
            if path.suffix == '.py':
                with tokenize.open(path) as source:
                    ast.parse(source.read(), filename=str(path))
            elif path.suffix in {'.yml', '.yaml'} and path.parts[0] == '.github':
                yaml.load(path.read_text(encoding='utf-8-sig'), Loader=yaml.BaseLoader)
            elif path.name in {'package.json', 'package-lock.json', 'registry.json'}:
                json.loads(path.read_text(encoding='utf-8-sig'))
            elif path.name == 'pyproject.toml':
                tomllib.loads(path.read_text(encoding='utf-8-sig'))
            elif path.suffix in {'.mjs', '.cjs'}:
                subprocess.run(['node', '--check', str(path)], check=True, capture_output=True)
            elif path.suffix == '.sh':
                subprocess.run(['bash', '-n'], input=path.read_bytes().replace(b'\r\n', b'\n'), check=True, capture_output=True)
            elif path.suffix == '.go':
                go_files.append(str(path))
                continue
            else:
                continue
            checked += 1
        except Exception as error:
            errors.append(f'{path}: {error}')
    if go_files:
        if not shutil.which('gofmt'):
            errors.append('gofmt is required for committed Go sources')
        else:
            result = subprocess.run(['gofmt', '-l', *go_files], text=True, capture_output=True)
            if result.returncode:
                errors.append('Go syntax: ' + result.stderr.strip())
            checked += len(go_files)
    for error in errors[:50]:
        print(error, file=sys.stderr)
    print(f'Static checks: {checked} files, {len(errors)} errors; no application dependencies installed.')
    return int(bool(errors))


if __name__ == '__main__':
    raise SystemExit(main())
