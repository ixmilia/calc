import { BinaryOperator, Operators, UnaryOperator } from "./operator.js";
import { NumberToken, OperatorToken, Token } from "./token.js";

export abstract class Expression {
    abstract evaluate(variables: { [key: string]: Expression }): number;

    private static isWhitespace(c: string) {
        return c === ' ' || c === '\t' || c === '\n' || c === '\r';
    }

    private static isOperator(c: string) {
        return Operators.WellKnownOperators.some(o => o.symbol === c);
    }

    private static isInfixOperator(c: string) {
        return Operators.WellKnownOperators.some(o => o.symbol === c && o.minimumArgumentCount === 2 && o.maximumArgumentCount === 2);
    }

    private static isDigit(c: string): boolean {
        switch (c) {
            case '0':
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
                return true;
            default:
                return false;
        }
    }

    private static isNumberStart(c: string) {
        return this.isDigit(c) || c === '.';
    }

    private static associativity(o: string): 'left' | 'right' {
        switch (o) {
            case '~':
            case '^':
                return 'right';
            default:
                return 'left';
        }
    }

    private static precedence(o: string): number {
        switch (o) {
            case '!':
                return 6;
            case '~':
                return 5;
            case '^':
                return 4;
            case '*':
            case '/':
                return 3;
            case '+':
            case '-':
                return 2;
            default:
                throw new Error(`Unknown operator ${o}`);
        }
    }

    private static tokenize(expression: string) {
        const STATE = {
            NONE: 0,
            NUMBER: 1,
            IDENTIFIER: 2,
        };
        const tokens: Token[] = [];
        let state = STATE.NONE;
        let current = "";
        let start = 0;
        let minusIsUnary = true;
        let seenDecimal = false;
        let seenE = false;
        let seenSign = false;

        function finishToken(position: number, kind: 'number' | 'identifier') {
            switch (kind) {
                case 'number':
                    minusIsUnary = false;
                    tokens.push(new NumberToken(current, position, parseFloat(current)));
                    break;
            }
        }

        for (let i = 0; i < expression.length; i++) {
            const c = expression[i];
            switch (state) {
                case STATE.NONE:
                    if (this.isWhitespace(c)) {
                        continue;
                    } else if (this.isOperator(c)) {
                        if (c == "-" && minusIsUnary) {
                            tokens.push(new OperatorToken('~', i, 'right', 5));
                        } else {
                            tokens.push(new OperatorToken(c, i, c === '^' ? 'right' : 'left', 0));
                            if (this.isInfixOperator(c)) {
                                minusIsUnary = true;
                            }
                        }
                    } else if (this.isNumberStart(c)) {
                        current = c;
                        start = i;
                        state = STATE.NUMBER;
                        seenDecimal = c === '.';
                        seenE = false;
                        seenSign = false;
                    } else {
                        throw new Error(`Unexpected character ${c} at position ${i}`);
                    }
                    break;
                case STATE.NUMBER:
                    if (this.isDigit(c)) {
                        current += c;
                        seenSign = seenE; // if we've passed 'e' then '+' and '-' are no longer allowed after digits
                    } else if (this.isWhitespace(c)) {
                        finishToken(start, 'number');
                        state = STATE.NONE;
                    } else if (c === '.') {
                        if (!seenDecimal && !seenE) {
                            current += c;
                            seenDecimal = true;
                        } else {
                            throw new Error(`Unexpected character ${c} at position ${i}`);
                        }
                    } else if ((c === 'e' || c === 'E') && !seenE) {
                        current += c;
                        seenE = true;
                        seenSign = false;
                    } else if ((c == '-' || c == '+') && seenE && !seenSign) {
                        current += c;
                        seenSign = true;
                    } else if (this.isOperator(c)) {
                        finishToken(start, 'number');
                        if (c === '-' && minusIsUnary) {
                            tokens.push(new OperatorToken('~', i, this.associativity('~'), this.precedence('~')));
                        } else {
                            tokens.push(new OperatorToken(c, i, this.associativity(c), this.precedence(c)));
                            if (this.isInfixOperator(c)) {
                                minusIsUnary = true;
                            }
                        }

                        state = STATE.NONE;
                    }
                    break;
                default:
                    throw new Error(`Unexpected state ${state}`);
            }
        }

        finishToken(expression.length - 1, state === STATE.NUMBER ? 'number' : 'identifier');
        return tokens;
    }

