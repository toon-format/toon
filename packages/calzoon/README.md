# @calzoon/core

**Compressed Algorithm Layout Zone for Optimized Object Notation**

A hybrid format combining [TOON](https://toonformat.dev)'s token-efficient data encoding with CALZONE's symbolic plan compression.

## 🎯 What is CALZOON?

CALZOON provides three modes in one unified format:

1. **Data Mode** (TOON-compatible) - Token-efficient JSON encoding
2. **Plan Mode** (CALZONE-compatible) - Symbolic plan compression
3. **Hybrid Mode** (CALZOON unique) - Mixed data and plans

## 🚀 Installation

```bash
npm install @calzoon/core
```

## 📖 Quick Start

```typescript
import { encode, decode, detectMode } from '@calzoon/core'

// Data mode (automatic)
const data = {
  users: [
    { id: 1, name: 'Alice', role: 'admin' },
    { id: 2, name: 'Bob', role: 'user' }
  ]
}
const encoded = encode(data)
// users[2]{id,name,role}:
//   1,Alice,admin
//   2,Bob,user

// Decode back
const decoded = decode(encoded)
// { users: [{ id: 1, name: 'Alice', role: 'admin' }, ...] }

// Check mode
const mode = detectMode(encoded)
// { mode: 'data', confidence: 0.8, indicators: {...} }
```

## 📚 Documentation

- **[Full Documentation](../../CALZOON-README.md)** - Complete guide
- **[Specification](../../CALZOON-SPEC.md)** - Technical specification
- **[Examples](../../examples/)** - Real-world examples

## 🔄 Three Modes

### Data Mode
Pure data encoding using TOON syntax:
```
employees[2]{id,name,dept}:
  1,Alice,Engineering
  2,Bob,Sales
```

### Plan Mode
Symbolic plan notation:
```
§1 AUTH_FLOW
¶ Flow
login → validate → [✓] dashboard
                 → [×] show_error
```

### Hybrid Mode
Combined data and plans:
```
§1 DEPLOYMENT

¶ Servers
servers[3]{id,region,status}:
  srv-01,us-east,active
  srv-02,eu-west,active
  srv-03,ap-south,pending

¶ Flow
provision → configure → deploy → verify
```

## 🎨 Key Features

- **40-85% token reduction** vs verbose formats
- **Lossless bidirectional translation**
- **LLM-friendly structure**
- **Three modes, one format**
- **Backward compatible** with TOON and CALZONE

## 📄 License

MIT License - See [LICENSE](../../LICENSE) for details

---

**Made with 🍕+📊 by blending CALZONE and TOON**
