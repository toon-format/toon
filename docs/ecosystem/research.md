---
description: Peer-reviewed papers and preprints that study TOON.
---

# Research

These papers study TOON as model input, as model output, and as fine-tuning data. To add one, open a pull request that edits [this page](https://github.com/toon-format/toon/blob/main/docs/ecosystem/research.md).

- **[Fine-TOONing: A Large-Scale Instruction-Tuning Dataset for Structured Output Generation in TOON Format](https://doi.org/10.1007/978-3-032-37667-1_6)** – G. M. Orlando, M. Perillo, D. Russo, V. La Gatta, V. Moscato. *ECML PKDD*, 2026. Releases a [dataset of 10,000 prompt–response pairs](https://doi.org/10.57967/hf/7854) for TOON generation. Fine-tuning on it raises the StructEval score (0 to 1) for zero-shot TOON generation from 0.08 to 0.38 on Gemma 3 4B and from 0.35 to 0.43 on Qwen 3 4B. Its system prompt teaches spec v3, including key folding, which [v4 removed](/guide/whats-new-in-v4#removed-key-folding).
- **[A Comprehensive Empirical Evaluation of Token-Oriented Object Notation (TOON) for Large Language Model Applications](https://doi.org/10.1109/ACCESS.2026.3707409)** – K. Ahaidous, L. Aarif, J. Schopplich, M. Tabaa, H. Hachimi. *IEEE Access*, 2026. Compares TOON as model input with JSON, compact JSON, YAML, XML, and CSV across 4 models and 7 tokenizers. TOON uses 39.6% fewer tokens than JSON and reaches 73.9% accuracy against JSON's 69.7%, while compact JSON is smaller on nested, non-uniform data.
- **[Are LLMs Ready for TOON? Benchmarking Structural Correctness–Sustainability Trade-offs in Novel Structured Output Formats](https://arxiv.org/abs/2601.12014)** – E. Masciari, V. Moscato, E. V. Napolitano, G. M. Orlando, M. Perillo, D. Russo. arXiv preprint, 2026. Benchmarks TOON output against JSON, XML, and YAML on 8 open models, with a prompt that describes the spec. TOON output is shorter but less often structurally correct, a gap that narrows as models grow and is no longer significant on Llama 3.3 70B.
