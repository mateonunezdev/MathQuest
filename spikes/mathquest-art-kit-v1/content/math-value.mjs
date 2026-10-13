function gcd(a, b) {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    while (b) [a, b] = [b, a % b];
    return a || 1n;
}

export class Rational {
    constructor(numerator, denominator = 1n) {
        let n = BigInt(numerator);
        let d = BigInt(denominator);
        if (d === 0n) throw new Error('division by zero');
        if (d < 0n) { n = -n; d = -d; }
        const factor = gcd(n, d);
        this.numerator = n / factor;
        this.denominator = d / factor;
        Object.freeze(this);
    }
    add(other) { return new Rational(this.numerator * other.denominator + other.numerator * this.denominator, this.denominator * other.denominator); }
    subtract(other) { return new Rational(this.numerator * other.denominator - other.numerator * this.denominator, this.denominator * other.denominator); }
    multiply(other) { return new Rational(this.numerator * other.numerator, this.denominator * other.denominator); }
    divide(other) { return new Rational(this.numerator * other.denominator, this.denominator * other.numerator); }
    equals(other) { return this.numerator === other.numerator && this.denominator === other.denominator; }
    toString() { return this.denominator === 1n ? `${this.numerator}` : `${this.numerator}/${this.denominator}`; }
}

function tokenize(expression) {
    const source = String(expression)
        .replace(/\?/g, '')
        .replace(/−/g, '-')
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/\bDE\b/gi, '*')
        .replace(/\s+/g, '');
    const tokens = source.match(/\d+\/\d+|\d+|x|[()+\-*/=]/gi) || [];
    if (tokens.join('') !== source) throw new Error(`unsupported math syntax: ${expression}`);
    return tokens;
}

function valueAt(expression, variable = null) {
    const tokens = tokenize(expression);
    let cursor = 0;
    const peek = () => tokens[cursor];
    const take = () => tokens[cursor++];
    const primary = () => {
        const token = take();
        if (token === '(') {
            const value = sum();
            if (take() !== ')') throw new Error('missing closing parenthesis');
            return value;
        }
        if (token === '-') return new Rational(-1n).multiply(primary());
        if (/^\d+(?:\/\d+)?$/.test(token || '')) {
            const [numerator, denominator = '1'] = token.split('/');
            const value = new Rational(BigInt(numerator), BigInt(denominator));
            if ((peek() || '').toLowerCase() === 'x') {
                take();
                if (!variable) throw new Error('x requires a candidate value');
                return value.multiply(variable);
            }
            return value;
        }
        if ((token || '').toLowerCase() === 'x') {
            if (!variable) throw new Error('x requires a candidate value');
            return variable;
        }
        throw new Error(`unexpected token: ${token}`);
    };
    const product = () => {
        let value = primary();
        while (peek() === '*' || peek() === '/') {
            const operator = take();
            const right = primary();
            value = operator === '*' ? value.multiply(right) : value.divide(right);
        }
        return value;
    };
    const sum = () => {
        let value = product();
        while (peek() === '+' || peek() === '-') {
            const operator = take();
            const right = product();
            value = operator === '+' ? value.add(right) : value.subtract(right);
        }
        return value;
    };
    const result = sum();
    if (cursor !== tokens.length) throw new Error(`unexpected token: ${peek()}`);
    return result;
}

export function parseMathValue(value) {
    return valueAt(String(value));
}

export function questionAcceptsChoice(prompt, choice) {
    const candidate = parseMathValue(choice);
    const parts = String(prompt).replace(/\?/g, '').split('=');
    if (parts.length !== 2) throw new Error(`question must contain one equality: ${prompt}`);
    if (/x/i.test(prompt)) return valueAt(parts[0], candidate).equals(valueAt(parts[1], candidate));
    return valueAt(parts[0]).equals(candidate);
}

export function validateMathQuestion(question, mappingKey) {
    const errors = [];
    let matching = [];
    try {
        matching = question.choices.map((choice, index) => questionAcceptsChoice(question.prompt, choice) ? index : -1).filter(index => index >= 0);
    } catch (error) {
        errors.push(error.message);
    }
    if (matching.length !== 1) errors.push(`expected exactly one mathematically correct option, found ${matching.length}`);
    let mappedIndex;
    if (mappingKey === 'correctLane') mappedIndex = question.correctLane + 1;
    else if (mappingKey === 'correctIndex') mappedIndex = question.correctIndex;
    else errors.push(`unsupported mapping key ${mappingKey}`);
    if (matching.length === 1 && matching[0] !== mappedIndex) errors.push(`mapping points to option ${mappedIndex}, mathematical answer is option ${matching[0]}`);
    if (matching.length === 1) {
        try {
            if (!parseMathValue(question.choices[matching[0]]).equals(parseMathValue(question.answer))) errors.push('answer metadata is not equivalent to the correct option');
        } catch (error) {
            errors.push(error.message);
        }
    }
    return { valid: errors.length === 0, errors, correctIndex: matching.length === 1 ? matching[0] : null };
}
