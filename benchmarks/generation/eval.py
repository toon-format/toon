# eval_simple.py
import json
import os
import re
import csv
import subprocess
import time
from pathlib import Path
from typing import Any, Dict, List, Tuple, Type

from pydantic import BaseModel, TypeAdapter
from openai import OpenAI
from openai import APIError, InternalServerError, RateLimitError

# --- Import Pydantic models from your generate.py ---
from generate import (
    UserRow, Order,
    Company, Invoice,
)

# =========================================
# Config: models + runs + output CSV
# =========================================
MODELS = [
'deepseek-ai/DeepSeek-V3-0324-fast',
'openai/gpt-oss-120b',
'moonshotai/Kimi-K2-Instruct',
'Qwen/Qwen3-Coder-480B-A35B-Instruct',
'NousResearch/Hermes-4-405B',
'NousResearch/Hermes-4-70B',
'openai/gpt-oss-20b',
'zai-org/GLM-4.5',
'deepseek-ai/DeepSeek-R1-0528',
'PrimeIntellect/INTELLECT-3',
'Qwen/Qwen3-235B-A22B-Thinking-2507',
'Qwen/Qwen3-235B-A22B-Instruct-2507',
'Qwen/Qwen3-30B-A3B-Instruct-2507',
'Qwen/Qwen3-Coder-30B-A3B-Instruct',
'Qwen/Qwen3-32B',
'nvidia/Llama-3_1-Nemotron-Ultra-253B-v1',
'meta-llama/Llama-3.3-70B-Instruct',
'meta-llama/Meta-Llama-3.1-8B-Instruct',
'Qwen/Qwen2.5-Coder-7B-fast',
'google/gemma-2-2b-it',
'google/gemma-2-9b-it-fast'
]
RUNS_PER_MODEL = 10
CSV_PATH = Path("eval_runs.csv")

# =========================================
# LLM client
# =========================================
LLM_API_KEY = os.environ.get("LLM_API_KEY")
if not LLM_API_KEY:
    raise RuntimeError("Missing LLM_API_KEY environment variable")

client = OpenAI(
    base_url="https://api.studio.nebius.com/v1/",
    api_key=LLM_API_KEY,
)

SYSTEM_PROMPT = (
    "You are a data-formatting model. "
    "Follow instructions exactly. When asked for JSON, you must return JSON that conforms to the provided JSON Schema. "
    "No extra text. When asked for TOON, return only a ```toon fenced block."
)

# =========================================
# Retry wrapper for API calls
# =========================================
def retry_on_error(func, max_retries=5, initial_delay=2.0):
    """Retry a function with exponential backoff on API errors."""
    for attempt in range(max_retries):
        try:
            return func()
        except (InternalServerError, APIError, RateLimitError) as e:
            if attempt == max_retries - 1:
                print(f"Failed after {max_retries} attempts: {e}")
                raise
            
            delay = initial_delay * (2 ** attempt)
            print(f"API error (attempt {attempt + 1}/{max_retries}): {e}")
            print(f"Retrying in {delay:.1f} seconds...")
            time.sleep(delay)
        except Exception as e:
            # Don't retry on other exceptions (validation errors, etc.)
            raise

# =========================================
# Structured JSON call (json_schema)
# =========================================
def llm_call_json_structured(model: str, prompt: str, schema_model: Type[BaseModel]) -> Tuple[str, int, int]:
    """Return (json_text, prompt_tokens, completion_tokens) with JSON object output."""
    print(f"Calling {model} json_structured")
    # Add schema to prompt for guidance
    schema_prompt = f"{prompt}\n\nReturn valid JSON matching this schema:\n{json.dumps(schema_model.model_json_schema(), indent=2)}"
    
    def _call():
        resp = client.chat.completions.create(
            model=model,
            max_tokens=10000,
            temperature=0.0,
            top_p=1.0,
            extra_body={"top_k": 50},
            response_format={
                "type": "json_object",
            },
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": schema_prompt},
            ],
        )
        
        msg = resp.choices[0].message
        
        # Handle refusal
        if msg.refusal:
            raise ValueError(f"Model refused: {msg.refusal}")
        
        text = (msg.content or "").strip()
        usage = getattr(resp, "usage", None)
        p = getattr(usage, "prompt_tokens", 0) if usage else 0
        c = getattr(usage, "completion_tokens", 0) if usage else 0
        
        return text, p, c
    
    return retry_on_error(_call)

