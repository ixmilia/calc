import { BinaryOperator, Operators, UnaryOperator } from "./operator.js";
import { FunctionCallToken, IdentifierToken, NumberToken, OperatorToken, PunctuationToken, Token } from "./token.js";

export abstract class Expression {
    constructor(readonly type: string) {
    }

    abstract evaluate(variables: { [key: string]: Expression }): Expression;
    abstract toString(): string;

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

    private static isIdentStart(c: string) {
        return c.length === 1
            && (c >= 'a' && c <= 'z' ||
                c >= 'A' && c <= 'Z' ||
                c === '_');
    }

    private static isIdentContinue(c: string) {
        return this.isIdentStart(c) || this.isDigit(c);
    }

    private static isPunctuation(c: string) {
        switch (c) {
            case '(':
            case ')':
            case ',':
                return true;
            default:
                return false;
        }
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
                case 'identifier':
                    minusIsUnary = false;
                    tokens.push(new IdentifierToken(current, position));
                    break;
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
                    } else if (this.isPunctuation(c)) {
                        tokens.push(new PunctuationToken(c, i));
                        minusIsUnary = c != ')';
                    } else if (this.isNumberStart(c)) {
                        current = c;
                        start = i;
                        state = STATE.NUMBER;
                        seenDecimal = c === '.';
                        seenE = false;
                        seenSign = false;
                    } else if (this.isIdentStart(c)) {
                        current = c;
                        start = i;
                        state = STATE.IDENTIFIER;
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
                    } else if (this.isPunctuation(c)) {
                        finishToken(start, 'number');
                        tokens.push(new PunctuationToken(c, i));
                        minusIsUnary = c != ')';
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
                case STATE.IDENTIFIER:
                    if (this.isIdentContinue(c)) {
                        current += c;
                    } else if (this.isWhitespace(c)) {
                        finishToken(start, 'identifier');
                        state = STATE.NONE;
                    } else if (this.isOperator(c)) {
                        finishToken(start, 'identifier');
                        if (c == '-' && minusIsUnary) {
                            tokens.push(new OperatorToken('~', i, this.associativity('~'), this.precedence('~')));
                        } else {
                            tokens.push(new OperatorToken(c, i, this.associativity(c), this.precedence(c)));
                            if (this.isInfixOperator(c)) {
                                minusIsUnary = true;
                            }
                        }

                        state = STATE.NONE;
                    } else if (this.isPunctuation(c)) {
                        finishToken(start, 'identifier');
                        tokens.push(new PunctuationToken(c, i));
                        minusIsUnary = c != ')';
                        state = STATE.NONE;
                    } else {
                        throw new Error(`Unexpected identifier character ${c} at position ${i}`);
                    }
                    break;
                default:
                    throw new Error(`Unexpected state ${state}`);
            }
        }

        if (state !== STATE.NONE) {
            finishToken(expression.length - 1, state === STATE.NUMBER ? 'number' : 'identifier');
        }

        return tokens;
    }

    private static shuntToRpn(tokens: Token[]): Token[] {
        const argCountStack: number[] = [];
        const outputQueue: Token[] = [];
        const opStack: Token[] = [];
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            switch (token.type) {
                case 'identifier':
                    outputQueue.push(token);
                    break;
                case 'number':
                    outputQueue.push(token);
                    break;
                case 'operator':
                    const opToken = <OperatorToken>token;
                    const opAssoc = opToken.associativity;
                    while (opStack.length > 0 && opStack[opStack.length - 1].type === 'operator' &&
                        ((opAssoc === 'left' && opToken.precedence <= (<OperatorToken>opStack[opStack.length - 1]).precedence)
                            || opToken.precedence < (<OperatorToken>opStack[opStack.length - 1]).precedence)) {
                        outputQueue.push(opStack.pop()!);
                    }
                    opStack.push(opToken);
                    break;
                case 'punctuation':
                    const puncToken = <PunctuationToken>token;
                    switch (puncToken.symbol) {
                        case '(':
                            // if previous is identifier
                            if (i >= 1 && tokens[i - 1].type === 'identifier') {
                                const functionIdentifier = <IdentifierToken>outputQueue.pop()!;
                                opStack.push(functionIdentifier);
                                argCountStack.push(0);
                            } else {
                                opStack.push(puncToken);
                            }

                            break;
                        case ')':
                            while (true) {
                                if (opStack.length === 0) {
                                    throw new Error('Mismatched parentheses');
                                }

                                const op = opStack.pop()!;
                                if (op.type === 'operator') {
                                    outputQueue.push(op);
                                } else if (op.type === 'identifier') {
                                    const func = <IdentifierToken>op;
                                    let argCount = argCountStack.pop()! + 1;
                                    if (i >= 2 && tokens[i - 1].type === 'punctuation' && (<PunctuationToken>tokens[i - 1]).symbol === '(' && tokens[i - 2].type === 'identifier') {
                                        argCount = 0;
                                    }

                                    outputQueue.push(new FunctionCallToken(func, argCount));
                                    break;
                                } else if (op.type === 'punctuation' && (<PunctuationToken>op).symbol === '(') {
                                    break;
                                }
                            }
                            break;
                        case ',':
                            while (opStack[opStack.length - 1].type !== 'identifier') {
                                outputQueue.push(opStack.pop()!);
                            }

                            argCountStack.push(argCountStack.pop()! + 1);
                            break;
                        default:
                            throw new Error(`Unexpected punctuation ${puncToken.symbol}`);
                    }
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
                case 'function':
                    const func = <FunctionCallToken>token;
                    const functionArgs: Expression[] = [];
                    for (let i = 0; i < func.argumentCount; i++) {
                        functionArgs.push(stack.pop()!);
                    }

                    stack.push(new FunctionCallExpression(func, functionArgs.reverse()));
                    break;
                case 'identifier':
                    stack.push(new VariableExpression((<IdentifierToken>token).text));
                    break;
                case 'number':
                    stack.push(new NumberExpression((<NumberToken>token).value));
                    break;
                case 'operator':
                    const opToken = <OperatorToken>token;
                    const requiredOperands = this.operandCount(opToken.text);
                    // TODO: ensure stack
                    const expressionArgs: Expression[] = [];
                    for (let i = 0; i < requiredOperands; i++) {
                        expressionArgs.push(stack.pop()!);
                    }
                    switch (requiredOperands) {
                        case 1:
                            stack.push(new UnaryExpression(expressionArgs[0], <UnaryOperator>Operators.operatorFromSymbol(opToken.text)));
                            break;
                        case 2:
                            stack.push(new BinaryExpression(expressionArgs[1], expressionArgs[0], <BinaryOperator>Operators.operatorFromSymbol(opToken.text)));
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

    private static get defaultVariables(): { [key: string]: Expression } {
        return {
            'pi': new NumberExpression(Math.PI),
            'e': new NumberExpression(Math.E)
        };
    };

    private static wrapNumeric(name: string, fn: (...args: number[]) => number): (args: Expression[], variables: { [key: string]: Expression }) => Expression {
        return (args, variables) => {
            const evaluatedArgs = args.map(a => a.evaluate(variables));
            if (evaluatedArgs.every(e => this.isNumber(e))) {
                const numericArgs = evaluatedArgs.map(e => (<NumberExpression>e).value);
                const numericResult = fn(...numericArgs);
                const expressionResult = new NumberExpression(numericResult);
                return expressionResult;
            }

            return new FunctionCallExpression(new FunctionCallToken(new IdentifierToken(name, -1), evaluatedArgs.length), evaluatedArgs);
        }
    }

    protected static get defaultFunctions(): { [key: string]: FunctionDefinition } {
        return {
            "cos": new FunctionDefinition(1, 1, Expression.wrapNumeric("cos", Math.cos)),
            "ln": new FunctionDefinition(1, 1, Expression.wrapNumeric("ln", Math.log)),
            "log": new FunctionDefinition(2, 2, Expression.wrapNumeric("log", (...args: number[]) => Math.log(args[0]) / Math.log(args[1]))),
            "max": new FunctionDefinition(2, 2, Expression.wrapNumeric("max", Math.max)),
            "min": new FunctionDefinition(2, 2, Expression.wrapNumeric("min", Math.min)),
            "sin": new FunctionDefinition(1, 1, Expression.wrapNumeric("sin", Math.sin)),
            "sum": new FunctionDefinition(4, 4, (args, variables) => {
                const expr = args[0];
                const ident = <VariableExpression>args[1];
                const start = args[2].evaluate(variables);
                const end = args[3].evaluate(variables);

                if (!Expression.isNumber(start) || !Expression.isNumber(end)) {
                    throw new Error("Sum bounds must be numbers");
                }

                let result: Expression = new NumberExpression(0);
                for (let i = start.value; i <= end.value; i++) {
                    const next = expr.evaluate({ ...variables, [ident.name]: new NumberExpression(i) });
                    result = new BinaryExpression(result, next, Operators.AddOperator).evaluate(variables);
                }

                return result;
            }),
            "tan": new FunctionDefinition(1, 1, Expression.wrapNumeric("tan", Math.tan)),
        };
    }

    static parse(expression: string): Expression {
        const tokens = this.tokenize(expression);
        const rpn = this.shuntToRpn(tokens);
        const expr = this.rpnToExpression(rpn);
        return expr;
    }

    static evaluate(expression: string, variables?: { [key: string]: Expression }): Expression {
        const expr = this.parse(expression);
        const userVariables = variables ?? {};
        const combinedVariables = { ...this.defaultVariables, ...userVariables };
        return expr.evaluate(combinedVariables);
    }

    static isNumber(expression: Expression): expression is NumberExpression {
        return expression.type === 'number';
    }

    static isVariable(expression: Expression): expression is VariableExpression {
        return expression.type === 'variable';
    }

    static isUnary(expression: Expression): expression is UnaryExpression {
        return expression.type === 'unary'
    }

    static isBinary(expression: Expression): expression is BinaryExpression {
        return expression.type === 'binary';
    }

    static isFunctionCall(expression: Expression): expression is FunctionCallExpression {
        return expression.type === 'functionCall';
    }
}

export class NumberExpression extends Expression {
    constructor(readonly value: number) {
        super('number');
    }

    evaluate(_variables: { [key: string]: Expression }): Expression {
        return this;
    }

    toString(): string {
        return this.value.toString();
    }
}

export class VariableExpression extends Expression {
    constructor(readonly name: string) {
        super('variable');
    }

    evaluate(variables: { [key: string]: Expression; }): Expression {
        const expression = variables[this.name];
        if (!expression) {
            return this;
        }

        return expression.evaluate(variables);
    }

    toString(): string {
        return this.name;
    }
}

export class UnaryExpression extends Expression {
    constructor(readonly operand: Expression, readonly operator: UnaryOperator) {
        super('unary');
    }

    evaluate(variables: { [key: string]: Expression }): Expression {
        const operandValue = this.operand.evaluate(variables);
        return this.operator.evaluate([operandValue], variables);
    }

    toString(): string {
        // TODO: prefix vs postfix
        return `${this.operator.symbol}${this.operand.toString()}`;
    }
}

export class BinaryExpression extends Expression {
    constructor(readonly left: Expression, readonly right: Expression, readonly operator: BinaryOperator) {
        super('binary');
    }

    evaluate(variables: { [key: string]: Expression }): Expression {
        const leftValue = this.left.evaluate(variables);
        const rightValue = this.right.evaluate(variables);

        return this.operator.evaluate([leftValue, rightValue], variables);
    }

    toString(): string {
        return `(${this.left.toString()}${this.operator.symbol}${this.right.toString()})`;
    }
}

export class FunctionCallExpression extends Expression {
    private _definition: FunctionDefinition;

    constructor(readonly func: FunctionCallToken, readonly args: Expression[]) {
        super('functionCall');
        const functionDefinition = Expression.defaultFunctions[func.identifier.text];
        if (!functionDefinition) {
            throw new Error(`function '${func.identifier.text}' not found`);
        }

        this._definition = functionDefinition;
        if (args.length < this._definition.minimumArgumentCount || args.length > this._definition.maximumArgumentCount) {
            throw new Error(`function '${func.identifier.text}' requires between ${this._definition.minimumArgumentCount} and ${this._definition.maximumArgumentCount} arguments`);
        }
    }

    evaluate(variables: { [key: string]: Expression }): Expression {
        const result = this._definition.handler(this.args, variables);
        return result;
    }

    toString(): string {
        return `${this.func.text}(${this.args.join(',')})`;
    }
}

export class FunctionDefinition {
    constructor(readonly minimumArgumentCount: number, readonly maximumArgumentCount: number, readonly handler: (args: Expression[], variables: { [key: string]: Expression }) => Expression) {

    }
}
