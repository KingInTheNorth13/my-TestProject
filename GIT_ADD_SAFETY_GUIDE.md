# Avoiding Git Add SIGTERM Errors

## Problem

When working with repositories that contain large numbers of files (especially after installing dependencies like `node_modules`), running `git add . -v` can cause SIGTERM errors due to:

1. **Too many files**: The command tries to add thousands of files at once
2. **Large directories**: Dependencies in `node_modules` can contain tens of thousands of files
3. **System limitations**: Shell and git have limits on command line length and file handles

## Solutions

### 1. Use Enhanced .gitignore (Recommended)

This repository includes a comprehensive `.gitignore` file that excludes:
- `node_modules/` and other dependency directories
- Build artifacts (`dist/`, `build/`, `.next/`, etc.)
- Cache directories (`.cache/`, `.yarn/cache/`, etc.)
- Log files and temporary files
- OS-specific files (`.DS_Store`, `Thumbs.db`, etc.)

### 2. Use Safe Git Add Script

Instead of `git add . -v`, use the provided `safe-git-add.sh` script:

```bash
# Add all relevant files safely
./safe-git-add.sh

# Preview what would be added
./safe-git-add.sh --dry-run

# Add only source code files
./safe-git-add.sh --src-only

# Add only documentation
./safe-git-add.sh --docs-only

# Use smaller batches for very large repositories
./safe-git-add.sh --batch-size=25
```

### 3. Use File Batching Utilities

For Node.js projects, use the provided utilities:

```bash
# Using the shell script
./batch-files.sh

# Using the Node.js utility
node file-batch-utils.js

# Analyze repository before adding files
node file-batch-utils.js analyze
```

### 4. Target Specific Directories

Instead of adding everything, target specific directories:

```bash
# Add source code only
git add src/ public/ README.md package.json

# Add documentation
git add docs/ *.md

# Add configuration files
git add *.json *.yaml *.yml .gitignore
```

## Best Practices for CI/CD Workflows

### GitHub Actions

Replace problematic commands in workflows:

```yaml
# ❌ AVOID - Can cause SIGTERM
- name: Add files
  run: git add . -v

# ✅ RECOMMENDED - Safe alternatives
- name: Add files safely
  run: |
    # Option 1: Use the safe script
    ./safe-git-add.sh --src-only
    
    # Option 2: Use specific patterns
    git add src/ public/ *.md package.json
    
    # Option 3: Use batching utility
    node file-batch-utils.js
```

### Other CI Systems

For other CI systems (Jenkins, GitLab CI, etc.), apply the same principles:

1. Use comprehensive `.gitignore`
2. Target specific files/directories instead of using `.`
3. Use batching when dealing with many files
4. Avoid the `-v` flag in automated environments

## Emergency Recovery

If you encounter SIGTERM errors:

1. **Cancel the operation**: Use Ctrl+C or stop the workflow
2. **Clean staging area**: `git reset` to unstage any partially added files
3. **Use safe alternatives**: Switch to one of the recommended approaches above
4. **Check .gitignore**: Ensure large directories are properly excluded

## Configuration

The scripts support environment variables for customization:

```bash
# Adjust batch size
export BATCH_SIZE=30

# Enable/disable verbose output
export VERBOSE=true

# Set delay between batches (milliseconds)
export DELAY=100

# Use safe git add
./safe-git-add.sh
```

## Common File Patterns to Exclude

Your `.gitignore` should include these patterns to prevent SIGTERM issues:

```gitignore
# Dependencies
node_modules/
bower_components/
jspm_packages/
.yarn/cache/

# Build outputs
dist/
build/
out/
.next/
.cache/

# Logs and runtime
*.log
logs/
pids/
*.pid

# Environment files
.env*

# OS files
.DS_Store
Thumbs.db
```

## Monitoring Repository Size

Use the analysis tool to monitor your repository:

```bash
# Check repository statistics
node file-batch-utils.js analyze

# Get detailed breakdown
VERBOSE=true node file-batch-utils.js analyze
```

This will help you identify directories that might cause issues before they become a problem.