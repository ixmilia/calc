import { expect } from 'chai';
import { Expression, NumberExpression } from '../src/expression.js';

describe('expression', () => {
    describe('parsing', () => {
        it('can be parsed', () => {
            const expr = Expression.parse('-3+4');
            const o: any = expr;
            expect(expr).to.deep.contain({
                left: {
                    ...o.left,
                    operator: {
                        ...o.left.operator,
                        symbol: '~',
                    },
                    operand: {
                        ...o.left.operand,
                        value: 3,
                    },
                },
                operator: {
                    ...o.operator,
                    symbol: '+',
                },
                right: {
                    ...o.right,
                    value: 4,
                },
            })
        });
    });
    describe('evaluation', () => {
        function evaluateAsNumber(expression: string, variables?: { [key: string]: Expression }): number {
            const result = Expression.evaluate(expression, variables);
            if (result instanceof NumberExpression) {
                return result.value;
            }

            throw new Error(`Expected a number expression, got: ${JSON.stringify(result)}`);
        }

        it('can evaluate', () => {
            const result = evaluateAsNumber('-3+4');
            expect(result).to.equal(1);
        });
        it('applies the order of operations', () => {
            const result = evaluateAsNumber('3+4*5');
            expect(result).to.equal(23);
        });
        it('expands built-in variables', () => {
            const result = evaluateAsNumber('pi*2');
            expect(result).to.equal(Math.PI * 2);
        });
        it('expands custom variables', () => {
            const result = evaluateAsNumber('x*2', { x: new NumberExpression(3) });
            expect(result).to.equal(6);
        });
        it('honors parentheses', () => {
            const result = evaluateAsNumber('(3+4)*(2+3)');
            expect(result).to.equal(35);
        });
        it('computes factorials', () => {
            const result = evaluateAsNumber('5!');
            expect(result).to.equal(120);
        });
        it('can apply built-in functions', () => {
            const result = evaluateAsNumber('min(3, 5)');
            expect(result).to.equal(3);
        });
        it('can apply functions with expression arguments', () => {
            const result = evaluateAsNumber('sum(x^2,x,1,3)');
            expect(result).to.equal(14);
        });
        it('computes simple differentials', () => {
            const result = Expression.evaluate('diff(x^3+2*x, x)');
            expect(result.toString()).to.equal('((3*(x^2))+2)');
        });
    });
});
