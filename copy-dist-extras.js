#!/usr/bin/env node
/**
 * Copy router.js and utils.js to dist/ with comments stripped
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function stripComments(code) {
    let result = '';
    let i = 0;
    const len = code.length;

    while (i < len) {
        // Single-line comment
        if (code[i] === '/' && code[i + 1] === '/') {
            i += 2;
            while (i < len && code[i] !== '\n') i++;
            if (i < len) {
                result += '\n';
                i++;
            }
            continue;
        }

        // Multi-line comment
        if (code[i] === '/' && code[i + 1] === '*') {
            i += 2;
            while (i < len - 1) {
                if (code[i] === '*' && code[i + 1] === '/') break;
                i++;
            }
            i += 2;
            continue;
        }

        // String literals
        if (code[i] === '"' || code[i] === "'") {
            const quote = code[i];
            result += code[i];
            i++;
            while (i < len) {
                if (code[i] === '\\' && i + 1 < len) {
                    result += code[i] + code[i + 1];
                    i += 2;
                } else if (code[i] === quote) {
                    result += code[i];
                    i++;
                    break;
                } else {
                    result += code[i];
                    i++;
                }
            }
            continue;
        }

        // Template literals
        if (code[i] === '`') {
            result += code[i];
            i++;
            while (i < len) {
                if (code[i] === '\\' && i + 1 < len) {
                    result += code[i] + code[i + 1];
                    i += 2;
                } else if (code[i] === '$' && i + 1 < len && code[i + 1] === '{') {
                    result += code[i] + code[i + 1];
                    i += 2;
                    let braceDepth = 1;
                    while (i < len && braceDepth > 0) {
                        if (code[i] === '{') braceDepth++;
                        if (code[i] === '}') braceDepth--;
                        result += code[i];
                        i++;
                    }
                } else if (code[i] === '`') {
                    result += code[i];
                    i++;
                    break;
                } else {
                    result += code[i];
                    i++;
                }
            }
            continue;
        }

        result += code[i];
        i++;
    }

    return result;
}

function copyFile(src, dest, stripCommentsFlag = true) {
    let content = fs.readFileSync(src, 'utf-8');

    if (stripCommentsFlag) {
        content = stripComments(content);
        // Clean up excessive newlines
        content = content.replace(/\n{3,}/g, '\n\n');
    }

    fs.writeFileSync(dest, content);
    const size = (content.length / 1024).toFixed(2);
    console.log(`✓ Copied ${path.basename(src)} → ${path.basename(dest)} (${size} KB)`);
}

function main() {
    console.log('Copying router.js and utils.js to dist/...\n');

    const distDir = path.join(__dirname, 'app', 'dist');
    if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
    }

    copyFile(
        path.join(__dirname, 'app', 'lib', 'router.js'),
        path.join(distDir, 'router.js')
    );

    copyFile(
        path.join(__dirname, 'app', 'lib', 'utils.js'),
        path.join(distDir, 'utils.js')
    );

    console.log('\n✓ Done!\n');
}

main();
