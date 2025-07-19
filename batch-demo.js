#!/usr/bin/env node

/**
 * Demo script showing file batching in action
 * This creates sample files and demonstrates batching operations
 */

const fs = require('fs');
const path = require('path');
const FileBatcher = require('./file-batch-utils');

async function createDemoFiles(count = 100) {
    const demoDir = path.join(__dirname, 'demo-files');
    
    // Create demo directory
    if (!fs.existsSync(demoDir)) {
        fs.mkdirSync(demoDir, { recursive: true });
    }

    console.log(`Creating ${count} demo files...`);
    
    // Create subdirectories
    const subdirs = ['components', 'utils', 'services', 'assets', 'tests'];
    subdirs.forEach(subdir => {
        const subdirPath = path.join(demoDir, subdir);
        if (!fs.existsSync(subdirPath)) {
            fs.mkdirSync(subdirPath);
        }
    });

    // Create files in each subdirectory
    const filesPerDir = Math.ceil(count / subdirs.length);
    
    for (let i = 0; i < subdirs.length; i++) {
        const subdir = subdirs[i];
        const subdirPath = path.join(demoDir, subdir);
        
        for (let j = 0; j < filesPerDir && (i * filesPerDir + j) < count; j++) {
            const fileNum = i * filesPerDir + j + 1;
            const fileName = `file${fileNum.toString().padStart(3, '0')}.js`;
            const filePath = path.join(subdirPath, fileName);
            
            const content = `// Demo file ${fileNum}
// Created for batching demonstration
// Directory: ${subdir}

export function demoFunction${fileNum}() {
    return "This is demo file ${fileNum} in ${subdir}";
}

export default {
    id: ${fileNum},
    name: "${fileName}",
    directory: "${subdir}",
    created: "${new Date().toISOString()}"
};
`;
            
            fs.writeFileSync(filePath, content);
        }
    }
    
    console.log(`✅ Created ${count} demo files in ${demoDir}`);
    return demoDir;
}

async function demonstrateBatching() {
    console.log('🚀 File Batching Demonstration\n');
    
    try {
        // Create demo files
        const demoDir = await createDemoFiles(75);
        
        // Initialize batcher with demo settings
        const batcher = new FileBatcher({
            batchSize: 15,
            verbose: true,
            delay: 200 // Slower for demo purposes
        });
        
        console.log('\n📊 Analyzing current state...');
        const analysis = await batcher.analyzeGitStatus();
        console.log('Analysis result:', JSON.stringify(analysis, null, 2));
        
        // Find all demo files
        const demoFiles = batcher.findFiles(demoDir);
        console.log(`\n📁 Found ${demoFiles.length} files to add`);
        
        // Show what batches would look like
        const batches = batcher.createBatches(demoFiles);
        console.log(`\n📦 Files will be processed in ${batches.length} batches:`);
        batches.forEach((batch, index) => {
            console.log(`  Batch ${index + 1}: ${batch.length} files`);
            if (index < 3) { // Show first few batches
                console.log(`    Files: ${batch.slice(0, 3).join(', ')}${batch.length > 3 ? '...' : ''}`);
            }
        });
        
        console.log('\n⚡ Running batched add operation...');
        await batcher.addFilesBatched(demoFiles);
        
        console.log('\n✅ Batching demonstration completed!');
        console.log('\n💡 Tips:');
        console.log('  - Use smaller batch sizes for large files');
        console.log('  - Group related files together logically');
        console.log('  - Monitor system resources during operations');
        console.log('  - Use dry-run mode to preview operations');
        
        console.log('\n🧹 Cleaning up demo files...');
        // Note: In a real scenario, you might want to keep these for testing
        // For demo, we'll remove them
        fs.rmSync(demoDir, { recursive: true, force: true });
        console.log('✅ Demo files cleaned up');
        
    } catch (error) {
        console.error('❌ Demo failed:', error.message);
        process.exit(1);
    }
}

async function runInteractiveDemo() {
    console.log('🎯 Interactive File Batching Demo\n');
    
    // Check if we're in a git repository
    try {
        require('child_process').execSync('git status', { stdio: 'pipe' });
    } catch (error) {
        console.log('⚠️  Not in a git repository. Initializing...');
        require('child_process').execSync('git init', { stdio: 'inherit' });
        require('child_process').execSync('git config user.email "demo@example.com"', { stdio: 'pipe' });
        require('child_process').execSync('git config user.name "Demo User"', { stdio: 'pipe' });
    }
    
    await demonstrateBatching();
}

// Run demo if called directly
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
File Batching Demo

Usage:
  node batch-demo.js [options]

Options:
  --files=N     Number of demo files to create (default: 75)
  --help, -h    Show this help message

This demo will:
1. Create sample files
2. Show batching analysis
3. Demonstrate batched git operations
4. Clean up demo files
        `);
        process.exit(0);
    }
    
    runInteractiveDemo().catch(console.error);
}

module.exports = {
    createDemoFiles,
    demonstrateBatching,
    runInteractiveDemo
};