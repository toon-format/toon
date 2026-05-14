import sys
import json
import argparse
from transformers import AutoTokenizer

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', required=True, help='HuggingFace model name')
    args = parser.parse_args()

    input_data = json.loads(sys.stdin.read())
    text = input_data["text"]

    tokenizer = AutoTokenizer.from_pretrained(args.model, use_fast=True)
    tokens = tokenizer.encode(text)

    result = {
        "tokenizer": args.model,
        "count": len(tokens)
    }

    print(json.dumps(result))

if __name__ == "__main__":
    main()