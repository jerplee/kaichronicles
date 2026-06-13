/**
 * Safe mathematical expression evaluator.
 * Replaces eval() for mechanics expressions.
 * Supports numbers, + - * / %, comparisons, &&, ||, and parentheses.
 */

export function safeMathEvaluate(expression: string): any {
    if (!expression || expression.trim() === "") {
        return null;
    }
    const tokens = tokenize(expression);
    const parser = new Parser(tokens);
    return parser.parseExpression();
}

enum TokenType {
    Number,
    Plus, Minus, Multiply, Divide, Modulo,
    LessThan, GreaterThan, LessThanOrEqual, GreaterThanOrEqual,
    Equal, NotEqual, StrictEqual, StrictNotEqual,
    And, Or,
    Question, Colon,
    LParen, RParen,
    EOF
}

interface Token {
    type: TokenType;
    value?: number;
}

function tokenize(expr: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    while (i < expr.length) {
        const ch = expr[i];
        if (/\s/.test(ch)) {
            i++;
            continue;
        }
        if (/\d/.test(ch) || (ch === "." && /\d/.test(expr[i + 1]))) {
            let numStr = "";
            while (i < expr.length && (/\d/.test(expr[i]) || expr[i] === ".")) {
                numStr += expr[i];
                i++;
            }
            tokens.push({ type: TokenType.Number, value: parseFloat(numStr) });
            continue;
        }
        if (ch === "+") { tokens.push({ type: TokenType.Plus }); i++; continue; }
        if (ch === "-") { tokens.push({ type: TokenType.Minus }); i++; continue; }
        if (ch === "*") { tokens.push({ type: TokenType.Multiply }); i++; continue; }
        if (ch === "/") { tokens.push({ type: TokenType.Divide }); i++; continue; }
        if (ch === "%") { tokens.push({ type: TokenType.Modulo }); i++; continue; }
        if (ch === "(") { tokens.push({ type: TokenType.LParen }); i++; continue; }
        if (ch === ")") { tokens.push({ type: TokenType.RParen }); i++; continue; }
        if (ch === "<") {
            if (expr[i + 1] === "=") { tokens.push({ type: TokenType.LessThanOrEqual }); i += 2; }
            else { tokens.push({ type: TokenType.LessThan }); i++; }
            continue;
        }
        if (ch === ">") {
            if (expr[i + 1] === "=") { tokens.push({ type: TokenType.GreaterThanOrEqual }); i += 2; }
            else { tokens.push({ type: TokenType.GreaterThan }); i++; }
            continue;
        }
        if (ch === "=") {
            if (expr[i + 1] === "=") {
                if (expr[i + 2] === "=") { tokens.push({ type: TokenType.StrictEqual }); i += 3; }
                else { tokens.push({ type: TokenType.Equal }); i += 2; }
            } else {
                throw new Error("Unexpected token: " + ch);
            }
            continue;
        }
        if (ch === "!") {
            if (expr[i + 1] === "=") {
                if (expr[i + 2] === "=") { tokens.push({ type: TokenType.StrictNotEqual }); i += 3; }
                else { tokens.push({ type: TokenType.NotEqual }); i += 2; }
            } else {
                throw new Error("Unexpected token: " + ch);
            }
            continue;
        }
        if (ch === "&") {
            if (expr[i + 1] === "&") { tokens.push({ type: TokenType.And }); i += 2; }
            else { throw new Error("Unexpected token: " + ch); }
            continue;
        }
        if (ch === "|") {
            if (expr[i + 1] === "|") { tokens.push({ type: TokenType.Or }); i += 2; }
            else { throw new Error("Unexpected token: " + ch); }
            continue;
        }
        if (ch === "?") { tokens.push({ type: TokenType.Question }); i++; continue; }
        if (ch === ":") { tokens.push({ type: TokenType.Colon }); i++; continue; }
        throw new Error("Unexpected character: " + ch);
    }
    tokens.push({ type: TokenType.EOF });
    return tokens;
}

