import { BinaryExpression, Expression, NumberExpression } from "./expression.js";

export abstract class Operator {
    constructor(readonly symbol: string, readonly minimumArgumentCount: number, readonly maximumArgumentCount: number) {
        if (minimumArgumentCount < 0) {
            throw new Error('minimumArgumentCount must be non-negative');
        }

        if (maximumArgumentCount < minimumArgumentCount) {
            throw new Error('maximumArgumentCount must be greater than or equal to minimumArgumentCount');
        }
    }

    evaluate(args: Expression[], variables: { [key: string]: Expression }): Expression {
        if (args.length < this.minimumArgumentCount || args.length > this.maximumArgumentCount) {
            throw new Error(`Expected between ${this.minimumArgumentCount} and ${this.maximumArgumentCount} arguments, got ${args.length}`);
        }

        const evaluatedArgs = args.map(a => a.evaluate(variables));
        if (evaluatedArgs.every(a => Expression.isNumber(a))) {
            const evaluatedNumericArgs = evaluatedArgs.map(a => (<NumberExpression>a).value);
            const numericResult = this.evaluateNumericInternal(evaluatedNumericArgs);
            return new NumberExpression(numericResult);
        }

        return this.evaluateExpressionInternal(evaluatedArgs);
    }

    protected abstract evaluateNumericInternal(args: number[]): number;
    protected abstract evaluateExpressionInternal(args: Expression[]): Expression;
}

export class UnaryOperator extends Operator {
    constructor(symbol: string, private numericOperation: (operand: number) => number, private expressionOperation: (operand: Expression) => Expression) {
        super(symbol, 1, 1);
    }

    protected evaluateNumericInternal(args: number[]): number {
        return this.numericOperation(args[0]);
    }

    protected evaluateExpressionInternal(args: Expression[]): Expression {
        return this.expressionOperation(args[0]);
    }
}

export class BinaryOperator extends Operator {
    constructor(symbol: string, private numericOperation: (left: number, right: number) => number, private expressionOperation: (left: Expression, right: Expression) => Expression) {
        super(symbol, 2, 2);
    }

    protected evaluateNumericInternal(args: number[]): number {
        return this.numericOperation(args[0], args[1]);
    }

    protected evaluateExpressionInternal(args: Expression[]): Expression {
        return this.expressionOperation(args[0], args[1]);
    }
}

export class Operators {
    static readonly NegateOperator = new UnaryOperator('~', operand => -operand, operand => operand);
    static readonly FactorialOperator = new UnaryOperator('!', operand => {
        if (operand < 0) {
            return Number.NEGATIVE_INFINITY;
        }

        let result = 1;
        for (let i = operand; i > 1; i--) {
            result *= i;
        }

        return result;
    }, operand => operand);
    static readonly AddOperator: BinaryOperator = new BinaryOperator('+', (left, right) => left + right, (left, right) => {
        if (Expression.isNumber(left) && Expression.isNumber(right)) {
            return new NumberExpression((<NumberExpression>left).value + (<NumberExpression>right).value);
        }

        // ensure left is a number
        let swapped = false;
        if (Expression.isNumber(right)) {
            [left, right] = [right, left];
            swapped = true;
        }

        if (Expression.isNumber(left) && left.value == 0) {
            return right;
        }

        // TODO: handle more cases
        if (swapped) {
            [left, right] = [right, left];
        }

        return new BinaryExpression(left, right, Operators.AddOperator);
    });
    static readonly SubtractOperator: BinaryOperator = new BinaryOperator('-', (left, right) => left - right, (left, right) => {
        if (Expression.isNumber(left) && Expression.isNumber(right)) {
            return new NumberExpression((<NumberExpression>left).value - (<NumberExpression>right).value);
        }

        if (Expression.isNumber(right) && right.value == 0) {
            return left;
        }

        // TODO: handle more cases, like same expression on both sides
        return new BinaryExpression(left, right, Operators.SubtractOperator);
    });
    static readonly MultiplyOperator: BinaryOperator = new BinaryOperator('*', (left, right) => left * right, (left, right) => {
        if (Expression.isNumber(left) && Expression.isNumber(right)) {
            return new NumberExpression((<NumberExpression>left).value * (<NumberExpression>right).value);
        }

        // ensure left is a number
        let swapped = false;
        if (Expression.isNumber(right)) {
            [left, right] = [right, left];
            swapped = true;
        }

        if (Expression.isNumber(left) && left.value == 1) {
            return right;
        }

        if (Expression.isNumber(left) && left.value == 0) {
            return new NumberExpression(0);
        }

        // TODO: handle more cases
        if (swapped) {
            [left, right] = [right, left];
        }
        return new BinaryExpression(left, right, Operators.MultiplyOperator);
    });
    static readonly DivideOperator: BinaryOperator = new BinaryOperator('/', (left, right) => left / right, (left, right) => {
        if (Expression.isNumber(left) && Expression.isNumber(right)) {
            return new NumberExpression((<NumberExpression>left).value / (<NumberExpression>right).value);
        }

        if (Expression.isNumber(right)) {
            if (right.value == 1) {
                return left;
            } else if (right.value == 0) {
                throw new Error('Division by zero');
            }
        }

        if (Expression.isNumber(left) && left.value == 0) {
            return new NumberExpression(0);
        }

        // TODO: handle more cases
        return new BinaryExpression(left, right, Operators.DivideOperator);
    });
    static readonly ExponentiateOperator: BinaryOperator = new BinaryOperator('^', (left, right) => left ** right, (left, right) => {
        if (Expression.isNumber(right)) {
            if (right.value === 0) {
                return new NumberExpression(1);
            } else if (right.value === 1) {
                return left;
            }
        }

        if (Expression.isNumber(left)) {
            if (left.value === 0) {
                return new NumberExpression(0);
            } else if (left.value === 1) {
                return new NumberExpression(1);
            }
        }

        return new BinaryExpression(left, right, Operators.ExponentiateOperator);
    });

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
}
