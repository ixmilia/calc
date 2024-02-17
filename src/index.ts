import { Expression, Mode } from "./expression.js";

function main() {
    const results = <HTMLTextAreaElement>document.getElementById('results')!;
    const input = <HTMLInputElement>document.getElementById('input')!;
    const evalButton = <HTMLButtonElement>document.getElementById('eval')!;
    const modeRadians = <HTMLInputElement>document.getElementById('mode-radians')!;
    const _modeDegrees = <HTMLInputElement>document.getElementById('mode-degrees')!;

    modeRadians.checked = true;

    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            evalButton.click();
            input.focus();
        }
    });
    evalButton.addEventListener('click', () => {
        const mode = modeRadians.checked ? Mode.Radians : Mode.Degrees;
        let result: string;
        try {
            const numericResult = Expression.evaluate(input.value, mode);
            result = numericResult.toString();
        } catch (e) {
            result = (<any>e).toString();
        }
        results.textContent += `${input.value}\n\t${result}\n`;
        results.scrollTop = results.scrollHeight;
        input.value = '';
    });
}

window.addEventListener('DOMContentLoaded', main);
