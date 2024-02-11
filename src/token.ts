export abstract class Token {
    constructor(readonly type: string, readonly text: string, readonly position: number) {
    }
}

export class NumberToken extends Token {
    constructor(text: string, position: number, public readonly value: number) {
        super('number', text, position);
    }
}

export class IdentifierToken extends Token {
    constructor(public readonly value: string, position: number) {
        super('identifier', value, position);
    }
}

export class OperatorToken extends Token {
    constructor(public readonly value: string, position: number, public readonly associativity: 'left' | 'right', public readonly precedence: number) {
        super('operator', value, position);
    }
}

export class PunctuationToken extends Token {
    constructor(public readonly symbol: string, position: number) {
        super('punctuation', symbol, position);
    }
}
