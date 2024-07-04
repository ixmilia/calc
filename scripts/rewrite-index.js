import { execSync } from 'child_process';
import * as fs from 'fs';

if (process.argv.length !== 3) {
    console.error('Missing required argument: path to file');
    process.exit(1);
}

const filePath = process.argv[2];

function commandText(command) {
    return execSync(command).toString().trim();
}

const replacements = {
    '%COMMIT%': commandText('git rev-parse HEAD'),
    '%DATE%': commandText('git show --no-patch --format=%ci HEAD'),
}

let fileText = fs.readFileSync(filePath, 'utf8');
for (const [key, value] of Object.entries(replacements)) {
    fileText = fileText.replace(key, value);
}

fs.writeFileSync(filePath, fileText);
