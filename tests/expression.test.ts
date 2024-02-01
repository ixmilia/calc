import { expect } from 'chai';
import { Expression } from '../src/expression.js';

describe('expression', () => {
    describe('tokens', () => {
        it('can be parsed', () => {
            const tokens = Expression.tokenize('-3+4');
            expect(tokens).to.deep.equal([
                {
                    associativity: 'right',
                    position: 0,
                    precedence: 5,
                    text: '~',
                    type: 'operator',
                    value: '~'
                },
                {
                    position: 1,
                    text: '3',
                    type: 'number',
                    value: 3
                },
                {
                    associativity: 'left',
                    position: 2,
                    precedence: 2,
                    text: '+',
                    type: 'operator',
                    value: '+'
                },
                {
                    position: 3,
                    text: '4',
                    type: 'number',
                    value: 4
                }
            ])
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
