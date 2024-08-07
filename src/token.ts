export abstract class Token {
    constructor(readonly type: string, readonly text: string, readonly position: number) {
    }
}

export class IntegerToken extends Token {
    constructor(text: string, position: number, public readonly value: number) {
        super('integer', text, position);
    }
}

export class FloatToken extends Token {
    constructor(text: string, position: number, public readonly value: number) {
        super('float', text, position);
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

export class FunctionCallToken extends Token {
    constructor(public readonly identifier: IdentifierToken, public readonly argumentCount: number) {
        super('function', identifier.text, identifier.position)
    }
}
