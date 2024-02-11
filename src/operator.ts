export abstract class Operator {
    constructor(readonly symbol: string, readonly minimumArgumentCount: number, readonly maximumArgumentCount: number) {
        if (minimumArgumentCount < 0) {
            throw new Error('minimumArgumentCount must be non-negative');
        }

        if (maximumArgumentCount < minimumArgumentCount) {
            throw new Error('maximumArgumentCount must be greater than or equal to minimumArgumentCount');
        }
    }

    evaluate(args: number[]): number {
        if (args.length < this.minimumArgumentCount || args.length > this.maximumArgumentCount) {
            throw new Error(`Expected between ${this.minimumArgumentCount} and ${this.maximumArgumentCount} arguments, got ${args.length}`);
        }

        return this.evaluateInternal(args);
    }

    protected abstract evaluateInternal(args: number[]): number;
}

export class UnaryOperator extends Operator {
    constructor(symbol: string, private operation: (operand: number) => number) {
        super(symbol, 1, 1);
    }

    evaluateInternal(args: number[]) {
        return this.operation(args[0]);
    }
}

export class BinaryOperator extends Operator {
    constructor(symbol: string, private operation: (left: number, right: number) => number) {
        super(symbol, 2, 2);
    }

    evaluateInternal(args: number[]) {
        return this.operation(args[0], args[1]);
    }
}

export class Operators {
    static readonly NegateOperator = new UnaryOperator('~', operand => -operand);
    static readonly FactorialOperator = new UnaryOperator('!', operand => {
        if (operand < 0) {
            return Number.NEGATIVE_INFINITY;
        }

        let result = 1;
        for (let i = operand; i > 1; i--) {
            result *= i;
        }

        return result;
    });
    static readonly AddOperator = new BinaryOperator('+', (left, right) => left + right);
    static readonly SubtractOperator = new BinaryOperator('-', (left, right) => left - right);
    static readonly MultiplyOperator = new BinaryOperator('*', (left, right) => left * right);
    static readonly DivideOperator = new BinaryOperator('/', (left, right) => left / right);
    static readonly ExponentiateOperator = new BinaryOperator('^', (left, right) => left ** right);

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
