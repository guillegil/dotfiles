// lib/calc.ts — safe arithmetic evaluator for the launcher calculator banner.
//
// Exports:
//   CalcResult  { value: number; expr: string; label?: string }
//   evaluate(input: string): CalcResult | null
//   getLabel(result: number): string | null
//
// Implements a recursive-descent parser for the grammar:
//   expr   := term   (('+' | '-') term)*
//   term   := power  (('*' | '/' | '%') power)*
//   power  := unary  ('^' unary)*       — right-associative
//   unary  := ('-' | '+')? primary
//   primary:= NUMBER | CONSTANT | FUNC '(' expr ')' | '(' expr ')'
//
// NEVER uses eval() or new Function. Total (never throws to caller).

export type CalcResult = {
  value: number
  expr: string
  label?: string
}

// ── Constants table ─────────────────────────────────────────────────────────

const PHI = (1 + Math.sqrt(5)) / 2

const CONSTANTS: Record<string, { value: number; label: string }> = {
  pi:    { value: Math.PI,    label: "pi" },
  "π":   { value: Math.PI,    label: "pi" },
  e:     { value: Math.E,     label: "e" },
  phi:   { value: PHI,        label: "golden ratio" },
  "φ":   { value: PHI,        label: "golden ratio" },
  tau:   { value: 2 * Math.PI, label: "tau" },
  "τ":   { value: 2 * Math.PI, label: "tau" },
  sqrt2: { value: Math.SQRT2, label: "sqrt 2" },
}

// ── Functions table (1-arg) ─────────────────────────────────────────────────

const FUNCTIONS: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt,
  sin:  Math.sin,
  cos:  Math.cos,
  tan:  Math.tan,
  ln:   Math.log,
  log:  Math.log10,
  abs:  Math.abs,
}

// ── Label lookup (REQ-CL-03) ────────────────────────────────────────────────

const EPSILON = 1e-9

export function getLabel(result: number): string | null {
  for (const entry of Object.values(CONSTANTS)) {
    if (Math.abs(result - entry.value) < EPSILON) return entry.label
  }
  return null
}

// ── Tokenizer ───────────────────────────────────────────────────────────────

type Token =
  | { type: "number"; value: number }
  | { type: "ident"; name: string }
  | { type: "op"; ch: string }
  | { type: "lparen" }
  | { type: "rparen" }

function tokenize(input: string): Token[] | null {
  const tokens: Token[] = []
  let i = 0
  const s = input.trim()

  while (i < s.length) {
    const ch = s[i]

    // skip whitespace
    if (ch === " " || ch === "\t") { i++; continue }

    // number: digits (with optional decimal point)
    if (ch >= "0" && ch <= "9" || ch === ".") {
      let raw = ""
      while (i < s.length && (s[i] >= "0" && s[i] <= "9" || s[i] === ".")) {
        raw += s[i++]
      }
      const num = parseFloat(raw)
      if (isNaN(num)) return null
      tokens.push({ type: "number", value: num })
      continue
    }

    // identifier: letter / underscore / Greek letters / sqrt2
    if (/[a-zA-Zπφτ_]/.test(ch)) {
      let name = ""
      while (i < s.length && /[a-zA-Z0-9πφτ_]/.test(s[i])) {
        name += s[i++]
      }
      tokens.push({ type: "ident", name })
      continue
    }

    // operators and parens
    if ("+-*/%^".includes(ch)) { tokens.push({ type: "op", ch }); i++; continue }
    if (ch === "(") { tokens.push({ type: "lparen" }); i++; continue }
    if (ch === ")") { tokens.push({ type: "rparen" }); i++; continue }

    // unknown character — not a math expression
    return null
  }

  return tokens
}

// ── Parser (recursive descent) ──────────────────────────────────────────────

class Parser {
  private tokens: Token[]
  private pos: number

  constructor(tokens: Token[]) {
    this.tokens = tokens
    this.pos = 0
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos]
  }

  private consume(): Token {
    return this.tokens[this.pos++]
  }

  private isOp(ch: string): boolean {
    const t = this.peek()
    return t?.type === "op" && t.ch === ch
  }

  parse(): number {
    const val = this.parseExpr()
    if (this.pos !== this.tokens.length) throw new Error("trailing tokens")
    return val
  }

  private parseExpr(): number {
    let left = this.parseTerm()
    while (true) {
      if (this.isOp("+")) { this.consume(); left += this.parseTerm() }
      else if (this.isOp("-")) { this.consume(); left -= this.parseTerm() }
      else break
    }
    return left
  }

  private parseTerm(): number {
    let left = this.parsePower()
    while (true) {
      if (this.isOp("*")) { this.consume(); left *= this.parsePower() }
      else if (this.isOp("/")) { this.consume(); left /= this.parsePower() }
      else if (this.isOp("%")) { this.consume(); left %= this.parsePower() }
      else break
    }
    return left
  }

  // right-associative exponentiation
  private parsePower(): number {
    const base = this.parseUnary()
    if (this.isOp("^")) {
      this.consume()
      const exp = this.parsePower()  // right-associative: recurse
      return Math.pow(base, exp)
    }
    return base
  }

  private parseUnary(): number {
    if (this.isOp("-")) { this.consume(); return -this.parsePrimary() }
    if (this.isOp("+")) { this.consume(); return this.parsePrimary() }
    return this.parsePrimary()
  }

  private parsePrimary(): number {
    const t = this.peek()
    if (!t) throw new Error("unexpected end")

    // number literal
    if (t.type === "number") {
      this.consume()
      return t.value
    }

    // identifier: constant or function call
    if (t.type === "ident") {
      this.consume()
      const name = t.name

      // function call
      if (name in FUNCTIONS) {
        const next = this.peek()
        if (!next || next.type !== "lparen") throw new Error(`expected ( after ${name}`)
        this.consume()  // consume '('
        const arg = this.parseExpr()
        const close = this.peek()
        if (!close || close.type !== "rparen") throw new Error("expected )")
        this.consume()  // consume ')'
        return FUNCTIONS[name](arg)
      }

      // constant
      if (name in CONSTANTS) return CONSTANTS[name].value

      throw new Error(`unknown identifier: ${name}`)
    }

    // parenthesised sub-expression
    if (t.type === "lparen") {
      this.consume()
      const val = this.parseExpr()
      const close = this.peek()
      if (!close || close.type !== "rparen") throw new Error("expected )")
      this.consume()
      return val
    }

    throw new Error(`unexpected token: ${JSON.stringify(t)}`)
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Evaluate an arithmetic expression string.
 * Returns a CalcResult on success, or null for any failure.
 * NEVER throws — the entire pipeline is wrapped in try/catch.
 */
export function evaluate(input: string): CalcResult | null {
  try {
    const trimmed = input.trim()
    if (!trimmed) return null

    const tokens = tokenize(trimmed)
    if (!tokens || tokens.length === 0) return null

    const value = new Parser(tokens).parse()

    if (!isFinite(value) || isNaN(value)) return null

    // Determine label: only when the full input is a single named constant.
    let label: string | undefined
    const single = tokens.length === 1 && tokens[0].type === "ident"
    if (single) {
      const name = (tokens[0] as { type: "ident"; name: string }).name
      label = CONSTANTS[name]?.label
    }

    return { value, expr: trimmed, label }
  } catch {
    return null
  }
}
