import { Expression } from './expression.js';

function main() {
    document.getElementById('the-button')!.addEventListener('click', () => {
        const e = new Expression();
        const message = `The expression is ${e}`;
        alert(message);
    });
}

window.addEventListener('DOMContentLoaded', main);
