import { expect } from 'chai';
import { Expression } from '../src/expression.js';

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
    });
});
