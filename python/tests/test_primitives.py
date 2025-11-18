from __future__ import annotations

from pytoon import encode, EncodeOptions
import math


def _e(value):
    return encode(value, EncodeOptions())


def test_integer_and_integer_float():
    assert _e(1) == '1'
    assert _e(1.0) == '1'


def test_basic_float_precision():
    assert _e(1.23456789) == '1.23456789'
    assert _e(1.2345678) == '1.2345678'


def test_negative_zero_and_zero():
    assert _e(0.0) == '0'
    assert _e(-0.0) == '0'


def test_special_values():
    # Non-finite floats are normalized to null by normalize_value
    assert _e(float('nan')) == 'null'
    assert _e(float('inf')) == 'null'
    assert _e(float('-inf')) == 'null'


def test_exponential_format_and_exponent_padding():
    # Ensure exponent formatting removes leading zero in exponent like JS
    assert _e(1.2345e-7) == '1.2345e-7'
    assert _e(1.2345e+7) == '12345000'


def test_inline_array_number_formatting():
    # Inline arrays should include the same formatting
    # Format: [3]: <delimiter-separated pritimives>
    out = _e([1.0, -0.0, 1.2345e-7])
    assert out.startswith('[3]')
    assert '1,0,1.2345e-7' in out