# =========================================
# Plain JSON call (no response_format)
# =========================================
def llm_call_json_plain(model: str, prompt: str, schema_model: Type[BaseModel]) -> Tuple[str, int, int]:
    """Return (json_text, prompt_tokens, completion_tokens) with plain text completion."""
    print(f"Calling {model} json_plain")
    # Add schema to prompt for guidance
    schema_prompt = f"{prompt}\n\nReturn valid JSON matching this schema:\n{json.dumps(schema_model.model_json_schema(), indent=2)}"
    
    def _call():
        resp = client.chat.completions.create(
            model=model,
            max_tokens=10000,
            temperature=0.0,
            top_p=1.0,
            extra_body={"top_k": 50},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": schema_prompt},
            ],
        )
        
        text = resp.choices[0].message.content or ""
        # Remove think tags
        text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
        # Remove markdown code fences if present
        text = re.sub(r"```(?:json)?\s*(.*?)```", r"\1", text, flags=re.DOTALL).strip()
        
        usage = getattr(resp, "usage", None)
        p = getattr(usage, "prompt_tokens", 0) if usage else 0
        c = getattr(usage, "completion_tokens", 0) if usage else 0
        
        return text, p, c
    
    return retry_on_error(_call)

# =========================================
# Plain call (for TOON generation)
# =========================================
def llm_call_plain(model: str, prompt: str) -> Tuple[str, int, int]:
    print(f"Calling {model} plain")
    
    def _call():
        resp = client.chat.completions.create(
            model=model,
            max_tokens=10000,
            temperature=0.0,
            top_p=1.0,
            extra_body={"top_k": 50},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
        )
        text = resp.choices[0].message.content or ""
        text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
        usage = getattr(resp, "usage", None)
        p = getattr(usage, "prompt_tokens", 0) if usage else 0
        c = getattr(usage, "completion_tokens", 0) if usage else 0
        return text, p, c
    
    return retry_on_error(_call)

# =========================================
# Paths
# =========================================
GOLD = Path("gold")
USERS_JSON   = GOLD / "users.gold.json"
ORDER_JSON   = GOLD / "order.gold.json"
COMPANY_JSON = GOLD / "company.gold.json"
INVOICE_JSON = GOLD / "invoice.gold.json"

# =========================================
# Canonicalization (stable compare)
# =========================================
def sort_users_by_id(obj: Dict[str, Any]) -> Dict[str, Any]:
    if "users" in obj and isinstance(obj["users"], list):
        obj["users"] = sorted(obj["users"], key=lambda r: r.get("id"))
    return obj

def sort_order_items(obj: Dict[str, Any]) -> Dict[str, Any]:
    if "items" in obj and isinstance(obj["items"], list):
        obj["items"] = sorted(obj["items"], key=lambda r: r.get("sku"))
    return obj

def sort_company(obj: Dict[str, Any]) -> Dict[str, Any]:
    if "departments" in obj and isinstance(obj["departments"], list):
        obj["departments"] = sorted(obj["departments"], key=lambda d: d.get("code"))
        for d in obj["departments"]:
            if isinstance(d, dict) and "employees" in d and isinstance(d["employees"], list):
                d["employees"] = sorted(d["employees"], key=lambda e: e.get("id"))
    return obj

def sort_invoice(obj: Dict[str, Any]) -> Dict[str, Any]:
    if "items" in obj and isinstance(obj["items"], list):
        obj["items"] = sorted(obj["items"], key=lambda r: r.get("sku"))
    return obj

def canonical_json(obj: Any, case: str) -> Any:
    if case == "users":   return sort_users_by_id(obj)
    if case == "order":   return sort_order_items(obj)
    if case == "company": return sort_company(obj)
    if case == "invoice": return sort_invoice(obj)
    return obj

# =========================================
# Pydantic validation (+ shape normalization)
# =========================================
class UsersPayload(BaseModel):
    users: List[UserRow]

def validate_users_json(data: Any) -> List[UserRow]:
    if not isinstance(data, dict) or "users" not in data:
        raise ValueError("Expected object with key 'users'")
    adapter = TypeAdapter(List[UserRow])
    return adapter.validate_python(data["users"])

def normalize_by_key(data: Any, key: str) -> Any:
    if isinstance(data, dict) and key in data and isinstance(data[key], dict):
        return data[key]
    return data

def validate_order_json(data: Any) -> Order:
    data = normalize_by_key(data, "order")  # TOON may wrap
    adapter = TypeAdapter(Order)
    return adapter.validate_python(data)

def validate_company_json(data: Any) -> Company:
    data = normalize_by_key(data, "company")
    adapter = TypeAdapter(Company)
    return adapter.validate_python(data)

def validate_invoice_json(data: Any) -> Invoice:
    data = normalize_by_key(data, "invoice")
    adapter = TypeAdapter(Invoice)
    return adapter.validate_python(data)