class Parser {
    private tokens: Token[];
    private pos = 0;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    private current(): Token {
        return this.tokens[this.pos];
    }

    private eat(type: TokenType): Token {
        const token = this.current();
        if (token.type !== type) {
            throw new Error("Expected token " + type + " but got " + token.type);
        }
        this.pos++;
        return token;
    }

    parseExpression(): any {
        return this.parseTernary();
    }

    private parseTernary(): any {
        const condition = this.parseOr();
        if (this.current().type === TokenType.Question) {
            this.eat(TokenType.Question);
            const trueValue = this.parseTernary();
            this.eat(TokenType.Colon);
            const falseValue = this.parseTernary();
            return condition ? trueValue : falseValue;
        }
        return condition;
    }

    private parseOr(): any {
        let left = this.parseAnd();
        while (this.current().type === TokenType.Or) {
            this.eat(TokenType.Or);
            const right = this.parseAnd();
            left = left || right;
        }
        return left;
    }

    private parseAnd(): any {
        let left = this.parseEquality();
        while (this.current().type === TokenType.And) {
            this.eat(TokenType.And);
            const right = this.parseEquality();
            left = left && right;
        }
        return left;
    }

    private parseEquality(): any {
        let left = this.parseRelational();
        while (true) {
            const t = this.current().type;
            if (t === TokenType.Equal || t === TokenType.StrictEqual) {
                this.eat(t);
                left = left == this.parseRelational();
            } else if (t === TokenType.NotEqual || t === TokenType.StrictNotEqual) {
                this.eat(t);
                left = left != this.parseRelational();
            } else {
                break;
            }
        }
        return left;
    }

    private parseRelational(): any {
        let left = this.parseAdditive();
        while (true) {
            const t = this.current().type;
            if (t === TokenType.LessThan) {
                this.eat(TokenType.LessThan);
                left = left < this.parseAdditive();
            } else if (t === TokenType.GreaterThan) {
                this.eat(TokenType.GreaterThan);
                left = left > this.parseAdditive();
            } else if (t === TokenType.LessThanOrEqual) {
                this.eat(TokenType.LessThanOrEqual);
                left = left <= this.parseAdditive();
            } else if (t === TokenType.GreaterThanOrEqual) {
                this.eat(TokenType.GreaterThanOrEqual);
                left = left >= this.parseAdditive();
            } else {
                break;
            }
        }
        return left;
    }

    private parseAdditive(): any {
        let left = this.parseMultiplicative();
        while (true) {
            const t = this.current().type;
            if (t === TokenType.Plus) {
                this.eat(TokenType.Plus);
                left = left + this.parseMultiplicative();
            } else if (t === TokenType.Minus) {
                this.eat(TokenType.Minus);
                left = left - this.parseMultiplicative();
            } else {
                break;
            }
        }
        return left;
    }

    private parseMultiplicative(): any {
        let left = this.parseUnary();
        while (true) {
            const t = this.current().type;
            if (t === TokenType.Multiply) {
                this.eat(TokenType.Multiply);
                left = left * this.parseUnary();
            } else if (t === TokenType.Divide) {
                this.eat(TokenType.Divide);
                left = left / this.parseUnary();
            } else if (t === TokenType.Modulo) {
                this.eat(TokenType.Modulo);
                left = left % this.parseUnary();
            } else {
                break;
            }
        }
        return left;
    }

    private parseUnary(): any {
        const t = this.current().type;
        if (t === TokenType.Minus) {
            this.eat(TokenType.Minus);
            return -this.parseUnary();
        } else if (t === TokenType.Plus) {
            this.eat(TokenType.Plus);
            return this.parseUnary();
        }
        return this.parsePrimary();
    }

    private parsePrimary(): any {
        const t = this.current().type;
        if (t === TokenType.Number) {
            const token = this.eat(TokenType.Number);
            return token.value;
        }
        if (t === TokenType.LParen) {
            this.eat(TokenType.LParen);
            const value = this.parseExpression();
            this.eat(TokenType.RParen);
            return value;
        }
        throw new Error("Unexpected token: " + t);
    }
}
