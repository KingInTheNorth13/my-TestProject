#!/usr/bin/env node

/**
 * File Batching Utilities
 * 
 * This utility helps with batching file operations to avoid performance issues
 * when adding large numbers of files to git repositories.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class FileBatcher {
    constructor(options = {}) {
        this.batchSize = options.batchSize || 50;
        this.verbose = options.verbose || false;
        this.dryRun = options.dryRun || false;
        this.delay = options.delay || 100; // ms between batches
    }

    /**
     * Add files to git in batches
     * @param {string[]} files - Array of file paths to add
     */
    async addFilesBatched(files) {
        if (!Array.isArray(files) || files.length === 0) {
            throw new Error('Files must be a non-empty array');
        }

        const batches = this.createBatches(files);
        
        if (this.verbose) {
            console.log(`Adding ${files.length} files in ${batches.length} batches of max ${this.batchSize} files each`);
        }

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            const batchNum = i + 1;
            
            if (this.verbose) {
                console.log(`Processing batch ${batchNum}/${batches.length} (${batch.length} files)`);
            }

            try {
                if (!this.dryRun) {
                    // Use git add with explicit file list to avoid shell limitations
                    const gitAddCommand = `git add ${batch.map(f => `"${f}"`).join(' ')}`;
                    execSync(gitAddCommand, { 
                        stdio: this.verbose ? 'inherit' : 'pipe',
                        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
                    });
                } else {
                    console.log(`[DRY RUN] Would add: ${batch.join(', ')}`);
                }

                // Small delay between batches to avoid overwhelming the system
                if (i < batches.length - 1 && this.delay > 0) {
                    await this.sleep(this.delay);
                }
            } catch (error) {
                console.error(`Error processing batch ${batchNum}:`, error.message);
                throw error;
            }
        }

        if (this.verbose && !this.dryRun) {
            console.log(`Successfully added ${files.length} files to git staging area`);
        }
    }

    /**
     * Create batches from an array of files
     * @param {string[]} files - Array of file paths
     * @returns {string[][]} Array of file batches
     */
    createBatches(files) {
        const batches = [];
        for (let i = 0; i < files.length; i += this.batchSize) {
            batches.push(files.slice(i, i + this.batchSize));
        }
        return batches;
    }

    /**
     * Commit files in batches with descriptive messages
     * @param {string[]} files - Array of file paths to commit
     * @param {string} baseMessage - Base commit message
     */
    async commitFilesBatched(files, baseMessage = 'Add files') {
        const batches = this.createBatches(files);
        
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            const batchNum = i + 1;
            const totalBatches = batches.length;
            
            // Add the batch
            await this.addFilesBatched(batch);
            
            // Commit the batch
            const commitMessage = totalBatches > 1 
                ? `${baseMessage} (batch ${batchNum}/${totalBatches})`
                : baseMessage;
            
            if (!this.dryRun) {
                execSync(`git commit -m "${commitMessage}"`, {
                    stdio: this.verbose ? 'inherit' : 'pipe'
                });
            } else {
                console.log(`[DRY RUN] Would commit with message: "${commitMessage}"`);
            }

            if (this.verbose) {
                console.log(`Committed batch ${batchNum}/${totalBatches}`);
            }

            // Delay between commits
            if (i < batches.length - 1 && this.delay > 0) {
                await this.sleep(this.delay);
            }
        }
    }

    /**
     * Find all files in a directory recursively
     * @param {string} directory - Directory to search
     * @param {string[]} excludePatterns - Patterns to exclude (gitignore style)
     * @returns {string[]} Array of file paths
     */
    findFiles(directory, excludePatterns = []) {
        const files = [];
        const defaultExcludes = ['.git', 'node_modules', '.DS_Store', 'Thumbs.db'];
        const allExcludes = [...defaultExcludes, ...excludePatterns];

        const walkDir = (dir) => {
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const relativePath = path.relative(process.cwd(), fullPath);
                
                // Check if item should be excluded
                if (allExcludes.some(pattern => relativePath.includes(pattern))) {
                    continue;
                }
                
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    walkDir(fullPath);
                } else if (stat.isFile()) {
                    files.push(relativePath);
                }
            }
        };

        walkDir(directory);
        return files;
    }

    /**
     * Utility function for sleeping
     * @param {number} ms - Milliseconds to sleep
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get git status and suggest batching if needed
     */
    async analyzeGitStatus() {
        try {
            const status = execSync('git status --porcelain', { encoding: 'utf8' });
            const unstagedFiles = status
                .split('\n')
                .filter(line => line.trim() && (line.startsWith('??') || line.startsWith(' M') || line.startsWith(' A')))
                .map(line => line.substring(3));

            if (unstagedFiles.length > this.batchSize) {
                console.log(`⚠️  Found ${unstagedFiles.length} unstaged files.`);
                console.log(`💡 Consider using batched operations for better performance.`);
                console.log(`   Recommended batch size: ${this.batchSize} files`);
                return {
                    needsBatching: true,
                    fileCount: unstagedFiles.length,
                    files: unstagedFiles
                };
            }

            return {
                needsBatching: false,
                fileCount: unstagedFiles.length,
                files: unstagedFiles
            };
        } catch (error) {
            throw new Error(`Failed to analyze git status: ${error.message}`);
        }
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0];

    const options = {
        batchSize: parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1]) || 50,
        verbose: args.includes('--verbose') || args.includes('-v'),
        dryRun: args.includes('--dry-run'),
        delay: parseInt(args.find(arg => arg.startsWith('--delay='))?.split('=')[1]) || 100
    };

    const batcher = new FileBatcher(options);

    async function runCommand() {
        try {
            switch (command) {
                case 'analyze':
                    const analysis = await batcher.analyzeGitStatus();
                    console.log(JSON.stringify(analysis, null, 2));
                    break;

                case 'add':
                    const directory = args[1] || '.';
                    const files = batcher.findFiles(directory);
                    await batcher.addFilesBatched(files);
                    break;

                case 'commit':
                    const commitDir = args[1] || '.';
                    const message = args[2] || 'Add files in batches';
                    const commitFiles = batcher.findFiles(commitDir);
                    await batcher.commitFilesBatched(commitFiles, message);
                    break;

                case 'help':
                default:
                    console.log(`
File Batching Utilities

Usage:
  node file-batch-utils.js <command> [options]

Commands:
  analyze                    - Analyze current git status and suggest batching
  add [directory]           - Add files from directory in batches
  commit [directory] [msg]  - Add and commit files in batches
  help                      - Show this help

Options:
  --batch-size=N            - Number of files per batch (default: 50)
  --delay=N                 - Delay between batches in ms (default: 100)
  --verbose, -v             - Verbose output
  --dry-run                 - Show what would be done without executing

Examples:
  node file-batch-utils.js analyze
  node file-batch-utils.js add src --batch-size=25 --verbose
  node file-batch-utils.js commit . "Add new features" --dry-run
                    `);
                    break;
            }
        } catch (error) {
            console.error('Error:', error.message);
            process.exit(1);
        }
    }

    runCommand();
}

module.exports = FileBatcher;