# =========================================
# TOON decode via official CLI
# =========================================
def extract_toon_payload(toon_text: str) -> str:
    m = re.search(r"```toon\s*(.*?)```", toon_text, flags=re.DOTALL | re.IGNORECASE)
    return m.group(1).strip() if m else toon_text.strip()

def decode_toon_to_json(toon_text: str) -> Any:
    payload = extract_toon_payload(toon_text)
    proc = subprocess.run(
        ["npx", "@toon-format/cli", "--decode"],
        input=payload.encode("utf-8"),
        capture_output=True,
        check=True,
    )
    return json.loads(proc.stdout.decode("utf-8"))

# =========================================
# Prompts — JSON (structured) / TOON
# =========================================
def make_json_prompt_users() -> str:
    return (
        "Create a user directory with three users:\n"
        "- User 1: Alice, who is an admin\n"
        "- User 2: Bob, who is a staff member\n"
        "- User 3: Eve, who is a guest\n\n"
        "Return the data as JSON with a 'users' array containing objects with id, name, and role fields."
    )

def make_json_prompt_order() -> str:
    return (
        "Create an order record:\n"
        "- Order ID: 101\n"
        "- Customer: Ada (ID: 9)\n"
        "- Items:\n"
        "  * Product A1: quantity 2, price $9.99 each\n"
        "  * Product B2: quantity 1, price $14.50 each\n\n"
        "Return as JSON with fields for id, customer (with id and name), and items array (with sku, qty, price)."
    )

def make_json_prompt_company() -> str:
    return (
        "Create a company organization structure:\n"
        "- Company: Acme (ID: 1)\n"
        "- Engineering Department (code: ENG):\n"
        "  * Alice (ID: 1) - engineer\n"
        "  * Bob (ID: 2) - manager\n"
        "- Operations Department (code: OPS):\n"
        "  * Eve (ID: 3) - analyst\n\n"
        "Return as JSON with company info and nested departments array, each containing employees."
    )

def make_json_prompt_invoice() -> str:
    return (
        "Create an invoice:\n"
        "- Invoice number: INV-2025-001\n"
        "- Currency: USD\n"
        "- Customer: Ada (ID: 9)\n"
        "- Line items:\n"
        "  * A1: quantity 2 @ $9.99 each = $19.98\n"
        "  * B2: quantity 1 @ $14.50 each = $14.50\n"
        "- Subtotal: $34.48\n"
        "- Tax: $6.90\n"
        "- Grand total: $41.38\n"
        "- Notes: Thank you for your business.\n\n"
        "Return as JSON with all invoice details including items array and totals breakdown."
    )

# =========================================
# Improved TOON Prompts (short nested examples + same tasks)
# =========================================






def make_toon_prompt_users() -> str:
    return (
        "You are to produce output STRICTLY in TOON format.\n\n"
        "TOON RULES:\n"
        "- Use 2-space indentation\n"
        "- Scalars: fieldName: value\n"
        "- Objects: fieldName: then nested fields indented\n"
        "- Arrays of objects:\n"
        "    arrayName[N]:\n"
        "      - field1: value1\n"
        "        field2: value2\n"
        "- Tabular arrays (for simple data):\n"
        "    arrayName[N]{field1,field2}:\n"
        "      val1,val2\n"
        "      val3,val4\n"
        "- [N] MUST equal actual row/item count\n"
        "- Output ONLY a ```toon code block\n\n"
        "Reference example:\n"
        "```toon\n"
        "id: 100\n"
        "type: Sample\n"
        "metadata:\n"
        "  version: 1\n"
        "  author: Alex\n"
        "sections[2]:\n"
        "  - code: A\n"
        "    title: Introduction\n"
        "    items[2]{id,value}:\n"
        "      1,First\n"
        "      2,Second\n"
        "  - code: B\n"
        "    title: Details\n"
        "    items[1]{id,value}:\n"
        "      3,Third\n"
        "summary:\n"
        "  total: 3\n"
        "  status: complete\n"
        "```\n\n"
        "TASK:\n"
        "Create an array named users with fields id, name, and role.\n"
        "User data:\n"
        "- id=1, name=Alice, role=admin\n"
        "- id=2, name=Bob, role=staff\n"
        "- id=3, name=Eve, role=guest\n\n"
        "Output only the TOON code block.\n"
    )




