# generate.py
from typing import List, Literal, Optional
import json
import subprocess
from pathlib import Path
from pydantic import BaseModel, ConfigDict, Field

# ---------- Pydantic models (simple) ----------
class UserRow(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    id: int
    name: str = Field(min_length=1)
    role: Literal['admin', 'staff', 'guest']

class Customer(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    id: int
    name: str

class OrderItem(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    sku: str
    qty: int
    price: float

class Order(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    id: int
    customer: Customer
    items: List[OrderItem]


# ---------- Pydantic models (more complex #1: company) ----------
class Employee(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    id: int
    name: str
    title: Literal['engineer', 'manager', 'analyst']

class Department(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    code: str
    name: str
    employees: List[Employee]

class Company(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    id: int
    name: str
    departments: List[Department]


# ---------- Pydantic models (more complex #2: invoice) ----------
class InvoiceLine(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    sku: str
    qty: int
    unit_price: float
    line_total: float  # keep explicit to avoid computed logic here

class Totals(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    subtotal: float
    tax: float
    grand_total: float

class Invoice(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    number: str
    currency: Literal['USD', 'EUR', 'SAR']
    customer: Customer
    items: List[InvoiceLine]
    totals: Totals
    notes: Optional[str] = None


# ---------- Create gold Python objects ----------
# 1) Tabular users
users = [
    UserRow(id=1, name="Alice", role="admin"),
    UserRow(id=2, name="Bob",   role="staff"),
    UserRow(id=3, name="Eve",   role="guest"),
]
users_gold = {"users": [u.model_dump() for u in users]}

# 2) Nested order
order_gold = Order(
    id=101,
    customer=Customer(id=9, name="Ada"),
    items=[
        OrderItem(sku="A1", qty=2, price=9.99),
        OrderItem(sku="B2", qty=1, price=14.50),
    ],
).model_dump()

# 3) More complex: company with nested tabular arrays
company_gold = Company(
    id=1,
    name="Acme",
    departments=[
        Department(
            code="ENG",
            name="Engineering",
            employees=[
                Employee(id=1, name="Alice", title="engineer"),
                Employee(id=2, name="Bob",   title="manager"),
            ],
        ),
        Department(
            code="OPS",
            name="Operations",
            employees=[
                Employee(id=3, name="Eve", title="analyst"),
            ],
        ),
    ],
).model_dump()

# 4) More complex: invoice with nested objects + tabular line items
invoice_gold = Invoice(
    number="INV-2025-001",
    currency="USD",
    customer=Customer(id=9, name="Ada"),
    items=[
        InvoiceLine(sku="A1", qty=2, unit_price=9.99, line_total=19.98),
        InvoiceLine(sku="B2", qty=1, unit_price=14.50, line_total=14.50),
    ],
    totals=Totals(subtotal=34.48, tax=6.90, grand_total=41.38),
    notes="Thank you for your business.",
).model_dump()


# ---------- Write gold JSON to disk ----------
outdir = Path("gold")
outdir.mkdir(exist_ok=True)

def write_json(path: Path, obj) -> None:
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

users_json_path   = outdir / "users.gold.json"
order_json_path   = outdir / "order.gold.json"
company_json_path = outdir / "company.gold.json"
invoice_json_path = outdir / "invoice.gold.json"

write_json(users_json_path, users_gold)
write_json(order_json_path, order_gold)
write_json(company_json_path, company_gold)
write_json(invoice_json_path, invoice_gold)


# ---------- Use TOON CLI via npx to encode JSON -> TOON ----------
def encode_to_toon(json_path: Path, toon_path: Path) -> None:
    subprocess.run(
        ["npx", "@toon-format/cli", str(json_path), "-o", str(toon_path)],
        check=True,
    )

encode_to_toon(users_json_path,   outdir / "users.gold.toon")
encode_to_toon(order_json_path,   outdir / "order.gold.toon")
encode_to_toon(company_json_path, outdir / "company.gold.toon")
encode_to_toon(invoice_json_path, outdir / "invoice.gold.toon")

print("Wrote:")
for p in [users_json_path, outdir / "users.gold.toon",
          order_json_path, outdir / "order.gold.toon",
          company_json_path, outdir / "company.gold.toon",
          invoice_json_path, outdir / "invoice.gold.toon"]:
    print(f"  {p}")
