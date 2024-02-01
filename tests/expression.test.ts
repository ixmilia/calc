import { expect } from 'chai';
import { Expression } from '../src/expression.js';

describe('asdf', () => {
    it('should be true-ish', () => {
        const e = new Expression();
        expect(e.doSomething()).to.be.true;
    });
});