def make_toon_prompt_order() -> str:
    return (
        "You are to produce output STRICTLY in TOON format.\n\n"
        "TOON RULES:\n"
        "- Use 2-space indentation\n"
        "- Scalars: fieldName: value\n"
        "- Objects: fieldName: then nested fields indented\n"
        "- Arrays of objects:\n"
        "    arrayName[N]:\n"
        "      - field1: value1\n"
        "        field2: value2\n"
        "- Tabular arrays (for simple data):\n"
        "    arrayName[N]{field1,field2}:\n"
        "      val1,val2\n"
        "      val3,val4\n"
        "- [N] MUST equal actual row/item count\n"
        "- Output ONLY a ```toon code block\n\n"
        "Reference example:\n"
        "```toon\n"
        "id: 100\n"
        "type: Sample\n"
        "metadata:\n"
        "  version: 1\n"
        "  author: Alex\n"
        "sections[2]:\n"
        "  - code: A\n"
        "    title: Introduction\n"
        "    items[2]{id,value}:\n"
        "      1,First\n"
        "      2,Second\n"
        "  - code: B\n"
        "    title: Details\n"
        "    items[1]{id,value}:\n"
        "      3,Third\n"
        "summary:\n"
        "  total: 3\n"
        "  status: complete\n"
        "```\n\n"
        "TASK:\n"
        "Create an order record with fields: id, customer (with id and name), "
        "and items array (with sku, qty, price).\n"
        "- Order ID: 101\n"
        "- Customer: Ada (ID: 9)\n"
        "- Items:\n"
        "  * Product A1: quantity 2, price $9.99 each\n"
        "  * Product B2: quantity 1, price $14.50 each\n"
    )


def make_toon_prompt_company() -> str:
    return (
        "You are to produce output STRICTLY in TOON format.\n\n"
        "TOON RULES:\n"
        "- Use 2-space indentation\n"
        "- Scalars: fieldName: value\n"
        "- Objects: fieldName: then nested fields indented\n"
        "- Arrays of objects:\n"
        "    arrayName[N]:\n"
        "      - field1: value1\n"
        "        field2: value2\n"
        "- Tabular arrays (for simple data):\n"
        "    arrayName[N]{field1,field2}:\n"
        "      val1,val2\n"
        "      val3,val4\n"
        "- [N] MUST equal actual row/item count\n"
        "- Output ONLY a ```toon code block\n\n"
        "Reference example:\n"
        "```toon\n"
        "id: 100\n"
        "type: Sample\n"
        "metadata:\n"
        "  version: 1\n"
        "  author: Alex\n"
        "sections[2]:\n"
        "  - code: A\n"
        "    title: Introduction\n"
        "    items[2]{id,value}:\n"
        "      1,First\n"
        "      2,Second\n"
        "  - code: B\n"
        "    title: Details\n"
        "    items[1]{id,value}:\n"
        "      3,Third\n"
        "summary:\n"
        "  total: 3\n"
        "  status: complete\n"
        "```\n\n"
        "TASK:\n"
        "Create a company organization structure with company info and nested departments array, each containing employees:\n"
        "- Company: Acme (ID: 1)\n"
        "- Engineering Department (code: ENG):\n"
        "  * Alice (ID: 1) - engineer\n"
        "  * Bob (ID: 2) - manager\n"
        "- Operations Department (code: OPS):\n"
        "  * Eve (ID: 3) - analyst\n\n"
    )


def make_toon_prompt_invoice() -> str:
    return (
        "You are to produce output STRICTLY in TOON format.\n\n"
        "TOON RULES:\n"
        "- Use 2-space indentation\n"
        "- Scalars: fieldName: value\n"
        "- Objects: fieldName: then nested fields indented\n"
        "- Arrays of objects:\n"
        "    arrayName[N]:\n"
        "      - field1: value1\n"
        "        field2: value2\n"
        "- Tabular arrays (for simple data):\n"
        "    arrayName[N]{field1,field2}:\n"
        "      val1,val2\n"
        "      val3,val4\n"
        "- [N] MUST equal actual row/item count\n"
        "- Output ONLY a ```toon code block\n\n"
        "Reference example:\n"
        "```toon\n"
        "id: 100\n"
        "type: Sample\n"
        "metadata:\n"
        "  version: 1\n"
        "  author: Alex\n"
        "sections[2]:\n"
        "  - code: A\n"
        "    title: Introduction\n"
        "    items[2]{id,value}:\n"
        "      1,First\n"
        "      2,Second\n"
        "  - code: B\n"
        "    title: Details\n"
        "    items[1]{id,value}:\n"
        "      3,Third\n"
        "summary:\n"
        "  total: 3\n"
        "  status: complete\n"
        "```\n\n"
        "TASK:\n"
        "Create an invoice with all invoice details including items array and totals breakdown:\n"
        "- Invoice number: INV-2025-001\n"
        "- Currency: USD\n"
        "- Customer: Ada (ID: 9)\n"
        "- Line items:\n"
        "  * A1: quantity 2 @ $9.99 each = $19.98\n"
        "  * B2: quantity 1 @ $14.50 each = $14.50\n"
        "- Subtotal: $34.48\n"
        "- Tax: $6.90\n"
        "- Grand total: $41.38\n"
        "- Notes: Thank you for your business.\n"
    )
