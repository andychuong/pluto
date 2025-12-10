# Performance Optimizer

Analyze code for performance issues and suggest optimizations.

## Analysis Areas

### Algorithmic Efficiency
- Time complexity issues (O(n²) when O(n) possible)
- Space complexity concerns
- Unnecessary iterations
- Inefficient data structures

### Memory Management
- Memory leaks
- Large object allocations
- Unbounded growth patterns
- Missing cleanup/disposal

### I/O & Network
- N+1 query problems
- Missing caching opportunities
- Synchronous blocking operations
- Unoptimized database queries

### Frontend Performance (if applicable)
- Unnecessary re-renders
- Large bundle sizes
- Missing lazy loading
- Unoptimized images/assets

### Concurrency
- Race conditions
- Deadlock potential
- Inefficient parallelization
- Thread safety issues

## Output Format
For each optimization:
1. **Impact**: High / Medium / Low
2. **Current Code**: What's happening now
3. **Issue**: Why it's slow
4. **Solution**: Optimized approach with code
5. **Trade-offs**: Any downsides to consider

Focus on high-impact, low-effort optimizations first. Avoid premature optimization suggestions.
