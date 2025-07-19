# File Batching Best Practices

## Overview

When working with repositories that contain many files, adding them all at once can cause performance issues. This document outlines best practices for batching file operations to avoid such problems.

## The Problem

Adding large numbers of files to git simultaneously can cause:

- **Performance Issues**: Git operations become slow with thousands of files
- **Memory Problems**: Large commits can exhaust system memory
- **UI/UX Issues**: GitHub interface may struggle with massive PRs
- **CI/CD Problems**: Build systems may timeout on large changesets
- **Review Difficulties**: Code reviews become impractical with too many files

## Recommended Batch Sizes

| File Count | Recommended Action |
|-----------|-------------------|
| < 50 files | Add all at once |
| 50-200 files | Batch in groups of 50 |
| 200-1000 files | Batch in groups of 25-50 |
| 1000+ files | Batch in groups of 20-25, consider multiple PRs |

## Best Practices

### 1. Use Logical Grouping

When batching files, group them logically:

```bash
# Good: Group by feature or component
git add src/components/auth/*
git commit -m "Add authentication components"

git add src/components/dashboard/*
git commit -m "Add dashboard components"
```

### 2. Descriptive Commit Messages

Use clear, descriptive commit messages for each batch:

```bash
git commit -m "Add user authentication components (batch 1/3)"
git commit -m "Add dashboard and reporting components (batch 2/3)"
git commit -m "Add utility functions and helpers (batch 3/3)"
```

### 3. Monitor System Resources

- Watch memory usage during large operations
- Use `git status` to check staging area size
- Consider using `git add -N` for intent-to-add without content

### 4. Use the File Batching Utility

This repository includes a utility script to help with batching:

```bash
# Analyze current repository state
node file-batch-utils.js analyze

# Add files in batches
node file-batch-utils.js add src --batch-size=25 --verbose

# Add and commit in batches
node file-batch-utils.js commit . "Add new features" --batch-size=30
```

## Configuration Options

The batching utility supports various configuration options:

```javascript
const batcher = new FileBatcher({
    batchSize: 50,        // Files per batch
    verbose: true,        // Detailed output
    dryRun: false,        // Preview mode
    delay: 100           // Delay between batches (ms)
});
```

## Git Commands for Batching

### Manual Batching

```bash
# Find files to add
find src -name "*.js" | head -50

# Add first batch
find src -name "*.js" | head -50 | xargs git add
git commit -m "Add JavaScript files (batch 1)"

# Add second batch
find src -name "*.js" | tail -n +51 | head -50 | xargs git add
git commit -m "Add JavaScript files (batch 2)"
```

### Using Git Staging

```bash
# Stage files gradually
git add src/components/*.js
git add src/utils/*.js
git add src/services/*.js

# Check staging area
git status --short

# Commit when ready
git commit -m "Add core application files"
```

## Automation Examples

### Bash Script

```bash
#!/bin/bash
# batch-add.sh

BATCH_SIZE=${1:-50}
DIRECTORY=${2:-.}

# Get all files
files=($(find "$DIRECTORY" -type f -not -path ".git/*"))
total=${#files[@]}

# Process in batches
for ((i=0; i<total; i+=BATCH_SIZE)); do
    batch=("${files[@]:i:BATCH_SIZE}")
    echo "Processing batch $((i/BATCH_SIZE + 1)) (${#batch[@]} files)"
    
    for file in "${batch[@]}"; do
        git add "$file"
    done
    
    git commit -m "Add files batch $((i/BATCH_SIZE + 1))"
done
```

### Python Script

```python
#!/usr/bin/env python3
import os
import subprocess
import glob

def batch_add_files(directory=".", batch_size=50):
    # Find all files
    files = []
    for root, dirs, filenames in os.walk(directory):
        # Skip .git directory
        if '.git' in dirs:
            dirs.remove('.git')
        for filename in filenames:
            files.append(os.path.join(root, filename))
    
    # Process in batches
    for i in range(0, len(files), batch_size):
        batch = files[i:i + batch_size]
        print(f"Processing batch {i//batch_size + 1} ({len(batch)} files)")
        
        # Add files
        subprocess.run(['git', 'add'] + batch)
        
        # Commit batch
        commit_msg = f"Add files batch {i//batch_size + 1}"
        subprocess.run(['git', 'commit', '-m', commit_msg])

if __name__ == "__main__":
    batch_add_files()
```

## Troubleshooting

### Common Issues

1. **"Argument list too long" error**
   - Reduce batch size
   - Use file lists instead of shell expansion

2. **Memory exhaustion**
   - Reduce batch size significantly (10-20 files)
   - Add delays between operations

3. **Slow git operations**
   - Check repository size with `git count-objects -vH`
   - Consider `git gc` to optimize repository
   - Use `git add --refresh` for index updates

### Performance Monitoring

```bash
# Monitor git performance
time git add large-directory/*

# Check repository statistics
git count-objects -vH

# Analyze commit history
git log --oneline --stat | head -20
```

## Integration with CI/CD

When working with CI/CD systems, consider:

- **Build timeouts**: Split large changes across multiple PRs
- **Resource limits**: Monitor memory and CPU usage
- **Test execution**: Large changesets may slow down test suites
- **Review tools**: Some tools have limits on diff sizes

## Conclusion

Proper file batching is essential for maintaining repository performance and developer productivity. Use the provided utilities and follow these best practices to avoid issues with large file operations.

For questions or issues with the batching utilities, please create an issue in this repository.