# =========================================
# Repair prompts
# =========================================
def make_json_repair_prompt(prev_output: str, error_msg: str) -> str:
    return (
        "Your previous JSON did not validate against the schema. "
        "Return ONLY valid JSON (no prose, no fences) that matches the schema and the target values.\n"
        f"Validation error:\n{error_msg}\n\n"
        "Previous output:\n"
        f"{prev_output}\n"
    )

def make_toon_repair_prompt(prev_output: str, error_msg: str) -> str:
    return (
        "Your previous TOON was invalid. Return ONLY a ```toon fenced block.\n"
        "- Use 2-space indentation; no trailing spaces.\n"
        "- Ensure headers/fieldsets and [N] match row counts.\n"
        f"Validation/decoding error:\n{error_msg}\n\n"
        "Previous output:\n"
        f"{prev_output}\n"
    )

# =========================================
# Core evaluation (one-shot + ≤9 repairs)
# =========================================
MAX_ATTEMPTS = 3

def eval_json_track(
    model: str,
    make_prompt_fn,
    schema_model: Type[BaseModel],
    validate_fn,
    gold_obj,
    canon_case: str,
):
    tokens_p = tokens_c = 0
    prompt = make_prompt_fn()
    out, p, c = llm_call_json_structured(model, prompt, schema_model); tokens_p += p; tokens_c += c
    try:
        parsed = json.loads(out)
        # print(f"JSON SO parsed: {parsed}")
        validate_fn(parsed)  # Pydantic
        parsed = canonical_json(normalize_by_key(parsed, canon_case), canon_case)
        one_shot_ok = final_ok = (parsed == gold_obj)
        if final_ok:
            return dict(one_shot_ok=True, final_ok=True, attempts_used=1,
                        tokens_prompt=tokens_p, tokens_completion=tokens_c)
    except Exception as e:
        err = str(e); one_shot_ok = False; prev = out
    else:
        err = "Structure valid but values differ from expected gold."; prev = out

    for i in range(1, MAX_ATTEMPTS):
        repair_prompt = make_json_repair_prompt(prev, err)
        out, p, c = llm_call_json_structured(model, repair_prompt, schema_model); tokens_p += p; tokens_c += c
        try:
            parsed = json.loads(out)
            validate_fn(parsed)
            parsed = canonical_json(normalize_by_key(parsed, canon_case), canon_case)
            final_ok = (parsed == gold_obj)
            if final_ok:
                return dict(one_shot_ok=one_shot_ok, final_ok=True, attempts_used=i+1,
                            tokens_prompt=tokens_p, tokens_completion=tokens_c)
            else:
                err = "Structure valid but values differ from expected gold."
                prev = out
        except Exception as e:
            err = str(e); prev = out
            continue

    return dict(one_shot_ok=one_shot_ok, final_ok=False, attempts_used=MAX_ATTEMPTS,
                tokens_prompt=tokens_p, tokens_completion=tokens_c)

def eval_json_plain_track(
    model: str,
    make_prompt_fn,
    schema_model: Type[BaseModel],
    validate_fn,
    gold_obj,
    canon_case: str,
):
    """Evaluate JSON generation without response_format (plain completion)."""
    tokens_p = tokens_c = 0
    prompt = make_prompt_fn()
    out, p, c = llm_call_json_plain(model, prompt, schema_model); tokens_p += p; tokens_c += c
    try:
        parsed = json.loads(out)
        # print(f"JSON plain parsed: {parsed}")
        validate_fn(parsed)  # Pydantic
        parsed = canonical_json(normalize_by_key(parsed, canon_case), canon_case)
        one_shot_ok = final_ok = (parsed == gold_obj)
        if final_ok:
            return dict(one_shot_ok=True, final_ok=True, attempts_used=1,
                        tokens_prompt=tokens_p, tokens_completion=tokens_c)
    except Exception as e:
        err = str(e); one_shot_ok = False; prev = out
    else:
        err = "Structure valid but values differ from expected gold."; prev = out

    for i in range(1, MAX_ATTEMPTS):
        repair_prompt = make_json_repair_prompt(prev, err)
        out, p, c = llm_call_json_plain(model, repair_prompt, schema_model); tokens_p += p; tokens_c += c
        try:
            parsed = json.loads(out)
            validate_fn(parsed)
            parsed = canonical_json(normalize_by_key(parsed, canon_case), canon_case)
            final_ok = (parsed == gold_obj)
            if final_ok:
                return dict(one_shot_ok=one_shot_ok, final_ok=True, attempts_used=i+1,
                            tokens_prompt=tokens_p, tokens_completion=tokens_c)
            else:
                err = "Structure valid but values differ from expected gold."
                prev = out
        except Exception as e:
            err = str(e); prev = out
            continue

    return dict(one_shot_ok=one_shot_ok, final_ok=False, attempts_used=MAX_ATTEMPTS,
                tokens_prompt=tokens_p, tokens_completion=tokens_c)

