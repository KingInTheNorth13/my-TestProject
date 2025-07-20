#!/bin/bash

# Safe Git Add Script
# This script provides a safer alternative to 'git add . -v' that avoids SIGTERM errors
# when dealing with large numbers of files.

set -e

# Configuration
BATCH_SIZE=${BATCH_SIZE:-50}
VERBOSE=${VERBOSE:-true}
DRY_RUN=${DRY_RUN:-false}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    if [ "$VERBOSE" = "true" ]; then
        echo -e "${BLUE}[INFO]${NC} $1"
    fi
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

usage() {
    echo "Usage: $0 [OPTIONS] [FILES...]"
    echo ""
    echo "Safe alternative to 'git add . -v' that avoids SIGTERM errors"
    echo ""
    echo "Options:"
    echo "  --all, -a              Add all relevant files (default behavior)"
    echo "  --src-only             Add only source files (src/, lib/, public/, etc.)"
    echo "  --docs-only            Add only documentation files"
    echo "  --batch-size=N         Process files in batches of N (default: 50)"
    echo "  --dry-run              Show what would be added without actually adding"
    echo "  --verbose              Enable verbose output (default: true)"
    echo "  --quiet, -q            Disable verbose output"
    echo "  --help, -h             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                     # Add all relevant files safely"
    echo "  $0 --src-only          # Add only source code files"
    echo "  $0 --batch-size=25     # Use smaller batches"
    echo "  $0 --dry-run           # Preview what would be added"
    echo "  $0 file1.js file2.md   # Add specific files"
}

# Parse command line arguments
FILES_TO_ADD=()
MODE="all"

while [[ $# -gt 0 ]]; do
    case $1 in
        --all|-a)
            MODE="all"
            shift
            ;;
        --src-only)
            MODE="src"
            shift
            ;;
        --docs-only)
            MODE="docs"
            shift
            ;;
        --batch-size=*)
            BATCH_SIZE="${1#*=}"
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --quiet|-q)
            VERBOSE=false
            shift
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        -*)
            error "Unknown option: $1"
            usage
            exit 1
            ;;
        *)
            FILES_TO_ADD+=("$1")
            shift
            ;;
    esac
done

# Check if we're in a git repository
if ! git status >/dev/null 2>&1; then
    error "Not in a git repository!"
    exit 1
fi

# Determine which files to add
if [ ${#FILES_TO_ADD[@]} -gt 0 ]; then
    # Specific files provided
    files_to_process=("${FILES_TO_ADD[@]}")
    log "Using provided files: ${FILES_TO_ADD[*]}"
elif [ "$MODE" = "src" ]; then
    # Source files only
    log "Finding source files..."
    mapfile -t files_to_process < <(find . -type f \
        \( -path "./src/*" -o -path "./lib/*" -o -path "./public/*" -o -path "./assets/*" \
        -o -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" \
        -o -name "*.css" -o -name "*.scss" -o -name "*.sass" -o -name "*.less" \
        -o -name "*.html" -o -name "*.vue" -o -name "*.svelte" \
        -o -name "*.py" -o -name "*.java" -o -name "*.c" -o -name "*.cpp" \
        -o -name "*.go" -o -name "*.rs" -o -name "*.php" -o -name "*.rb" \
        -o -name "package.json" -o -name "*.json" -o -name "*.yaml" -o -name "*.yml" \) \
        -not -path "./.git/*" -not -path "./node_modules/*" -not -path "./dist/*" \
        -not -path "./build/*" -not -path "./coverage/*" -not -path "./.cache/*")
elif [ "$MODE" = "docs" ]; then
    # Documentation files only
    log "Finding documentation files..."
    mapfile -t files_to_process < <(find . -type f \
        \( -name "*.md" -o -name "*.txt" -o -name "README*" -o -name "CHANGELOG*" \
        -o -name "LICENSE*" -o -name "*.rst" -o -name "*.adoc" \
        -o -path "./docs/*" -o -path "./documentation/*" \) \
        -not -path "./.git/*" -not -path "./node_modules/*")
else
    # All relevant files (excluding large directories and build artifacts)
    log "Finding all relevant files..."
    mapfile -t files_to_process < <(find . -type f \
        -not -path "./.git/*" \
        -not -path "./node_modules/*" \
        -not -path "./dist/*" \
        -not -path "./build/*" \
        -not -path "./coverage/*" \
        -not -path "./.cache/*" \
        -not -path "./.next/*" \
        -not -path "./.nuxt/*" \
        -not -path "./bower_components/*" \
        -not -path "./jspm_packages/*" \
        -not -path "./typings/*" \
        -not -path "./.yarn/cache/*" \
        -not -path "./.tmp/*" \
        -not -path "./.temp/*" \
        -not -path "./demo-files/*" \
        -not -path "./temp-test/*" \
        -not -name "*.log" \
        -not -name "*.tmp" \
        -not -name "*.temp")
fi

total_files=${#files_to_process[@]}

if [ $total_files -eq 0 ]; then
    warn "No files found to add"
    exit 0
fi

log "Found $total_files files to process"

if [ "$DRY_RUN" = "true" ]; then
    echo ""
    echo "DRY RUN - Files that would be added:"
    printf '%s\n' "${files_to_process[@]}"
    echo ""
    echo "Total: $total_files files"
    exit 0
fi

# Calculate number of batches
batches=$(( (total_files + BATCH_SIZE - 1) / BATCH_SIZE ))

if [ $total_files -gt $BATCH_SIZE ]; then
    warn "Processing $total_files files in $batches batches of $BATCH_SIZE files each"
    warn "This is safer than 'git add . -v' which can cause SIGTERM errors"
else
    log "Processing $total_files files in a single batch"
fi

# Process files in batches
success_count=0
for ((i=0; i<total_files; i+=BATCH_SIZE)); do
    batch_num=$((i/BATCH_SIZE + 1))
    
    # Get current batch
    batch_files=()
    for ((j=i; j<i+BATCH_SIZE && j<total_files; j++)); do
        batch_files+=("${files_to_process[j]}")
    done
    
    log "Processing batch $batch_num/$batches (${#batch_files[@]} files)"
    
    # Add files in current batch
    if [ "$VERBOSE" = "true" ]; then
        if git add "${batch_files[@]}"; then
            success "Added batch $batch_num successfully"
            success_count=$((success_count + ${#batch_files[@]}))
        else
            error "Failed to add batch $batch_num"
            exit 1
        fi
    else
        if git add "${batch_files[@]}" 2>/dev/null; then
            success_count=$((success_count + ${#batch_files[@]}))
        else
            error "Failed to add batch $batch_num"
            exit 1
        fi
    fi
    
    # Small delay between batches to avoid overwhelming the system
    if [ $batch_num -lt $batches ]; then
        sleep 0.1
    fi
done

success "Successfully added $success_count files to git staging area"

# Show git status summary
unstaged=$(git status --porcelain 2>/dev/null | grep -c "^??" || echo "0")
staged=$(git status --porcelain 2>/dev/null | grep -c "^A" || echo "0")
modified=$(git status --porcelain 2>/dev/null | grep -c "^M" || echo "0")

echo ""
echo "Git Status Summary:"
echo "  Staged files: $staged"
echo "  Modified files: $modified"
echo "  Unstaged files: $unstaged"

if [ $staged -gt 0 ] || [ $modified -gt 0 ]; then
    echo ""
    echo "Ready to commit! Use:"
    echo "  git commit -m \"Your commit message\""
fi