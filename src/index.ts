import { Expression, FloatExpression, Mode, NumericExpression } from "./expression.js";

function main() {
    const results = <HTMLTextAreaElement>document.getElementById('results')!;
    const input = <HTMLInputElement>document.getElementById('input')!;
    const evalButton = <HTMLButtonElement>document.getElementById('eval')!;
    const modeRadians = <HTMLInputElement>document.getElementById('mode-radians')!;
    const _modeDegrees = <HTMLInputElement>document.getElementById('mode-degrees')!;
    const graphCanvas = <HTMLCanvasElement>document.getElementById('graph')!;
    const graphButton = <HTMLButtonElement>document.getElementById('draw')!;
    const functionInput = <HTMLInputElement>document.getElementById('function')!;
    const minxInput = <HTMLInputElement>document.getElementById('minx')!;
    const maxxInput = <HTMLInputElement>document.getElementById('maxx')!;
    const minyInput = <HTMLInputElement>document.getElementById('miny')!;
    const maxyInput = <HTMLInputElement>document.getElementById('maxy')!;

    modeRadians.checked = true;
    drawGraphBackground(graphCanvas.getContext('2d')!, minxInput.valueAsNumber, maxxInput.valueAsNumber, minyInput.valueAsNumber, maxyInput.valueAsNumber);

    function doGraphDraw() {
        const mode = modeRadians.checked ? Mode.Radians : Mode.Degrees;
        drawGraph(functionInput.value, graphCanvas, mode, minxInput.valueAsNumber, maxxInput.valueAsNumber, minyInput.valueAsNumber, maxyInput.valueAsNumber);
    }

    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            evalButton.click();
            input.focus();
        }
    });
    functionInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            graphButton.click();
            functionInput.focus();
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
    graphButton.addEventListener('click', () => {
        doGraphDraw();
    });
}

function drawGraph(expression: string, graphCanvas: HTMLCanvasElement, mode: Mode, xmin: number, xmax: number, ymin: number, ymax: number) {
    const context = graphCanvas.getContext('2d');
    if (!context) {
        return;
    }

    const isPointVisible = (x: number, y: number) => {
        return x >= 0 && x <= graphCanvas.width && y >= 0 && y <= graphCanvas.height;
    };

    context.clearRect(0, 0, graphCanvas.width, graphCanvas.height);
    drawGraphBackground(context, xmin, xmax, ymin, ymax);

    context.lineWidth = 1.0;
    context.strokeStyle = 'black';
    context.beginPath();
    let isDrawing = false;
    for (let xcoord = 0; xcoord < graphCanvas.width; xcoord++) {
        const x = xmin + xcoord / graphCanvas.width * (xmax - xmin);
        const y = Expression.evaluate(expression, mode, { 'x': new FloatExpression(x) });
        if (Expression.isNumeric(y)) {
            const yFloat = (<NumericExpression>y).asFloat();
            const ycoord = graphCanvas.height - (yFloat.value - ymin) / (ymax - ymin) * graphCanvas.height;
            const isVisible = isPointVisible(xcoord, ycoord);
            if (isDrawing || isVisible) {
                context.lineTo(xcoord, ycoord);
            } else {
                context.moveTo(xcoord, ycoord);
            }

            isDrawing = isVisible;
        }
    }

    context.stroke();
}

function drawGraphBackground(context: CanvasRenderingContext2D, xmin: number, xmax: number, ymin: number, ymax: number) {
    const width = context.canvas.width;
    const height = context.canvas.height;
    const xScale = (xmax - xmin) / width;
    const yScale = (ymax - ymin) / height;

    // draw axes
    context.lineWidth = 1.5;
    context.strokeStyle = 'lightgray';
    const yAxisXCoordinate = -xmin / xScale;
    context.beginPath();
    context.moveTo(yAxisXCoordinate, 0);
    context.lineTo(yAxisXCoordinate, height);
    context.stroke();
    const xAxisYCoordinate = height - (-ymin / yScale);
    context.beginPath();
    context.moveTo(0, xAxisYCoordinate);
    context.lineTo(width, xAxisYCoordinate);
    context.stroke();

    // draw grid
    context.lineWidth = 0.5;
    context.strokeStyle = 'lightgray';
    context.beginPath();
    for (let x = Math.floor(xmin); x < Math.floor(xmax); x++) {
        const xc = (x - xmin) / xScale;
        context.moveTo(xc, 0);
        context.lineTo(xc, height);
    }

    for (let y = Math.floor(ymin); y < Math.floor(ymax); y++) {
        const yc = height - (y - ymin) / yScale;
        context.moveTo(0, yc);
        context.lineTo(width, yc);
    }

    context.stroke();
}

window.addEventListener('DOMContentLoaded', main);
