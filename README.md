# File Batching Utilities

A solution for handling large numbers of files in git repositories without performance issues.

## Problem Statement

When adding many files to a git repository at once, you may encounter:
- Performance degradation
- Memory issues
- Timeout problems in CI/CD
- Difficult code reviews
- Git operation failures

## Solution

This repository provides utilities and best practices for batching file operations to avoid these issues.

## Quick Start

### Analyze your repository
```bash
node file-batch-utils.js analyze
```

### Add files in batches
```bash
node file-batch-utils.js add src --batch-size=25 --verbose
```

### Run interactive demo
```bash
npm run demo
```

## Features

- **Smart Batching**: Automatically groups files into optimal batch sizes
- **Progress Tracking**: Verbose output showing operation progress
- **Dry Run Mode**: Preview operations before executing
- **Configurable**: Customizable batch sizes and delays
- **Error Handling**: Robust error handling and recovery
- **Performance Monitoring**: Built-in analysis tools

## Files

- `file-batch-utils.js` - Main batching utility
- `batch-demo.js` - Interactive demonstration
- `batch-config.json` - Configuration options
- `FILE_BATCHING_GUIDE.md` - Comprehensive documentation

## Installation

```bash
# Clone the repository
git clone https://github.com/KingInTheNorth13/my-TestProject.git
cd my-TestProject

# Run the demo
npm run demo

# Or use directly
node file-batch-utils.js help
```

## Usage Examples

### Basic Usage
```bash
# Analyze current repository state
node file-batch-utils.js analyze

# Add all files in current directory
node file-batch-utils.js add .

# Add files with custom batch size
node file-batch-utils.js add src --batch-size=30 --verbose
```

### Advanced Usage
```bash
# Dry run to preview operations
node file-batch-utils.js add . --dry-run --verbose

# Add and commit in batches
node file-batch-utils.js commit src "Add new features" --batch-size=25

# With custom delay between batches
node file-batch-utils.js add . --delay=500 --batch-size=20
```

### Programmatic Usage
```javascript
const FileBatcher = require('./file-batch-utils');

const batcher = new FileBatcher({
    batchSize: 50,
    verbose: true,
    dryRun: false
});

// Add files in batches
await batcher.addFilesBatched(['file1.js', 'file2.js', /* ... */]);

// Analyze git status
const analysis = await batcher.analyzeGitStatus();
console.log(analysis);
```

## Configuration

The utility supports various configuration options via `batch-config.json`:

- **Batch sizes** for different file types
- **Performance profiles** for different environments
- **Exclude patterns** for files to ignore
- **Warning thresholds** for large operations

## Best Practices

1. **Use appropriate batch sizes**: 25-50 files for most scenarios
2. **Group logically**: Keep related files together
3. **Monitor resources**: Watch memory usage during operations
4. **Test first**: Use dry-run mode to preview operations
5. **Gradual commits**: Consider multiple smaller commits

## Contributing

This solution addresses the file batching issue mentioned in [issue #4](https://github.com/KingInTheNorth13/my-TestProject/issues/4).

## License

MIT