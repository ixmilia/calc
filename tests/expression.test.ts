import { expect } from 'chai';
import { Expression, NumberExpression } from '../src/expression.js';

describe('expression', () => {
    describe('parsing', () => {
        it('can be parsed', () => {
            const expr = Expression.parse('-3+4');
            const o: any = expr;
            expect(expr).to.deep.contain({
                left: {
                    operator: {
                        ...o.left.operator,
                        symbol: '~',
                    },
                    operand: {
                        value: 3,
                    },
                },
                operator: {
                    ...o.operator,
                    symbol: '+',
                },
                right: {
                    value: 4,
                },
            })
        });
    });
    describe('evaluation', () => {
        it('can evaluate', () => {
            const result = Expression.evaluate('-3+4');
            expect(result).to.equal(1);
        });
        it('applies the order of operations', () => {
            const result = Expression.evaluate('3+4*5');
            expect(result).to.equal(23);
        });
        it('expands built-in variables', () => {
            const result = Expression.evaluate('pi*2');
            expect(result).to.equal(Math.PI * 2);
        });
        it('expands custom variables', () => {
            const result = Expression.evaluate('x*2', { x: new NumberExpression(3) });
            expect(result).to.equal(6);
        });
        it('honors parentheses', () => {
            const result = Expression.evaluate('(3+4)*(2+3)');
            expect(result).to.equal(35);
        });
        it.only('computes factorials', () => {
            const result = Expression.evaluate('5!');
            expect(result).to.equal(120);
        });
    });
});
