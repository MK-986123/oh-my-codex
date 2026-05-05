import { promises as fs } from 'fs';
import * as path from 'path';

export interface RepoMapOptions {
  dir: string;
  maxFiles?: number;
  maxDepth?: number;
}

const CODE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.c', '.cpp', '.h',
  '.cs', '.rb', '.swift', '.kt', '.scala', '.vue', '.svelte',
]);

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', 'target', '__pycache__', '.omx', '.next', 'coverage'
]);

interface ExtractedSymbol {
  name: string;
  kind: string;
  line: number;
}

const SYMBOL_PATTERNS: Array<{ kind: string; re: RegExp }> = [
  { kind: 'function', re: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/m },
  { kind: 'class', re: /^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/m },
  { kind: 'interface', re: /^(?:export\s+)?interface\s+(\w+)/m },
  { kind: 'type', re: /^(?:export\s+)?type\s+(\w+)\s*=/m },
  { kind: 'enum', re: /^(?:export\s+)?(?:const\s+)?enum\s+(\w+)/m },
  // Python
  { kind: 'function', re: /^(?:async\s+)?def\s+(\w+)/m },
  { kind: 'class', re: /^class\s+(\w+)/m },
  // Go
  { kind: 'function', re: /^func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)/m },
  { kind: 'type', re: /^type\s+(\w+)\s+(?:struct|interface)/m },
  // Rust
  { kind: 'function', re: /^(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/m },
  { kind: 'struct', re: /^(?:pub\s+)?struct\s+(\w+)/m },
  { kind: 'enum', re: /^(?:pub\s+)?enum\s+(\w+)/m },
  { kind: 'trait', re: /^(?:pub\s+)?trait\s+(\w+)/m },
];

function extractSymbolsLite(content: string): ExtractedSymbol[] {
  const symbols: ExtractedSymbol[] = [];
  const lines = content.split('\n');
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { kind, re } of SYMBOL_PATTERNS) {
      const match = line.match(re);
      if (match && match[1]) {
        const key = `${kind}:${match[1]}`;
        if (!seen.has(key)) {
          seen.add(key);
          symbols.push({
            name: match[1],
            kind,
            line: i + 1,
          });
        }
      }
    }
  }
  return symbols;
}

export async function generateRepoMap(options: RepoMapOptions): Promise<string> {
  const { dir, maxFiles = 200, maxDepth = 6 } = options;
  let fileCount = 0;
  let mapOutput = `Repository Map for ${path.basename(dir) || dir}\n`;
  mapOutput += `=================================================\n\n`;

  async function walk(currentDir: string, depth: number): Promise<void> {
    if (depth > maxDepth || fileCount >= maxFiles) return;

    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (fileCount >= maxFiles) break;

        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name.startsWith('.') || IGNORE_DIRS.has(entry.name)) continue;
          await walk(fullPath, depth + 1);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (CODE_EXTENSIONS.has(ext)) {
            try {
              const content = await fs.readFile(fullPath, 'utf-8');
              const symbols = extractSymbolsLite(content);

              if (symbols.length > 0) {
                fileCount++;
                const relPath = path.relative(dir, fullPath);
                mapOutput += `${relPath}:\n`;
                for (const sym of symbols) {
                  mapOutput += `  - ${sym.kind}: ${sym.name} (Line ${sym.line})\n`;
                }
                mapOutput += `\n`;
              }
            } catch (err) {
              // Ignore read errors
            }
          }
        }
      }
    } catch (err) {
       // Ignore readdir errors
    }
  }

  await walk(dir, 0);

  if (fileCount === 0) {
    return `${mapOutput}No structural symbols found or directory is empty.\n`;
  }

  if (fileCount >= maxFiles) {
    mapOutput += `\n... Map truncated at ${maxFiles} files.\n`;
  }

  return mapOutput;
}
