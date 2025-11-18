from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

from pytoon import DecodeOptions, EncodeOptions, decode, encode

ROOT = Path(__file__).resolve().parents[1]
ENV = os.environ.copy()
ENV['PYTHONPATH'] = str(ROOT)


def test_encode_decode_roundtrip_preserves_structure():
    payload = {
        'user': {
            'id': 42,
            'profile': {
                'display': 'Ada Lovelace',
                'stats': {'posts': 10, 'followers': 250},
            },
        },
        'tags': ['a', 'b', 'c'],
        'rows': [
            {'id': 1, 'name': 'Alice'},
            {'id': 2, 'name': 'Bob'},
        ],
    }

    toon_text = encode(payload, EncodeOptions(indent=2, key_folding='safe', flatten_depth=4))
    restored = decode(toon_text, DecodeOptions(expand_paths='safe'))

    assert restored == payload


def test_decode_handles_tabular_and_inline_arrays():
    toon_text = (
        'users[2]{id,name}:\n'
        '  1,Alice\n'
        '  2,Bob\n'
        'metadata: info\n'
        'flags[3]: true,false,"maybe"\n'
    )
    data = decode(toon_text)
    assert data['users'] == [{'id': 1, 'name': 'Alice'}, {'id': 2, 'name': 'Bob'}]
    assert data['flags'] == [True, False, 'maybe']


def run_cli(args: list[str], input_data: str | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, '-m', 'pytoon.cli', *args],
        input=input_data,
        text=True,
        capture_output=True,
        env=ENV,
        check=True,
    )


def test_cli_encode_and_decode(tmp_path: Path):
    payload = {'name': 'CLI', 'scores': [1, 2, 3]}
    json_path = tmp_path / 'sample.json'
    toon_path = tmp_path / 'sample.toon'
    json_path.write_text(json.dumps(payload), encoding='utf-8')

    result = run_cli(['-e', str(json_path), '-o', str(toon_path)])
    assert toon_path.exists()

    decode_result = run_cli(['-d', str(toon_path)])
    decoded = json.loads(decode_result.stdout)
    assert decoded == payload
