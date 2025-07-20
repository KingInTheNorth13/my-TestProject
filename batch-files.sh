#!/bin/bash

# Simple shell script version of file batching
# Usage: ./batch-files.sh [directory] [batch_size]

DIRECTORY=${1:-.}
BATCH_SIZE=${2:-50}
VERBOSE=${VERBOSE:-false}

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

# Check if we're in a git repository
if ! git status >/dev/null 2>&1; then
    error "Not in a git repository!"
    exit 1
fi

# Find all files to add (excluding .git directory and node_modules)
mapfile -t files < <(find "$DIRECTORY" -type f -not -path "./.git/*" -not -path ".git/*" -not -path "./node_modules/*" -not -path "node_modules/*" -not -path "*/node_modules/*")
total_files=${#files[@]}

if [ $total_files -eq 0 ]; then
    warn "No files found in directory: $DIRECTORY"
    exit 0
fi

log "Found $total_files files to process"

# Calculate number of batches
batches=$(( (total_files + BATCH_SIZE - 1) / BATCH_SIZE ))

if [ $total_files -gt $BATCH_SIZE ]; then
    warn "Processing $total_files files in $batches batches of $BATCH_SIZE files each"
else
    log "Processing $total_files files in a single batch"
fi

# Process files in batches
for ((i=0; i<total_files; i+=BATCH_SIZE)); do
    batch_num=$((i/BATCH_SIZE + 1))
    
    # Get current batch
    batch_files=()
    for ((j=i; j<i+BATCH_SIZE && j<total_files; j++)); do
        batch_files+=("${files[j]}")
    done
    
    log "Processing batch $batch_num/$batches (${#batch_files[@]} files)"
    
    # Add files in current batch
    if git add "${batch_files[@]}" 2>/dev/null; then
        success "Added batch $batch_num successfully"
    else
        error "Failed to add batch $batch_num"
        exit 1
    fi
    
    # Small delay between batches
    if [ $batch_num -lt $batches ]; then
        sleep 0.1
    fi
done

success "Successfully added $total_files files to git staging area"

# Show git status summary
unstaged=$(git status --porcelain 2>/dev/null | grep -c "^??")
staged=$(git status --porcelain 2>/dev/null | grep -c "^A")

echo ""
echo "Git Status Summary:"
echo "  Staged files: $staged"
echo "  Unstaged files: $unstaged"

if [ $staged -gt 0 ]; then
    echo ""
    echo "Ready to commit! Use:"
    echo "  git commit -m \"Your commit message\""
fi