def eval_toon_track(model: str, make_prompt_fn, validate_fn, gold_obj, canon_case: str):
    tokens_p = tokens_c = 0
    prompt = make_prompt_fn()
    out, p, c = llm_call_plain(model, prompt); tokens_p += p; tokens_c += c
    try:
        decoded = decode_toon_to_json(out)
        # print(f"TOON decoded: {decoded}")
        validate_fn(decoded)
        decoded = canonical_json(normalize_by_key(decoded, canon_case), canon_case)
        one_shot_ok = final_ok = (decoded == gold_obj)
        if final_ok:
            return dict(one_shot_ok=True, final_ok=True, attempts_used=1,
                        tokens_prompt=tokens_p, tokens_completion=tokens_c)
    except Exception as e:
        err = str(e); one_shot_ok = False; prev = out
    else:
        err = "Structure valid but values differ from expected gold."; prev = out

    for i in range(1, MAX_ATTEMPTS):
        repair_prompt = make_toon_repair_prompt(prev, err)
        out, p, c = llm_call_plain(model, repair_prompt); tokens_p += p; tokens_c += c
        try:
            decoded = decode_toon_to_json(out)
            validate_fn(decoded)
            decoded = canonical_json(normalize_by_key(decoded, canon_case), canon_case)
            final_ok = (decoded == gold_obj)
            if final_ok:
                return dict(one_shot_ok=one_shot_ok, final_ok=True, attempts_used=i+1,
                            tokens_prompt=tokens_p, tokens_completion=tokens_c)
            else:
                err = "Structure valid but values differ from expected gold."
                prev = out
        except Exception as e:
            err = str(e); prev = out
            continue

    return dict(one_shot_ok=one_shot_ok, final_ok=False, attempts_used=MAX_ATTEMPTS,
                tokens_prompt=tokens_p, tokens_completion=tokens_c)

# =========================================
# Case runners aggregating metrics
# =========================================
def run_case_users(model: str):
    gold = json.loads(USERS_JSON.read_text(encoding="utf-8"))
    gold = canonical_json(gold, "users")
    jm = eval_json_track(model, make_json_prompt_users, UsersPayload, validate_users_json, gold, "users")
    jpm = eval_json_plain_track(model, make_json_prompt_users, UsersPayload, validate_users_json, gold, "users")
    tm = eval_toon_track(model, make_toon_prompt_users, validate_users_json, gold, "users")
    return {
        "users_json_one_shot": jm["one_shot_ok"], "users_json_final": jm["final_ok"],
        "users_json_attempts": jm["attempts_used"],
        "users_json_tokens_prompt": jm["tokens_prompt"], "users_json_tokens_completion": jm["tokens_completion"],
        "users_json_plain_one_shot": jpm["one_shot_ok"], "users_json_plain_final": jpm["final_ok"],
        "users_json_plain_attempts": jpm["attempts_used"],
        "users_json_plain_tokens_prompt": jpm["tokens_prompt"], "users_json_plain_tokens_completion": jpm["tokens_completion"],
        "users_toon_one_shot": tm["one_shot_ok"], "users_toon_final": tm["final_ok"],
        "users_toon_attempts": tm["attempts_used"],
        "users_toon_tokens_prompt": tm["tokens_prompt"], "users_toon_tokens_completion": tm["tokens_completion"],
    }

def run_case_order(model: str):
    gold = json.loads(ORDER_JSON.read_text(encoding="utf-8"))
    gold = canonical_json(gold, "order")
    jm = eval_json_track(model, make_json_prompt_order, Order, validate_order_json, gold, "order")
    jpm = eval_json_plain_track(model, make_json_prompt_order, Order, validate_order_json, gold, "order")
    tm = eval_toon_track(model, make_toon_prompt_order, validate_order_json, gold, "order")
    return {
        "order_json_one_shot": jm["one_shot_ok"], "order_json_final": jm["final_ok"],
        "order_json_attempts": jm["attempts_used"],
        "order_json_tokens_prompt": jm["tokens_prompt"], "order_json_tokens_completion": jm["tokens_completion"],
        "order_json_plain_one_shot": jpm["one_shot_ok"], "order_json_plain_final": jpm["final_ok"],
        "order_json_plain_attempts": jpm["attempts_used"],
        "order_json_plain_tokens_prompt": jpm["tokens_prompt"], "order_json_plain_tokens_completion": jpm["tokens_completion"],
        "order_toon_one_shot": tm["one_shot_ok"], "order_toon_final": tm["final_ok"],
        "order_toon_attempts": tm["attempts_used"],
        "order_toon_tokens_prompt": tm["tokens_prompt"], "order_toon_tokens_completion": tm["tokens_completion"],
    }