    private static shuntToRpn(tokens: Token[]): Token[] {
        const argCountStack = [];
        const outputQueue: Token[] = [];
        const opStack: OperatorToken[] = [];
        for (const token of tokens) {
            switch (token.type) {
                case 'number':
                    outputQueue.push(token);
                    break;
                case 'operator':
                    const opToken = <OperatorToken>token;
                    const opAssoc = opToken.associativity;
                    while (opStack.length > 0 && opStack[opStack.length - 1].type === 'operator' &&
                        ((opAssoc === 'left' && opToken.precedence <= opStack[opStack.length - 1].precedence)
                            || opToken.precedence < opStack[opStack.length - 1].precedence)) {
                        outputQueue.push(opStack.pop()!);
                    }
                    opStack.push(opToken);
                    break;
                default:
                    throw new Error(`Unexpected token ${token.text}`);
            }
        }

        while (opStack.length > 0) {
            const op = opStack.pop()!;
            switch (op.type) {
                case 'lparen':
                case 'rparen':
                    throw new Error(`Mismatched parentheses`);
                default:
                    outputQueue.push(op);
                    break;
            }
        }

        return outputQueue;
    }

    private static operandCount(op: string): number {
        switch (op) {
            case '+':
            case '-':
            case '*':
            case '/':
            case '^':
                return 2;
            case '!':
            case '~':
                return 1;
            default:
                throw new Error(`Unknown operator ${op}`);
        }
    }

    private static rpnToExpression(tokens: Token[]): Expression {
        const stack: Expression[] = [];
        for (const token of tokens) {
            switch (token.type) {
                case 'number':
                    stack.push(new NumberExpression((<NumberToken>token).value));
                    break;
                case 'operator':
                    const opToken = <OperatorToken>token;
                    const requiredOperands = this.operandCount(opToken.text);
                    // TODO: ensure stack
                    const args: Expression[] = [];
                    for (let i = 0; i < requiredOperands; i++) {
                        args.push(stack.pop()!);
                    }
                    switch (requiredOperands) {
                        case 1:
                            stack.push(new UnaryExpression(args[0], <UnaryOperator>Operators.operatorFromSymbol(opToken.text)));
                            break;
                        case 2:
                            stack.push(new BinaryExpression(args[1], args[0], <BinaryOperator>Operators.operatorFromSymbol(opToken.text)));
                            break;
                        default:
                            throw new Error(`Unexpected operand count ${requiredOperands}`);
                    }
                    break;
                default:
                    throw new Error(`Unexpected token ${token.text}`);
            }
        }

        if (stack.length !== 1) {
            throw new Error('Unbalanced stack');
        }

        return stack[0];
    }

    static parse(expression: string): Expression {
        const tokens = this.tokenize(expression);
        const rpn = this.shuntToRpn(tokens);
        const expr = this.rpnToExpression(rpn);
        return expr;
    }

    static evaluate(expression: string): number {
        const expr = this.parse(expression);
        return expr.evaluate({});
    }
}

export class NumberExpression extends Expression {
    constructor(readonly value: number) {
        super();
    }

    evaluate(_variables: { [key: string]: Expression }) {
        return this.value;
    }
}

export class VariableExpression extends Expression {
    constructor(readonly name: string) {
        super();
    }

    evaluate(variables: { [key: string]: Expression; }): number {
        const expression = variables[this.name];
        if (!expression) {
            throw new Error(`Variable ${this.name} is not defined`);
        }

        return expression.evaluate(variables);
    }
}

export class UnaryExpression extends Expression {
    constructor(readonly operand: Expression, readonly operator: UnaryOperator) {
        super();
    }

    evaluate(variables: { [key: string]: Expression }): number {
        const operandValue = this.operand.evaluate(variables);
        const result = this.operator.evaluate([operandValue]);
        return result;
    }
}

export class BinaryExpression extends Expression {
    constructor(readonly left: Expression, readonly right: Expression, readonly operator: BinaryOperator) {
        super();
    }

    evaluate(variables: { [key: string]: Expression }): number {
        const leftValue = this.left.evaluate(variables);
        const rightValue = this.right.evaluate(variables);
        const result = this.operator.evaluate([leftValue, rightValue]);
        return result;
    }
}
