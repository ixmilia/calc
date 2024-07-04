import { BinaryExpression, Expression, FloatExpression, IntegerExpression, Mode, NumericExpression, RatioExpression } from "./expression.js";

export abstract class Operator {
    constructor(readonly symbol: string, readonly minimumArgumentCount: number, readonly maximumArgumentCount: number) {
        if (minimumArgumentCount < 0) {
            throw new Error('minimumArgumentCount must be non-negative');
        }

        if (maximumArgumentCount < minimumArgumentCount) {
            throw new Error('maximumArgumentCount must be greater than or equal to minimumArgumentCount');
        }
    }

    evaluate(args: Expression[], mode: Mode, variables: { [key: string]: Expression }): Expression {
        if (args.length < this.minimumArgumentCount || args.length > this.maximumArgumentCount) {
            throw new Error(`Expected between ${this.minimumArgumentCount} and ${this.maximumArgumentCount} arguments, got ${args.length}`);
        }

        const evaluatedArgs = args.map(a => a.evaluate(mode, variables));
        if (evaluatedArgs.every(a => Expression.isNumeric(a))) {
            const numericArgs = evaluatedArgs.map(a => <NumericExpression>a);
            const numericResult = this.evaluateNumericInternal(numericArgs);
            return numericResult;
        }

        return this.evaluateExpressionInternal(evaluatedArgs);
    }

    protected abstract evaluateNumericInternal(args: NumericExpression[]): NumericExpression;
    protected abstract evaluateExpressionInternal(args: Expression[]): Expression;
}

export class UnaryOperator extends Operator {
    constructor(symbol: string, private numericOperation: (operand: NumericExpression) => NumericExpression, private expressionOperation: (operand: Expression) => Expression) {
        super(symbol, 1, 1);
    }

    protected evaluateNumericInternal(args: NumericExpression[]): NumericExpression {
        return this.numericOperation(args[0]);
    }

    protected evaluateExpressionInternal(args: Expression[]): Expression {
        return this.expressionOperation(args[0]);
    }
}

export class BinaryOperator extends Operator {
    constructor(symbol: string, private numericOperation: (left: NumericExpression, right: NumericExpression) => NumericExpression, private expressionOperation: (left: Expression, right: Expression) => Expression) {
        super(symbol, 2, 2);
    }

    protected evaluateNumericInternal(args: NumericExpression[]): NumericExpression {
        return this.numericOperation(args[0], args[1]);
    }

    protected evaluateExpressionInternal(args: Expression[]): Expression {
        return this.expressionOperation(args[0], args[1]);
    }
}

export class Operators {
    static readonly NegateOperator = new UnaryOperator(
        '~',
        operand => {
            if (Expression.isFloat(operand)) {
                return new FloatExpression(-operand.value);
            }

            if (Expression.isRatio(operand)) {
                return new RatioExpression(-operand.numerator, operand.denominator);
            }

            return new IntegerExpression(-(<IntegerExpression>operand).value);
        },
        operand => operand
    );
    static readonly FactorialOperator = new UnaryOperator(
        '!',
        operand => {
            if (!Expression.isInteger(operand)) {
                throw new Error('Factorial can only be applied to integers');
            }

            let result = 1;
            for (let i = operand.value; i > 1; i--) {
                result *= i;
            }

            return new IntegerExpression(result);
        },
        operand => operand
    );
    static readonly AddOperator: BinaryOperator = new BinaryOperator(
        '+',
        (left, right) => this.addSubNumerics(left, right, (a, b) => a + b),
        (left, right) => {
            if (Expression.isNumeric(left) && Expression.isNumeric(right)) {
                return this.addSubNumerics(<NumericExpression>left, <NumericExpression>right, (a, b) => a + b);
            }

            // ensure left is a number
            let swapped = false;
            if (Expression.isNumeric(right)) {
                [left, right] = [right, left];
                swapped = true;
            }

            if (Expression.isNumeric(left) && left.isZero()) {
                return right;
            }

            // TODO: handle more cases
            if (swapped) {
                [left, right] = [right, left];
            }

            return new BinaryExpression(left, right, Operators.AddOperator);
        }
    );
    static readonly SubtractOperator: BinaryOperator = new BinaryOperator(
        '-',
        (left, right) => this.addSubNumerics(left, right, (a, b) => a - b),
        (left, right) => {
            if (Expression.isNumeric(left) && Expression.isNumeric(right)) {
                return this.addSubNumerics(<NumericExpression>left, <NumericExpression>right, (a, b) => a - b);
            }

            if (Expression.isNumeric(right) && right.isZero()) {
                return left;
            }

            // TODO: handle more cases, like same expression on both sides or left is zero => negate right
            return new BinaryExpression(left, right, Operators.SubtractOperator);
        }
    );
    static readonly MultiplyOperator: BinaryOperator = new BinaryOperator(
        '*',
        (left, right) => this.multiplyNumerics(left, right),
        (left, right) => {
            if (Expression.isNumeric(left) && Expression.isNumeric(right)) {
                return this.multiplyNumerics(<NumericExpression>left, <NumericExpression>right);
            }

            // ensure left is a number
            let swapped = false;
            if (Expression.isNumeric(right)) {
                [left, right] = [right, left];
                swapped = true;
            }

            if (Expression.isNumeric(left) && left.isOne()) {
                return right;
            }

            if (Expression.isNumeric(left) && left.isZero()) {
                return new IntegerExpression(0);
            }

            // TODO: handle more cases
            if (swapped) {
                [left, right] = [right, left];
            }
            return new BinaryExpression(left, right, Operators.MultiplyOperator);
        }
    );
    static readonly DivideOperator: BinaryOperator = new BinaryOperator(
        '/',
        (left, right) => this.divideNumerics(left, right),
        (left, right) => {
            if (Expression.isNumeric(left) && Expression.isNumeric(right)) {
                return this.divideNumerics(<NumericExpression>left, <NumericExpression>right);
            }

            if (Expression.isNumeric(right)) {
                if (right.isOne()) {
                    return left;
                } else if (right.isZero()) {
                    throw new Error('Division by zero');
                }
            }

            if (Expression.isNumeric(left) && left.isZero()) {
                return new IntegerExpression(0);
            }

            // TODO: handle more cases
            return new BinaryExpression(left, right, Operators.DivideOperator);
        }
    );
    static readonly ExponentiateOperator: BinaryOperator = new BinaryOperator(
        '^',
        (left, right) => this.exponentiateNumerics(left, right),
        (left, right) => {
            if (Expression.isNumeric(right)) {
                if (right.isZero()) {
                    return new IntegerExpression(1);
                } else if (right.isOne()) {
                    return left;
                }
            }

            if (Expression.isNumeric(left)) {
                if (left.isZero()) {
                    return new IntegerExpression(0);
                } else if (left.isOne()) {
                    return new IntegerExpression(1);
                }
            }

            return new BinaryExpression(left, right, Operators.ExponentiateOperator);
        }
    );