def run_case_company(model: str):
    gold = json.loads(COMPANY_JSON.read_text(encoding="utf-8"))
    gold = canonical_json(gold, "company")
    jm = eval_json_track(model, make_json_prompt_company, Company, validate_company_json, gold, "company")
    jpm = eval_json_plain_track(model, make_json_prompt_company, Company, validate_company_json, gold, "company")
    tm = eval_toon_track(model, make_toon_prompt_company, validate_company_json, gold, "company")
    return {
        "company_json_one_shot": jm["one_shot_ok"], "company_json_final": jm["final_ok"],
        "company_json_attempts": jm["attempts_used"],
        "company_json_tokens_prompt": jm["tokens_prompt"], "company_json_tokens_completion": jm["tokens_completion"],
        "company_json_plain_one_shot": jpm["one_shot_ok"], "company_json_plain_final": jpm["final_ok"],
        "company_json_plain_attempts": jpm["attempts_used"],
        "company_json_plain_tokens_prompt": jpm["tokens_prompt"], "company_json_plain_tokens_completion": jpm["tokens_completion"],
        "company_toon_one_shot": tm["one_shot_ok"], "company_toon_final": tm["final_ok"],
        "company_toon_attempts": tm["attempts_used"],
        "company_toon_tokens_prompt": tm["tokens_prompt"], "company_toon_tokens_completion": tm["tokens_completion"],
    }

def run_case_invoice(model: str):
    gold = json.loads(INVOICE_JSON.read_text(encoding="utf-8"))
    gold = canonical_json(gold, "invoice")
    jm = eval_json_track(model, make_json_prompt_invoice, Invoice, validate_invoice_json, gold, "invoice")
    jpm = eval_json_plain_track(model, make_json_prompt_invoice, Invoice, validate_invoice_json, gold, "invoice")
    tm = eval_toon_track(model, make_toon_prompt_invoice, validate_invoice_json, gold, "invoice")
    return {
        "invoice_json_one_shot": jm["one_shot_ok"], "invoice_json_final": jm["final_ok"],
        "invoice_json_attempts": jm["attempts_used"],
        "invoice_json_tokens_prompt": jm["tokens_prompt"], "invoice_json_tokens_completion": jm["tokens_completion"],
        "invoice_json_plain_one_shot": jpm["one_shot_ok"], "invoice_json_plain_final": jpm["final_ok"],
        "invoice_json_plain_attempts": jpm["attempts_used"],
        "invoice_json_plain_tokens_prompt": jpm["tokens_prompt"], "invoice_json_plain_tokens_completion": jpm["tokens_completion"],
        "invoice_toon_one_shot": tm["one_shot_ok"], "invoice_toon_final": tm["final_ok"],
        "invoice_toon_attempts": tm["attempts_used"],
        "invoice_toon_tokens_prompt": tm["tokens_prompt"], "invoice_toon_tokens_completion": tm["tokens_completion"],
    }

# =========================================
# Summary helpers
# =========================================
def summarize_formats(results: Dict[str, Any]) -> Dict[str, Any]:
    cases = ["users", "order", "company", "invoice"]
    summary = {}
    for fmt in ["json", "json_plain", "toon"]:
        one_shot_hits = sum(1 for case in cases if results.get(f"{case}_{fmt}_one_shot"))
        final_hits    = sum(1 for case in cases if results.get(f"{case}_{fmt}_final"))
        n = len(cases)
        prompt_tokens = sum(results.get(f"{case}_{fmt}_tokens_prompt", 0) for case in cases)
        comp_tokens   = sum(results.get(f"{case}_{fmt}_tokens_completion", 0) for case in cases)
        summary[f"{fmt}_one_shot_accuracy"] = one_shot_hits / n if n else 0.0
        summary[f"{fmt}_final_accuracy"]    = final_hits / n if n else 0.0
        summary[f"{fmt}_prompt_tokens"]     = prompt_tokens
        summary[f"{fmt}_completion_tokens"] = comp_tokens
        summary[f"{fmt}_total_tokens"]      = prompt_tokens + comp_tokens
    summary["overall_prompt_tokens"]     = summary["json_prompt_tokens"] + summary["json_plain_prompt_tokens"] + summary["toon_prompt_tokens"]
    summary["overall_completion_tokens"] = summary["json_completion_tokens"] + summary["json_plain_completion_tokens"] + summary["toon_completion_tokens"]
    summary["overall_total_tokens"]      = summary["json_total_tokens"] + summary["json_plain_total_tokens"] + summary["toon_total_tokens"]
    return summary

