import { Expression } from "./expression.js";

function main() {
    const results = <HTMLTextAreaElement>document.getElementById('results')!;
    const input = <HTMLInputElement>document.getElementById('input')!;
    const evalButton = <HTMLButtonElement>document.getElementById('eval')!;

    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            evalButton.click();
            input.focus();
        }
    });
    evalButton.addEventListener('click', () => {
        const result = Expression.evaluate(input.value);
        results.textContent += `${input.value}\n\t${result}\n`;
        results.scrollTop = results.scrollHeight;
        input.value = '';
    });
}

window.addEventListener('DOMContentLoaded', main);