    static readonly WellKnownOperators: Operator[] = [
        Operators.NegateOperator,
        Operators.FactorialOperator,
        Operators.AddOperator,
        Operators.SubtractOperator,
        Operators.MultiplyOperator,
        Operators.DivideOperator,
        Operators.ExponentiateOperator,
    ];

    static operatorFromSymbol(symbol: string): Operator {
        const operator = Operators.WellKnownOperators.find(op => op.symbol === symbol);
        if (!operator) {
            throw new Error(`Unknown operator: ${symbol}`);
        }

        return operator;
    }

    private static addSubNumerics(left: NumericExpression, right: NumericExpression, op: (a: number, b: number) => number): NumericExpression {
        // if anything is a float, we're forever stuck here
        if (Expression.isFloat(left) || Expression.isFloat(right)) {
            return new FloatExpression(op(left.asFloat().value, right.asFloat().value));
        }

        // otherwise treat both as a ratio and simplify
        const leftRatio = Expression.isRatio(left) ? left : new RatioExpression((<IntegerExpression>left).value, 1);
        const rightRatio = Expression.isRatio(right) ? right : new RatioExpression((<IntegerExpression>right).value, 1);
        const denominator = leftRatio.denominator * rightRatio.denominator;
        const numerator = op(leftRatio.numerator * rightRatio.denominator, rightRatio.numerator * leftRatio.denominator);
        const result = new RatioExpression(numerator, denominator);
        const reduced = result.reduce();
        return reduced;
    }

    private static multiplyNumerics(left: NumericExpression, right: NumericExpression): NumericExpression {
        // if anything is a float, we're forever stuck here
        if (Expression.isFloat(left) || Expression.isFloat(right)) {
            return new FloatExpression(left.asFloat().value * right.asFloat().value);
        }

        // otherwise treat both as a ratio and simplify
        const leftRatio = Expression.isRatio(left) ? left : new RatioExpression((<IntegerExpression>left).value, 1);
        const rightRatio = Expression.isRatio(right) ? right : new RatioExpression((<IntegerExpression>right).value, 1);
        const numerator = leftRatio.numerator * rightRatio.numerator;
        const denominator = leftRatio.denominator * rightRatio.denominator;
        const result = new RatioExpression(numerator, denominator);
        const reduced = result.reduce();
        return reduced;
    }

    private static divideNumerics(left: NumericExpression, right: NumericExpression): NumericExpression {
        // if anything is a float, we're forever stuck here
        if (Expression.isFloat(left) || Expression.isFloat(right)) {
            return new FloatExpression(left.asFloat().value / right.asFloat().value);
        }

        // otherwise treat both as a ratio and simplify
        const leftRatio = Expression.isRatio(left) ? left : new RatioExpression((<IntegerExpression>left).value, 1);
        const rightRatio = Expression.isRatio(right) ? right : new RatioExpression((<IntegerExpression>right).value, 1);
        const rightInverted = new RatioExpression(rightRatio.denominator, rightRatio.numerator);
        return this.multiplyNumerics(leftRatio, rightInverted);
    }

    private static exponentiateNumerics(left: NumericExpression, right: NumericExpression): NumericExpression {
        // always treat as a float
        // TODO: make this better
        const leftFloat = left.asFloat().value;
        const rightFloat = right.asFloat().value;
        return new FloatExpression(leftFloat ** rightFloat);
    }
}
