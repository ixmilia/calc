import { BinaryOperator, Operators, UnaryOperator } from "./operator.js";
import { FloatToken, FunctionCallToken, IdentifierToken, IntegerToken, OperatorToken, PunctuationToken, Token } from "./token.js";

export enum Mode {
    Radians = 0,
    Degrees = 1,
};

export abstract class Expression {
    constructor(readonly type: string) {
    }

    abstract evaluate(mode: Mode, variables: { [key: string]: Expression }): Expression;
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
                    if (current.match(/^\d+$/)) {
                        tokens.push(new IntegerToken(current, position, parseInt(current)));
                    } else {
                        tokens.push(new FloatToken(current, position, parseFloat(current)));
                    }
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
                case 'integer':
                case 'float':
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
                    throw new Error(`Unexpected token ${token.text} (${token.type})`);
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
                case 'integer':
                    stack.push(new IntegerExpression((<IntegerToken>token).value));
                    break;
                case 'float':
                    stack.push(new FloatExpression((<FloatToken>token).value));
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
            'pi': new FloatExpression(Math.PI),
            'e': new FloatExpression(Math.E)
        };
    };

    private static wrapNumberFunction(name: string, fn: (...args: number[]) => number): (args: Expression[], mode: Mode, variables: { [key: string]: Expression }) => Expression {
        return (args, mode, variables) => {
            const evaluatedArgs = args.map(a => a.evaluate(mode, variables));
            if (evaluatedArgs.every(e => this.isNumeric(e))) {
                const numberArgs = evaluatedArgs.map(e => (<NumericExpression>e).asFloat().value);
                const numberResult = fn(...numberArgs);
                return new FloatExpression(numberResult);
            }

            return new FunctionCallExpression(new FunctionCallToken(new IdentifierToken(name, -1), evaluatedArgs.length), evaluatedArgs);
        }
    }

    // TODO: make these expressions
    private static get RadiansToDegrees(): Expression {
        return new BinaryExpression(new FloatExpression(180), new VariableExpression('pi'), Operators.DivideOperator);
    }

    private static get DegreesToRadians(): Expression {
        return new BinaryExpression(new VariableExpression('pi'), new FloatExpression(180), Operators.DivideOperator);
    }

    private static wrapTrig(name: string, fn: (...args: number[]) => number): (args: Expression[], mode: Mode, variables: { [key: string]: Expression }) => Expression {
        return (args, mode, variables) => {
            const multiplier = mode === Mode.Degrees ? Expression.DegreesToRadians : new FloatExpression(1);
            const evaluatedArgs = args.map(a => {
                const argExpression = new BinaryExpression(a, multiplier, Operators.MultiplyOperator);
                const argResult = argExpression.evaluate(mode, variables);
                return argResult;
            });
            if (evaluatedArgs.every(e => this.isNumeric(e))) {
                const floatArgs = evaluatedArgs.map(e => (<NumericExpression>e).asFloat().value);
                const floatResult = fn(...floatArgs);
                return new FloatExpression(floatResult);
            }

            return new FunctionCallExpression(new FunctionCallToken(new IdentifierToken(name, -1), evaluatedArgs.length), evaluatedArgs);
        };
    }

    private static wrapTrigArc(name: string, fn: (...args: number[]) => number): (args: Expression[], mode: Mode, variables: { [key: string]: Expression }) => Expression {
        return (args, mode, variables) => {
            const multiplier = mode === Mode.Degrees ? Expression.RadiansToDegrees : new FloatExpression(1);
            const intermediateResult = this.wrapNumberFunction(name, fn)(args, mode, variables);
            const multipliedExpression = new BinaryExpression(intermediateResult, multiplier, Operators.MultiplyOperator);
            const multipliedResult = multipliedExpression.evaluate(mode, variables);
            return multipliedResult;
        };
    }

    private static diff(expression: Expression, variable: string): Expression {
        switch (expression.type) {
            case 'float':
            case 'integer':
            case 'ratio':
                return new IntegerExpression(0);
            case 'variable':
                const variableExpression = <VariableExpression>expression;
                if (variableExpression.name === variable) {
                    return new IntegerExpression(1);
                }

                return expression;
            case 'binary':
                const binaryExpression = <BinaryExpression>expression;
                switch (binaryExpression.operator.symbol) {
                    case '+':
                    case '-':
                        return new BinaryExpression(this.diff(binaryExpression.left, variable), this.diff(binaryExpression.right, variable), binaryExpression.operator);
                    case '*':
                        return new BinaryExpression(
                            new BinaryExpression(binaryExpression.left, this.diff(binaryExpression.right, variable), Operators.MultiplyOperator),
                            new BinaryExpression(binaryExpression.right, this.diff(binaryExpression.left, variable), Operators.MultiplyOperator),
                            Operators.AddOperator);
                    case '/':
                        return new BinaryExpression(
                            new BinaryExpression(
                                new BinaryExpression(binaryExpression.right, this.diff(binaryExpression.left, variable), Operators.MultiplyOperator),
                                new BinaryExpression(binaryExpression.left, this.diff(binaryExpression.right, variable), Operators.MultiplyOperator),
                                Operators.SubtractOperator),
                            new BinaryExpression(binaryExpression.right, binaryExpression.right, Operators.MultiplyOperator),
                            Operators.DivideOperator);
                    case '^':
                        return new BinaryExpression(
                            binaryExpression.right,
                            new BinaryExpression(
                                binaryExpression.left,
                                new BinaryExpression(binaryExpression.right, new IntegerExpression(1), Operators.SubtractOperator),
                                Operators.ExponentiateOperator),
                            Operators.MultiplyOperator);
                    default:
                        throw new Error(`Unknown operator ${binaryExpression.operator}`);
                }
            default:
                throw new Error(`Unknown expression type ${expression.type}`);
        }
    }

    protected static get defaultFunctions(): { [key: string]: FunctionDefinition } {
        return {
            "acos": new FunctionDefinition(1, 1, Expression.wrapTrigArc("acos", Math.acos)),
            "asin": new FunctionDefinition(1, 1, Expression.wrapTrigArc("asin", Math.asin)),
            "atan": new FunctionDefinition(1, 1, Expression.wrapTrigArc("atan", Math.atan)),
            "atan2": new FunctionDefinition(2, 2, Expression.wrapTrigArc("atan2", Math.atan2)),
            "cos": new FunctionDefinition(1, 1, Expression.wrapTrig("cos", Math.cos)),
            "diff": new FunctionDefinition(2, 2, (args, mode, variables) => {
                const expr = args[0];
                const ident = <VariableExpression>args[1];
                const expressionResult = this.diff(expr, ident.name);
                return expressionResult.evaluate(mode, variables);
            }),
            "ln": new FunctionDefinition(1, 1, Expression.wrapNumberFunction("ln", Math.log)),
            "log": new FunctionDefinition(2, 2, Expression.wrapNumberFunction("log", (...args: number[]) => Math.log(args[1]) / Math.log(args[0]))),
            "max": new FunctionDefinition(2, 2, Expression.wrapNumberFunction("max", Math.max)),
            "min": new FunctionDefinition(2, 2, Expression.wrapNumberFunction("min", Math.min)),
            "sin": new FunctionDefinition(1, 1, Expression.wrapTrig("sin", Math.sin)),
            "sum": new FunctionDefinition(4, 4, (args, mode, variables) => {
                const expr = args[0];
                const ident = <VariableExpression>args[1];
                const start = args[2].evaluate(mode, variables);
                const end = args[3].evaluate(mode, variables);

                if (!Expression.isInteger(start) || !Expression.isInteger(end)) {
                    throw new Error("Sum bounds must be integers");
                }

                let result: Expression = new IntegerExpression(0);
                for (let i = start.value; i <= end.value; i++) {
                    const next = expr.evaluate(mode, { ...variables, [ident.name]: new IntegerExpression(i) });
                    result = new BinaryExpression(result, next, Operators.AddOperator).evaluate(mode, variables);
                }

                return result;
            }),
            "tan": new FunctionDefinition(1, 1, Expression.wrapTrig("tan", Math.tan)),
        };
    }

    static parse(expression: string): Expression {
        const tokens = this.tokenize(expression);
        const rpn = this.shuntToRpn(tokens);
        const expr = this.rpnToExpression(rpn);
        return expr;
    }

    static evaluate(expression: string, mode?: Mode, variables?: { [key: string]: Expression }): Expression {
        const modeToUse = mode ?? Mode.Radians;
        const expr = this.parse(expression);
        const userVariables = variables ?? {};
        const combinedVariables = { ...this.defaultVariables, ...userVariables };
        return expr.evaluate(modeToUse, combinedVariables);
    }

    static isNumeric(expression: Expression): expression is NumericExpression {
        return this.isInteger(expression) || this.isFloat(expression) || this.isRatio(expression);
    }

    static isInteger(expression: Expression): expression is IntegerExpression {
        return expression.type === 'integer';
    }

    static isFloat(expression: Expression): expression is FloatExpression {
        return expression.type === 'float';
    }

    static isRatio(expression: Expression): expression is RatioExpression {
        return expression.type === 'ratio';
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

export abstract class NumericExpression extends Expression {
    abstract asFloat(): FloatExpression;
    abstract isZero(): boolean;
    abstract isOne(): boolean;
}

export class IntegerExpression extends NumericExpression {
    private _value: number;

    constructor(value: number) {
        super('integer');
        this._value = Math.trunc(value);
    }

    get value() {
        return this._value;
    }

    asFloat(): FloatExpression {
        return new FloatExpression(this.value);
    }

    isZero(): boolean {
        return this.value === 0;
    }

    isOne(): boolean {
        return this.value === 1;
    }

    evaluate(_mode: Mode, _variables: { [key: string]: Expression }): Expression {
        return this;
    }

    toString(): string {
        return this.value.toString();
    }
}

export class FloatExpression extends NumericExpression {
    constructor(readonly value: number) {
        super('float');
    }

    asFloat(): FloatExpression {
        return this;
    }

    isZero(): boolean {
        return this.value === 0;
    }

    isOne(): boolean {
        return this.value === 1;
    }

    evaluate(_mode: Mode, _variables: { [key: string]: Expression }): Expression {
        return this;
    }

    toString(): string {
        return this.value.toString();
    }
}

export class RatioExpression extends NumericExpression {
    private _numerator: number;
    private _denominator: number;

    constructor(numerator: number, denominator: number) {
        super('ratio');
        this._numerator = Math.trunc(numerator);
        this._denominator = Math.trunc(denominator);
    }

    get numerator() {
        return this._numerator;
    }

    get denominator() {
        return this._denominator;
    }

    private static gcd(a: number, b: number): number {
        while (b != 0) {
            const temp = a % b;
            a = b;
            b = temp;
        }

        return a;
    }

    reduce(): NumericExpression {
        const gcd = RatioExpression.gcd(Math.abs(this.numerator), Math.abs(this.denominator));
        let numerator = Math.abs(this.numerator / gcd);
        const denominator = Math.abs(this.denominator / gcd);

        if (Math.sign(this.numerator) != Math.sign(this.denominator)) {
            numerator *= -1;
        }

        if (numerator === 0) {
            return new IntegerExpression(0);
        }

        if (denominator === 1) {
            return new IntegerExpression(numerator);
        }

        if (numerator === this.numerator && denominator === this.denominator) {
            return this;
        }

        return new RatioExpression(numerator, denominator);
    }

    asFloat(): FloatExpression {
        return new FloatExpression(this.numerator / this.denominator);
    }

    isZero(): boolean {
        return this.numerator === 0;
    }

    isOne(): boolean {
        return this.numerator === this.denominator;
    }

    evaluate(_mode: Mode, _variables: { [key: string]: Expression }): Expression {
        return this;
    }

    toString(): string {
        return `${this.numerator}/${this.denominator}`;
    }
}

export class VariableExpression extends Expression {
    constructor(readonly name: string) {
        super('variable');
    }

    evaluate(mode: Mode, variables: { [key: string]: Expression; }): Expression {
        const expression = variables[this.name];
        if (!expression) {
            return this;
        }

        return expression.evaluate(mode, variables);
    }

    toString(): string {
        return this.name;
    }
}

export class UnaryExpression extends Expression {
    constructor(readonly operand: Expression, readonly operator: UnaryOperator) {
        super('unary');
    }

    evaluate(mode: Mode, variables: { [key: string]: Expression }): Expression {
        const operandValue = this.operand.evaluate(mode, variables);
        return this.operator.evaluate([operandValue], mode, variables);
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

    evaluate(mode: Mode, variables: { [key: string]: Expression }): Expression {
        const leftValue = this.left.evaluate(mode, variables);
        const rightValue = this.right.evaluate(mode, variables);

        return this.operator.evaluate([leftValue, rightValue], mode, variables);
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

    evaluate(mode: Mode, variables: { [key: string]: Expression }): Expression {
        const result = this._definition.handler(this.args, mode, variables);
        return result;
    }

    toString(): string {
        return `${this.func.text}(${this.args.join(',')})`;
    }
}

export class FunctionDefinition {
    constructor(readonly minimumArgumentCount: number, readonly maximumArgumentCount: number, readonly handler: (args: Expression[], mode: Mode, variables: { [key: string]: Expression }) => Expression) {

    }
}
