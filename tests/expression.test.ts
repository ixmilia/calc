import { expect } from 'chai';
import { Expression, FloatExpression, IntegerExpression, Mode, NumericExpression } from '../src/expression.js';

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
                        _value: 3,
                    },
                },
                operator: {
                    ...o.operator,
                    symbol: '+',
                },
                right: {
                    ...o.right,
                    _value: 4,
                },
            })
        });
        it('correctly parses integers', () => {
            const expr = Expression.parse('123');
            expect(expr.type).to.equal('integer');
        });
        it('correctly parses floats with trailing digits', () => {
            const expr = Expression.parse('123.456');
            expect(expr.type).to.equal('float');
        });
        it('correctly parses floats with trailing decimal', () => {
            const expr = Expression.parse('123.');
            expect(expr.type).to.equal('float');
        });
    });
    describe('evaluation', () => {
        function evaluate(expression: string, variables?: { [key: string]: Expression }): NumericExpression {
            const result = Expression.evaluate(expression, Mode.Radians, variables);
            if (result instanceof NumericExpression) {
                return result;
            }

            throw new Error(`Expected a numeric expression, got: ${JSON.stringify(result)}`);
        }
        function evaluateAsNumber(expression: string, variables?: { [key: string]: Expression }): number {
            const result = Expression.evaluate(expression, Mode.Radians, variables);
            if (result instanceof NumericExpression) {
                return result.asFloat().value;
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
        it('simplifies ratios from integer operations', () => {
            const result = evaluate('2/4');
            expect(result.toString()).to.equal('1/2');
        });
        it('reverts to float for non-integer operations', () => {
            const result = evaluate('2/4.');
            expect(result.toString()).to.equal('0.5');
        });
        it('expands built-in variables', () => {
            const result = evaluateAsNumber('pi*2');
            expect(result).to.equal(Math.PI * 2);
        });
        it('expands custom variables', () => {
            const result = evaluateAsNumber('x*2', { x: new IntegerExpression(3) });
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
        it('computes trig functions in the appropriate mode: degrees', () => {
            const result = Expression.evaluate('sin(90)', Mode.Degrees);
            expect(Expression.isFloat(result)).to.be.true;
            expect((<FloatExpression>result).value).to.be.closeTo(1, 0.0001);
        });
        it('computes trig functions in the appropriate mode: radians', () => {
            const result = Expression.evaluate('sin(pi/2)', Mode.Radians);
            expect(Expression.isFloat(result)).to.be.true;
            expect((<FloatExpression>result).value).to.be.closeTo(1, 0.0001);
        });
        it('computes arc trig functions in the appropriate mode: degrees', () => {
            const result = Expression.evaluate('asin(1)', Mode.Degrees);
            expect(Expression.isFloat(result)).to.be.true;
            expect((<FloatExpression>result).value).to.be.closeTo(90, 0.0001);
        });
        it('computes arc trig functions in the appropriate mode: radians', () => {
            const result = Expression.evaluate('asin(1)', Mode.Radians);
            expect(Expression.isFloat(result)).to.be.true;
            expect((<FloatExpression>result).value).to.be.closeTo(Math.PI / 2, 0.0001);
        });
    });
});
