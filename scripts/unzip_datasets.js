const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');

/**
 * Recursively find all zip files and extract them to their respective folders
 */
function walkAndUnzip(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            walkAndUnzip(fullPath);
        } else if (file.endsWith('.zip')) {
            const extractTo = path.join(dir, file.replace('.zip', ''));
            
            if (fs.existsSync(extractTo)) {
                console.log(`[Skipping] Already exists: ${extractTo}`);
                continue;
            }

            console.log(`[Unzipping] ${fullPath} -> ${extractTo}`);
            try {
                const zip = new AdmZip(fullPath);
                zip.extractAllTo(extractTo, true);
                console.log(`[Success]  Extracted ${file}`);
            } catch (err) {
                console.error(`[Error]    Failed to unzip ${file}:`, err.message);
            }
        }
    }
}

const DATASET_ROOT = path.join(__dirname, '..', 'dataset');
console.log(`Starting full extraction in ${DATASET_ROOT}...`);
walkAndUnzip(DATASET_ROOT);
console.log('Extraction process finished.');