def flatten_for_csv(model: str, run_idx: int, results: Dict[str, Any]) -> Dict[str, Any]:
    row = {"model": model, "run": run_idx}
    for case in ["users", "order", "company", "invoice"]:
        for fmt in ["json", "json_plain", "toon"]:
            row[f"{case}_{fmt}_one_shot"] = results.get(f"{case}_{fmt}_one_shot", False)
            row[f"{case}_{fmt}_final"]    = results.get(f"{case}_{fmt}_final", False)
            row[f"{case}_{fmt}_attempts"] = results.get(f"{case}_{fmt}_attempts", 0)
            row[f"{case}_{fmt}_prompt_tokens"] = results.get(f"{case}_{fmt}_tokens_prompt", 0)
            row[f"{case}_{fmt}_completion_tokens"] = results.get(f"{case}_{fmt}_tokens_completion", 0)
    summary = summarize_formats(results)
    row.update({
        "json_one_shot_accuracy": summary["json_one_shot_accuracy"],
        "json_final_accuracy":    summary["json_final_accuracy"],
        "json_prompt_tokens":     summary["json_prompt_tokens"],
        "json_completion_tokens": summary["json_completion_tokens"],
        "json_total_tokens":      summary["json_total_tokens"],
        "json_plain_one_shot_accuracy": summary["json_plain_one_shot_accuracy"],
        "json_plain_final_accuracy":    summary["json_plain_final_accuracy"],
        "json_plain_prompt_tokens":     summary["json_plain_prompt_tokens"],
        "json_plain_completion_tokens": summary["json_plain_completion_tokens"],
        "json_plain_total_tokens":      summary["json_plain_total_tokens"],
        "toon_one_shot_accuracy": summary["toon_one_shot_accuracy"],
        "toon_final_accuracy":    summary["toon_final_accuracy"],
        "toon_prompt_tokens":     summary["toon_prompt_tokens"],
        "toon_completion_tokens": summary["toon_completion_tokens"],
        "toon_total_tokens":      summary["toon_total_tokens"],
        "overall_prompt_tokens":  summary["overall_prompt_tokens"],
        "overall_completion_tokens": summary["overall_completion_tokens"],
        "overall_total_tokens":   summary["overall_total_tokens"],
    })
    return row

# =========================================
# Main (iterate models × runs, write CSV)
# =========================================
if __name__ == "__main__":
    header_fields = ["model", "run"]
    for case in ["users", "order", "company", "invoice"]:
        for fmt in ["json", "json_plain", "toon"]:
            header_fields += [
                f"{case}_{fmt}_one_shot",
                f"{case}_{fmt}_final",
                f"{case}_{fmt}_attempts",
                f"{case}_{fmt}_prompt_tokens",
                f"{case}_{fmt}_completion_tokens",
            ]
    header_fields += [
        "json_one_shot_accuracy","json_final_accuracy",
        "json_prompt_tokens","json_completion_tokens","json_total_tokens",
        "json_plain_one_shot_accuracy","json_plain_final_accuracy",
        "json_plain_prompt_tokens","json_plain_completion_tokens","json_plain_total_tokens",
        "toon_one_shot_accuracy","toon_final_accuracy",
        "toon_prompt_tokens","toon_completion_tokens","toon_total_tokens",
        "overall_prompt_tokens","overall_completion_tokens","overall_total_tokens",
    ]

    write_header = not CSV_PATH.exists()
    with CSV_PATH.open("a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=header_fields)
        if write_header:
            writer.writeheader()

        for model in MODELS:
            print(f"Processing {model}...")
            for run_idx in range(1, RUNS_PER_MODEL + 1):
                print(f"Run {run_idx}...")
                results: Dict[str, Any] = {}
                results.update(run_case_users(model))
                print("Users done")
                results.update(run_case_order(model))
                print("Order done")
                results.update(run_case_company(model))
                print("Company done")
                results.update(run_case_invoice(model))
                print("Invoice done")
                row = flatten_for_csv(model, run_idx, results)
                writer.writerow(row)

    print(f"Wrote per-run stats to {CSV_PATH.resolve()}")