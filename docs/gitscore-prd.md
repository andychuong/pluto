# Product Requirements Document: GitScore Pro
## AI-Powered Git Practice Analysis Platform

**Version:** 1.0  
**Date:** December 2025  
**Owner:** Alexis  
**Project Duration:** 5 days  
**Deployment:** Local development only

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Goals & Success Metrics](#goals--success-metrics)
3. [User Personas](#user-personas)
4. [Git API Integration](#git-api-integration)
5. [MVP - Day 1](#mvp---day-1)
6. [Post-MVP Features (Days 2-5)](#post-mvp-features-days-2-5)
7. [Technical Architecture](#technical-architecture)
8. [Data Models](#data-models)
9. [UI/UX Design](#uiux-design)
10. [Testing Strategy](#testing-strategy)
11. [Future Enhancements](#future-enhancements)

---

## Executive Summary

### Overview
GitScore Pro is a sophisticated local web application that performs deep analysis of GitHub repository commit histories. By examining commit patterns, code changes, branching strategies, and collaboration dynamics, GitScore provides comprehensive insights into individual and team Git practices with AI-powered recommendations.

### Problem Statement
Teams and individual developers lack sophisticated tools to:
- Understand their Git workflow maturity and evolution
- Identify technical debt in commit practices
- Benchmark against industry standards with context-aware analysis
- Detect anti-patterns in version control workflows
- Measure collaboration quality and code review effectiveness

### Solution
A locally-running, AI-powered analysis platform that combines static analysis, machine learning, and LLM-based insights to provide enterprise-grade Git practice evaluation.

---

## Goals & Success Metrics

### Primary Goals
1. Provide research-grade analysis of Git practices with high accuracy
2. Surface non-obvious patterns through AI-powered commit clustering
3. Enable comparative analysis across time periods, branches, and contributors
4. Generate actionable, context-aware improvement roadmaps

### Success Metrics
- **Analysis Depth:** 50+ distinct metrics calculated per contributor
- **Pattern Detection:** Identify 10+ workflow anti-patterns automatically
- **AI Accuracy:** 90%+ precision on commit message quality assessment
- **Performance:** Analyze 10K+ commits efficiently
- **Insight Quality:** Generate 20+ unique, non-trivial insights per analysis

---

## User Personas

### Primary: Senior Developer/Tech Lead
- Deep technical expertise, building AI-first applications
- Evaluating and improving team Git practices
- Needs quantitative data to justify process changes
- Values sophisticated analysis over simplicity
- Interested in emerging patterns and anomalies

### Secondary: Engineering Manager
- Managing multiple teams, needs cross-team benchmarking
- Looking for coaching opportunities and skill gaps
- Wants to track improvement over quarters
- Values visualization and trend analysis

### Tertiary: Open Source Maintainer
- Managing contributions from dozens of developers
- Needs to identify high-quality contributors
- Wants to understand project health metrics
- Values historical trend analysis

---

## Git API Integration

### Overview
GitScore connects to GitHub repositories through multiple methods, with GitHub's REST and GraphQL APIs as the primary integration points. The system is designed to work locally without deployment infrastructure.

### Connection Methods

#### 1. GitHub REST API v3 (Primary for MVP)
**Use Cases:**
- Fetch repository metadata
- List branches and commits
- Retrieve commit details and diffs
- Access contributor information

**Implementation:**
```typescript
import { Octokit } from '@octokit/rest';

interface GitHubConfig {
  auth?: string; // Personal Access Token (optional)
  baseUrl?: string; // For GitHub Enterprise
  userAgent: string;
}

class GitHubAPIClient {
  private octokit: Octokit;
  private rateLimit: RateLimitInfo;
  
  constructor(config: GitHubConfig) {
    this.octokit = new Octokit({
      auth: config.auth,
      baseUrl: config.baseUrl || 'https://api.github.com',
      userAgent: 'GitScore-Pro/1.0',
      throttle: {
        onRateLimit: (retryAfter, options, octokit, retryCount) => {
          console.warn(`Rate limit hit, retrying after ${retryAfter}s`);
          return retryCount < 3;
        },
        onSecondaryRateLimit: (retryAfter, options, octokit) => {
          console.warn('Secondary rate limit hit');
        }
      }
    });
  }
  
  // Fetch repository metadata
  async getRepository(owner: string, repo: string) {
    const { data } = await this.octokit.repos.get({ owner, repo });
    return data;
  }
  
  // List all branches
  async getBranches(owner: string, repo: string) {
    const branches = await this.octokit.paginate(
      this.octokit.repos.listBranches,
      { owner, repo, per_page: 100 }
    );
    return branches;
  }
  
  // Fetch commits with pagination
  async getCommits(
    owner: string,
    repo: string,
    branch: string,
    options?: {
      since?: string;
      until?: string;
      author?: string;
    }
  ) {
    const commits = await this.octokit.paginate(
      this.octokit.repos.listCommits,
      {
        owner,
        repo,
        sha: branch,
        per_page: 100,
        ...options
      }
    );
    return commits;
  }
  
  // Get detailed commit information
  async getCommitDetails(owner: string, repo: string, sha: string) {
    const { data } = await this.octokit.repos.getCommit({
      owner,
      repo,
      ref: sha
    });
    return data;
  }
  
  // Get commit diff
  async getCommitDiff(owner: string, repo: string, sha: string) {
    const { data } = await this.octokit.repos.getCommit({
      owner,
      repo,
      ref: sha,
      mediaType: { format: 'diff' }
    });
    return data;
  }
  
  // Check rate limit status
  async getRateLimit() {
    const { data } = await this.octokit.rateLimit.get();
    this.rateLimit = {
      limit: data.rate.limit,
      remaining: data.rate.remaining,
      reset: new Date(data.rate.reset * 1000)
    };
    return this.rateLimit;
  }
}
```

**Rate Limiting Strategy:**
```typescript
class RateLimitManager {
  private limits: Map<string, RateLimitInfo>;
  
  async executeWithRateLimit<T>(
    key: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const limit = this.limits.get(key);
    
    if (limit && limit.remaining < 100) {
      const waitTime = limit.reset.getTime() - Date.now();
      if (waitTime > 0) {
        console.log(`Rate limit low, waiting ${waitTime}ms`);
        await this.sleep(waitTime);
      }
    }
    
    return await fn();
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

#### 2. GitHub GraphQL API v4 (Post-MVP Enhancement)
**Advantages:**
- Fetch nested data in single request
- Reduce API calls significantly
- Access richer metadata (PR info, reviews, reactions)

**Implementation:**
```typescript
import { graphql } from '@octokit/graphql';

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${GITHUB_TOKEN}`,
  },
});

// Fetch comprehensive repository data in one query
const query = `
  query($owner: String!, $repo: String!, $branch: String!) {
    repository(owner: $owner, name: $repo) {
      defaultBranchRef {
        name
        target {
          ... on Commit {
            history(first: 100, after: $cursor) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                oid
                message
                messageBody
                committedDate
                author {
                  name
                  email
                  user {
                    login
                    avatarUrl
                  }
                }
                committer {
                  name
                  email
                }
                additions
                deletions
                changedFiles
                parents(first: 2) {
                  nodes {
                    oid
                  }
                }
                signature {
                  isValid
                }
                associatedPullRequests(first: 1) {
                  nodes {
                    number
                    title
                    reviews(first: 10) {
                      nodes {
                        author {
                          login
                        }
                        state
                        submittedAt
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      refs(refPrefix: "refs/heads/", first: 100) {
        nodes {
          name
          target {
            ... on Commit {
              oid
              history {
                totalCount
              }
            }
          }
        }
      }
    }
  }
`;
```

#### 3. Local Git Repository Access (Alternative)
**For already-cloned repositories:**

```typescript
import simpleGit, { SimpleGit, LogResult } from 'simple-git';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

class LocalGitClient {
  private git: SimpleGit;
  
  constructor(repoPath: string) {
    this.git = simpleGit(repoPath);
  }
  
  async getCommitHistory(options?: {
    branch?: string;
    maxCount?: number;
    since?: string;
    until?: string;
  }): Promise<LogResult> {
    return await this.git.log({
      '--all': null,
      '--max-count': options?.maxCount || 1000,
      '--since': options?.since,
      '--until': options?.until,
      '--numstat': null,
      '--format': '%H|%an|%ae|%cn|%ce|%ad|%s|%b',
    });
  }
  
  async getCommitDiff(sha: string): Promise<string> {
    return await this.git.show([sha, '--format=', '--numstat']);
  }
  
  async getBranches(): Promise<string[]> {
    const result = await this.git.branch(['-a']);
    return result.all;
  }
  
  async getFileContent(sha: string, filepath: string): Promise<string> {
    return await this.git.show([`${sha}:${filepath}`]);
  }
  
  // Advanced: Get commit graph topology
  async getCommitGraph(branch: string): Promise<CommitGraph> {
    const { stdout } = await execAsync(
      `git log ${branch} --pretty=format:'%H|%P' --all`
    );
    
    const nodes = new Map<string, CommitNode>();
    const lines = stdout.split('\n');
    
    for (const line of lines) {
      const [hash, parents] = line.split('|');
      nodes.set(hash, {
        hash,
        parents: parents ? parents.split(' ') : []
      });
    }
    
    return { nodes };
  }
}
```

### Authentication Strategies

#### 1. No Authentication (MVP)
- Public repositories only
- Rate limit: 60 requests/hour per IP
- Sufficient for initial testing

#### 2. Personal Access Token (Recommended)
```typescript
interface AuthConfig {
  method: 'pat' | 'oauth' | 'none';
  token?: string;
}

// User provides token via UI
const token = prompt('Enter GitHub Personal Access Token (optional):');
const client = new GitHubAPIClient({ auth: token });

// Rate limit: 5000 requests/hour with PAT
```

**Token Permissions Required:**
- `repo` (if analyzing private repos)
- `read:user` (for user info)
- No write permissions needed

#### 3. OAuth Flow (Future)
For enhanced features like write-back capabilities.

### API Data Flow

```typescript
interface RepositoryAnalysisFlow {
  // 1. Initial repository fetch
  fetchRepository(url: string): Promise<Repository>;
  
  // 2. Get all branches
  fetchBranches(repo: Repository): Promise<Branch[]>;
  
  // 3. For each branch, fetch commits (paginated)
  fetchCommits(branch: Branch, options?: FetchOptions): Promise<Commit[]>;
  
  // 4. For each commit, fetch detailed info (batched)
  fetchCommitDetails(commits: Commit[]): Promise<CommitDetail[]>;
  
  // 5. Parse diffs and extract changes
  parseDiffs(commitDetails: CommitDetail[]): Promise<ParsedDiff[]>;
  
  // 6. Fetch PR and review data (if needed)
  fetchPullRequestInfo(commits: Commit[]): Promise<PRInfo[]>;
}
```

### Caching Strategy

**Cache GitHub API responses to minimize requests:**

```typescript
class GitHubCache {
  private redis: Redis;
  private db: Database;
  
  // Cache repository metadata (24 hours)
  async cacheRepository(owner: string, repo: string, data: any) {
    const key = `repo:${owner}:${repo}`;
    await this.redis.setex(key, 86400, JSON.stringify(data));
  }
  
  // Cache commit data (7 days - immutable)
  async cacheCommit(sha: string, data: any) {
    const key = `commit:${sha}`;
    await this.redis.setex(key, 604800, JSON.stringify(data));
    
    // Also store in SQLite for long-term
    await this.db.run(
      'INSERT OR IGNORE INTO commit_cache (sha, data, cached_at) VALUES (?, ?, ?)',
      [sha, JSON.stringify(data), Date.now()]
    );
  }
  
  // Incremental fetch: only get new commits
  async getCommitsSince(
    owner: string,
    repo: string,
    lastSha: string
  ): Promise<Commit[]> {
    const cached = await this.getLastAnalysis(owner, repo);
    if (!cached) return this.fetchAllCommits(owner, repo);
    
    // Fetch only commits after lastSha
    return this.fetchCommitsAfter(owner, repo, cached.lastCommitDate);
  }
}
```

### Error Handling

```typescript
class GitHubAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: any
  ) {
    super(message);
    this.name = 'GitHubAPIError';
  }
}

async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on 4xx errors (except 429)
      if (error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }
      
      // Exponential backoff
      const delay = Math.pow(2, i) * 1000;
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}
```

### Data Extraction Pipeline

```typescript
class GitHubDataExtractor {
  private client: GitHubAPIClient;
  private cache: GitHubCache;
  
  async extractRepositoryData(
    owner: string,
    repo: string,
    options: ExtractionOptions
  ): Promise<ExtractedData> {
    // 1. Fetch repo metadata
    const repoData = await this.client.getRepository(owner, repo);
    
    // 2. Get branches
    const branches = await this.client.getBranches(owner, repo);
    const selectedBranches = options.branches || branches;
    
    // 3. Fetch commits in parallel
    const commitPromises = selectedBranches.map(branch =>
      this.fetchBranchCommits(owner, repo, branch.name, options)
    );
    const branchCommits = await Promise.all(commitPromises);
    
    // 4. Flatten and deduplicate commits
    const allCommits = this.deduplicateCommits(branchCommits.flat());
    
    // 5. Fetch detailed commit info (batched)
    const detailedCommits = await this.fetchCommitDetailsBatch(
      owner,
      repo,
      allCommits
    );
    
    // 6. Extract contributors
    const contributors = this.extractContributors(detailedCommits);
    
    return {
      repository: repoData,
      branches: selectedBranches,
      commits: detailedCommits,
      contributors
    };
  }
  
  private async fetchBranchCommits(
    owner: string,
    repo: string,
    branch: string,
    options: ExtractionOptions
  ): Promise<Commit[]> {
    const cached = await this.cache.getBranchCommits(owner, repo, branch);
    
    if (cached && !options.forceRefresh) {
      // Check if new commits exist
      const latest = await this.client.getCommits(owner, repo, branch, {
        per_page: 1
      });
      
      if (latest[0].sha === cached[0].sha) {
        console.log(`Branch ${branch}: using cached data`);
        return cached;
      }
    }
    
    // Fetch all commits (paginated)
    console.log(`Branch ${branch}: fetching commits...`);
    return await this.client.getCommits(owner, repo, branch, {
      since: options.since,
      until: options.until
    });
  }
  
  private async fetchCommitDetailsBatch(
    owner: string,
    repo: string,
    commits: Commit[]
  ): Promise<CommitDetail[]> {
    const BATCH_SIZE = 10;
    const batches = chunk(commits, BATCH_SIZE);
    const results: CommitDetail[] = [];
    
    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(async commit => {
          // Check cache first
          const cached = await this.cache.getCommit(commit.sha);
          if (cached) return cached;
          
          // Fetch from API
          const detail = await this.client.getCommitDetails(
            owner,
            repo,
            commit.sha
          );
          
          // Cache result
          await this.cache.cacheCommit(commit.sha, detail);
          
          return detail;
        })
      );
      
      results.push(...batchResults);
      
      // Progress update
      console.log(`Fetched ${results.length}/${commits.length} commit details`);
    }
    
    return results;
  }
}
```

---

## MVP - Day 1

### Core Objective
Build a functional analysis pipeline that can ingest a GitHub repository, analyze commits, and generate a basic scoring dashboard.

### Features

#### 1. Repository Input & Validation ✓
**Must Have:**
- Input field accepting GitHub URLs (`github.com/owner/repo`)
- URL validation (regex + format check)
- GitHub API connectivity test
- Error handling for invalid/private repos
- Loading states during validation

**Technical Implementation:**
```typescript
interface RepositoryInput {
  url: string;
  validateFormat(): boolean;
  extractOwnerRepo(): { owner: string; repo: string };
  checkAccessibility(): Promise<boolean>;
}

// URL parsing
const parseGitHubURL = (url: string): { owner: string; repo: string } | null => {
  const patterns = [
    /github\.com\/([^\/]+)\/([^\/]+)/,
    /^([^\/]+)\/([^\/]+)$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, '')
      };
    }
  }
  
  return null;
};
```

#### 2. Basic GitHub API Integration ✓
**Must Have:**
- Octokit setup with rate limit handling
- Fetch repository metadata
- Fetch default branch commits (limit: 100 commits for MVP)
- Parse commit messages, authors, timestamps
- Cache responses in memory

**Implementation:**
```typescript
class MVPGitHubClient {
  private octokit: Octokit;
  private cache: Map<string, any> = new Map();
  
  async analyzeRepository(owner: string, repo: string) {
    // 1. Get repository info
    const repoData = await this.octokit.repos.get({ owner, repo });
    
    // 2. Get default branch commits (MVP: limit 100)
    const commits = await this.octokit.repos.listCommits({
      owner,
      repo,
      per_page: 100
    });
    
    // 3. Group by author
    const commitsByAuthor = this.groupCommitsByAuthor(commits.data);
    
    return {
      repository: repoData.data,
      commits: commits.data,
      commitsByAuthor
    };
  }
}
```

#### 3. Basic Commit Analysis ✓
**Must Have:**
- Extract commit metadata (author, date, message)
- Group commits by author
- Calculate basic statistics:
  - Total commits per user
  - Average commits per day
  - Commit message length distribution
  - Files changed per commit

**Implementation:**
```typescript
interface BasicCommitStats {
  totalCommits: number;
  avgMessageLength: number;
  avgFilesChanged: number;
  commitFrequency: {
    byDayOfWeek: Record<string, number>;
    byHour: Record<number, number>;
  };
}

const calculateBasicStats = (commits: Commit[]): BasicCommitStats => {
  return {
    totalCommits: commits.length,
    avgMessageLength: mean(commits.map(c => c.message.length)),
    avgFilesChanged: mean(commits.map(c => c.files.length)),
    commitFrequency: {
      byDayOfWeek: countByDayOfWeek(commits),
      byHour: countByHour(commits)
    }
  };
};
```

#### 4. Simple Scoring System ✓
**Must Have (3 Categories, 100 Points Total):**

**Message Quality (40 points):**
- Has conventional commit prefix (feat, fix, etc.): 15 pts
- Message length > 20 chars: 15 pts
- Uses imperative mood (simple heuristic): 10 pts

**Commit Size (35 points):**
- Average lines changed < 300: 15 pts
- Average files changed < 10: 10 pts
- No massive commits (>1000 lines): 10 pts

**Consistency (25 points):**
- Regular commits (not all on one day): 15 pts
- Follows branch naming (if multiple branches): 10 pts

**Implementation:**
```typescript
const calculateMVPScore = (commits: Commit[]): Score => {
  const messageScore = calculateMessageQuality(commits);
  const sizeScore = calculateCommitSize(commits);
  const consistencyScore = calculateConsistency(commits);
  
  return {
    total: messageScore + sizeScore + consistencyScore,
    breakdown: {
      message: messageScore,
      size: sizeScore,
      consistency: consistencyScore
    }
  };
};

const calculateMessageQuality = (commits: Commit[]): number => {
  const hasPrefix = commits.filter(c => 
    /^(feat|fix|docs|style|refactor|test|chore):/.test(c.message)
  ).length / commits.length;
  
  const adequateLength = commits.filter(c => 
    c.message.length > 20
  ).length / commits.length;
  
  const imperativeMood = commits.filter(c =>
    /^(add|fix|update|remove|create|implement)/i.test(c.message)
  ).length / commits.length;
  
  return Math.round(
    (hasPrefix * 15) + 
    (adequateLength * 15) + 
    (imperativeMood * 10)
  );
};
```

#### 5. Basic Dashboard UI ✓
**Must Have:**
- Repository name and metadata display
- Overall score (large, prominent)
- User cards with individual scores (grid layout)
- Basic category breakdown (simple bar chart)
- Top 3 quick wins (hardcoded recommendations)

**UI Components:**
```typescript
// components/Dashboard.tsx
interface DashboardProps {
  repository: Repository;
  analysis: AnalysisResult;
}

const Dashboard = ({ repository, analysis }: DashboardProps) => {
  return (
    <div className="dashboard">
      {/* Header */}
      <header>
        <h1>{repository.full_name}</h1>
        <p>{analysis.commits.length} commits analyzed</p>
      </header>
      
      {/* Overall Score */}
      <div className="score-hero">
        <div className="score-circle">
          <span className="score-value">{analysis.overallScore}</span>
          <span className="score-label">/100</span>
        </div>
        <p className="score-description">
          {getScoreDescription(analysis.overallScore)}
        </p>
      </div>
      
      {/* Category Breakdown */}
      <div className="categories">
        <CategoryBar 
          label="Message Quality" 
          value={analysis.scores.message} 
          max={40} 
        />
        <CategoryBar 
          label="Commit Size" 
          value={analysis.scores.size} 
          max={35} 
        />
        <CategoryBar 
          label="Consistency" 
          value={analysis.scores.consistency} 
          max={25} 
        />
      </div>
      
      {/* User Grid */}
      <div className="user-grid">
        {analysis.contributors.map(user => (
          <UserCard key={user.email} user={user} />
        ))}
      </div>
      
      {/* Quick Wins */}
      <div className="recommendations">
        <h2>Quick Wins</h2>
        <RecommendationList items={getQuickWins(analysis)} />
      </div>
    </div>
  );
};
```

#### 6. Tech Stack Setup ✓
**Must Have:**
- Next.js 14 project initialized
- TypeScript configured (strict mode)
- Tailwind CSS + shadcn/ui installed
- Octokit installed and configured
- Basic file structure:
  ```
  /app
    /page.tsx (input form)
    /results/[id]/page.tsx (dashboard)
  /lib
    /github-client.ts
    /analysis.ts
    /scoring.ts
  /components
    /Dashboard.tsx
    /UserCard.tsx
    /ScoreDisplay.tsx
  /types
    /index.ts
  ```

### MVP Success Criteria
- ✅ Can input a GitHub URL and fetch repository data
- ✅ Analyzes up to 100 commits
- ✅ Displays overall score and per-user breakdown
- ✅ Shows 3 category scores with simple visualization
- ✅ Generates 3 basic recommendations
- ✅ Completes analysis in <10 seconds
- ✅ Handles errors gracefully (private repos, rate limits)

### Out of Scope for MVP
- ❌ AI/LLM analysis
- ❌ Multi-branch support
- ❌ Detailed visualizations
- ❌ Historical comparisons
- ❌ Export functionality
- ❌ Advanced metrics
- ❌ Diff analysis

---

## Post-MVP Features (Days 2-5)

### Priority 1: AI-Powered Analysis (Day 2)

#### Feature: Semantic Commit Message Analysis
**Why:** Heuristics are limited; AI can understand context and intent.

**Implementation:**
```typescript
interface SemanticAnalysis {
  followsConvention: boolean;
  conventionType: 'conventional' | 'custom' | 'none';
  clarity: number; // 0-100
  intent: 'feature' | 'bugfix' | 'refactor' | 'docs' | 'other';
  sentiment: 'positive' | 'neutral' | 'negative';
  isDescriptive: boolean;
}

const analyzeCommitMessageAI = async (
  messages: string[]
): Promise<SemanticAnalysis[]> => {
  const prompt = `Analyze these commit messages and return JSON array:
  
  For each message, determine:
  1. followsConvention: Does it follow conventional commits format?
  2. conventionType: What convention? (conventional/custom/none)
  3. clarity: 0-100 score on how clear the message is
  4. intent: Primary purpose (feature/bugfix/refactor/docs/other)
  5. sentiment: Tone of message (positive/neutral/negative)
  6. isDescriptive: Is it descriptive enough?
  
  Messages:
  ${messages.map((m, i) => `${i + 1}. ${m}`).join('\n')}
  
  Return ONLY valid JSON array, no markdown.`;
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // Fast and cheap
    messages: [
      { role: 'system', content: 'You are a Git commit analyzer. Return only JSON.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' }
  });
  
  return JSON.parse(response.choices[0].message.content);
};
```

**Batching Strategy:**
```typescript
class AIAnalysisBatcher {
  private queue: CommitMessage[] = [];
  private batchSize = 20; // Analyze 20 commits per API call
  
  async analyze(message: string): Promise<SemanticAnalysis> {
    return new Promise((resolve) => {
      this.queue.push({ message, resolve });
      
      if (this.queue.length >= this.batchSize) {
        this.processBatch();
      }
    });
  }
  
  private async processBatch() {
    const batch = this.queue.splice(0, this.batchSize);
    const results = await analyzeCommitMessageAI(
      batch.map(b => b.message)
    );
    
    batch.forEach((item, i) => {
      item.resolve(results[i]);
    });
  }
}
```

#### Feature: AI-Generated Insights
**Why:** Surface patterns humans might miss.

**Implementation:**
```typescript
const generateInsights = async (
  analysis: AnalysisResult
): Promise<Insight[]> => {
  const prompt = `Analyze this Git repository data and generate 5-8 actionable insights:
  
  Repository: ${analysis.repository.name}
  Total Commits: ${analysis.totalCommits}
  Contributors: ${analysis.contributors.length}
  
  Metrics:
  ${JSON.stringify(analysis.metrics, null, 2)}
  
  Patterns Detected:
  ${JSON.stringify(analysis.patterns, null, 2)}
  
  For each insight:
  - Be specific with data
  - Explain why it matters
  - Provide actionable recommendation
  - Rate severity (high/medium/low)
  
  Focus on:
  1. Workflow anti-patterns
  2. Collaboration opportunities
  3. Quality improvements
  4. Positive patterns to reinforce`;
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o', // Use better model for insights
    messages: [
      { role: 'system', content: INSIGHT_SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7
  });
  
  return parseInsights(response.choices[0].message.content);
};
```

**Enhanced Scoring:**
- Update scoring to use AI clarity scores
- Weight categories based on AI-detected patterns
- Add "intent consistency" category (20 pts)

**Success Criteria:**
- AI analysis completes in <30 seconds for 100 commits
- Insights are non-obvious (not just restatements of metrics)
- Recommendations are specific and actionable

---

### Priority 2: Multi-Branch & Expanded Analysis (Day 3)

#### Feature: Multi-Branch Support
**Why:** Understand branching strategy and workflow.

**Implementation:**
```typescript
interface BranchAnalysis {
  branch: Branch;
  commits: Commit[];
  metrics: BranchMetrics;
  topology: BranchTopology;
}

const analyzeBranches = async (
  owner: string,
  repo: string,
  selectedBranches?: string[]
): Promise<BranchAnalysis[]> => {
  const branches = await client.getBranches(owner, repo);
  const toAnalyze = selectedBranches 
    ? branches.filter(b => selectedBranches.includes(b.name))
    : branches;
  
  // Analyze branches in parallel
  const analyses = await Promise.all(
    toAnalyze.map(branch => analyzeBranch(owner, repo, branch))
  );
  
  return analyses;
};

const analyzeBranchTopology = (commits: Commit[]): BranchTopology => {
  const mergeCommits = commits.filter(c => c.parents.length > 1);
  const linearCommits = commits.filter(c => c.parents.length === 1);
  
  return {
    totalCommits: commits.length,
    mergeCommits: mergeCommits.length,
    linearCommits: linearCommits.length,
    mergeStrategy: detectMergeStrategy(commits),
    branchingPattern: detectBranchingPattern(commits)
  };
};
```

#### Feature: Commit Diff Analysis
**Why:** Analyze actual code changes, not just metadata.

**Implementation:**
```typescript
interface DiffAnalysis {
  linesAdded: number;
  linesDeleted: number;
  filesChanged: number;
  fileTypes: Record<string, number>; // .ts: 5, .tsx: 3
  churnScore: number; // How much the same files change
  complexity: {
    added: number;
    removed: number;
  };
}

const analyzeDiff = async (
  owner: string,
  repo: string,
  sha: string
): Promise<DiffAnalysis> => {
  const diff = await client.getCommitDiff(owner, repo, sha);
  
  return {
    linesAdded: countAdditions(diff),
    linesDeleted: countDeletions(diff),
    filesChanged: extractFiles(diff).length,
    fileTypes: groupFilesByExtension(diff),
    churnScore: calculateChurn(diff),
    complexity: analyzeComplexityChange(diff)
  };
};
```

#### Feature: Expanded Scoring (500 Points)
**New Categories:**

**1. Message Quality (100 pts)**
- Conventional format (30)
- Clarity (AI-scored) (30)
- Body presence (20)
- Ticket references (20)

**2. Commit Hygiene (100 pts)**
- Atomic commits (40)
- Size distribution (30)
- No WIP commits (30)

**3. Branching Strategy (100 pts)**
- Branch naming (30)
- Merge practices (40)
- Linear history (30)

**4. Code Quality (100 pts)**
- File churn (30)
- Test coverage indicators (40)
- Refactor isolation (30)

**5. Collaboration (100 pts)**
- Code review participation (50)
- Co-authorship (30)
- Response time (20)

**Success Criteria:**
- Support 5+ branches simultaneously
- Analyze commit diffs for 100+ commits
- Scoring system reflects real quality differences
- Branch topology visualization shows merge patterns

---

### Priority 3: Advanced Visualizations (Day 3-4)

#### Feature: Commit Timeline
**Why:** See activity patterns over time.

**Implementation:**
```typescript
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

const CommitTimeline = ({ commits }: { commits: Commit[] }) => {
  const timelineData = aggregateCommitsByDate(commits, 'day');
  
  return (
    <LineChart width={800} height={300} data={timelineData}>
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Line 
        type="monotone" 
        dataKey="commits" 
        stroke="#8884d8" 
        strokeWidth={2}
      />
    </LineChart>
  );
};
```

#### Feature: Contributor Network Graph
**Why:** Visualize collaboration patterns.

**Implementation:**
```typescript
import ReactFlow, { Node, Edge } from 'reactflow';

const ContributorNetwork = ({ contributors }: Props) => {
  const nodes: Node[] = contributors.map(c => ({
    id: c.email,
    data: { 
      label: c.name,
      commits: c.totalCommits 
    },
    position: calculatePosition(c) // Force-directed layout
  }));
  
  const edges: Edge[] = calculateCollaborationEdges(contributors);
  
  return (
    <ReactFlow 
      nodes={nodes} 
      edges={edges}
      fitView
    />
  );
};
```

#### Feature: Heat Maps
**Why:** Identify temporal patterns.

**Types:**
1. **Commit Frequency Heatmap** (hour of day × day of week)
2. **File Churn Heatmap** (files × time)
3. **Code Review Heatmap** (reviewers × time)

**Implementation:**
```typescript
const CommitFrequencyHeatmap = ({ commits }: Props) => {
  const heatmapData = generateHeatmapData(commits);
  
  return (
    <div className="heatmap">
      {DAYS.map(day => (
        <div key={day} className="heatmap-row">
          <span className="day-label">{day}</span>
          {HOURS.map(hour => {
            const value = heatmapData[day][hour];
            return (
              <div 
                key={hour}
                className="heatmap-cell"
                style={{ 
                  backgroundColor: getHeatmapColor(value) 
                }}
                title={`${day} ${hour}:00 - ${value} commits`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};
```

#### Feature: Interactive Commit Graph
**Why:** Understand repository topology.

**Implementation:**
```typescript
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

// 3D commit graph visualization
const CommitGraph3D = ({ commits }: Props) => {
  const graph = buildCommitGraph(commits);
  
  return (
    <Canvas camera={{ position: [0, 0, 100] }}>
      <OrbitControls />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      
      {graph.nodes.map(node => (
        <CommitNode key={node.sha} node={node} />
      ))}
      
      {graph.edges.map((edge, i) => (
        <CommitEdge key={i} edge={edge} />
      ))}
    </Canvas>
  );
};
```

**Success Criteria:**
- 5+ visualization types implemented
- All visualizations are interactive (zoom, pan, filter)
- Performance: renders 1000+ data points smoothly
- Mobile-responsive (fallback to simpler views)

---

### Priority 4: Comparative Analysis & Benchmarking (Day 4)

#### Feature: Time-Based Comparison
**Why:** Track improvement over time.

**Implementation:**
```typescript
interface TemporalComparison {
  period1: AnalysisResult;
  period2: AnalysisResult;
  delta: {
    scoreChange: number;
    categoryChanges: Record<string, number>;
    improvements: string[];
    regressions: string[];
  };
}

const compareTimePeriods = (
  commits: Commit[],
  period1: [Date, Date],
  period2: [Date, Date]
): TemporalComparison => {
  const commits1 = filterByDateRange(commits, period1);
  const commits2 = filterByDateRange(commits, period2);
  
  const analysis1 = analyzeCommits(commits1);
  const analysis2 = analyzeCommits(commits2);
  
  return {
    period1: analysis1,
    period2: analysis2,
    delta: calculateDelta(analysis1, analysis2)
  };
};
```

#### Feature: Multi-Repository Comparison
**Why:** Compare practices across different projects.

**Implementation:**
```typescript
const compareRepositories = async (
  repos: Array<{ owner: string; repo: string }>
): Promise<ComparativeAnalysis> => {
  // Analyze all repos in parallel
  const analyses = await Promise.all(
    repos.map(r => analyzeRepository(r.owner, r.repo))
  );
  
  // Generate comparative metrics
  return {
    repositories: analyses,
    comparison: {
      scoreDifferences: calculateScoreDifferences(analyses),
      strengthsWeaknesses: identifyStrengthsWeaknesses(analyses),
      bestPractices: extractBestPractices(analyses)
    }
  };
};
```

#### Feature: Industry Benchmarks
**Why:** Context for scores.

**Implementation:**
```typescript
interface Benchmark {
  category: string;
  industry: 'startup' | 'enterprise' | 'opensource';
  percentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
}

// Hardcoded benchmarks (could be ML-derived later)
const BENCHMARKS: Record<string, Benchmark> = {
  messageQuality: {
    category: 'Message Quality',
    industry: 'opensource',
    percentiles: { p10: 30, p25: 45, p50: 60, p75: 75, p90: 85 }
  },
  // ... more benchmarks
};

const calculatePercentile = (score: number, benchmark: Benchmark): number => {
  const { percentiles } = benchmark;
  
  if (score <= percentiles.p10) return 10;
  if (score <= percentiles.p25) return 25;
  if (score <= percentiles.p50) return 50;
  if (score <= percentiles.p75) return 75;
  if (score <= percentiles.p90) return 90;
  return 95;
};
```

**Success Criteria:**
- Compare 2+ repositories side-by-side
- Show temporal trends (week-over-week, month-over-month)
- Display percentile rankings vs benchmarks
- Highlight significant differences (statistical tests)

---

### Priority 5: Advanced Pattern Detection (Day 4-5)

#### Feature: Anti-Pattern Detection
**Why:** Identify bad practices automatically.

**Anti-Patterns to Detect:**

1. **God Commits** (one commit changes everything)
2. **Commit Diarrhea** (too many tiny commits)
3. **Friday Deploys** (risky timing)
4. **Shotgun Surgery** (same change across many files)
5. **WIP Commits** (work-in-progress in history)
6. **Merge Hell** (frequent complex conflicts)
7. **Stealth Edits** (undocumented major changes)

**Implementation:**
```typescript
interface AntiPattern {
  type: AntiPatternType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  instances: AntiPatternInstance[];
  impact: string;
  recommendation: string;
}

const detectAntiPatterns = (commits: Commit[]): AntiPattern[] => {
  const patterns: AntiPattern[] = [];
  
  // Detect God Commits
  const godCommits = commits.filter(c => 
    c.stats.filesChanged > 20 || 
    c.stats.additions + c.stats.deletions > 1000
  );
  
  if (godCommits.length > 0) {
    patterns.push({
      type: 'god-commit',
      severity: 'high',
      instances: godCommits.map(formatInstance),
      impact: 'Makes code review difficult, increases bug risk',
      recommendation: 'Break down changes into logical, atomic commits'
    });
  }
  
  // Detect Commit Diarrhea
  const microCommits = detectMicroCommitSequences(commits);
  if (microCommits.length > 0) {
    patterns.push({
      type: 'commit-diarrhea',
      severity: 'medium',
      instances: microCommits,
      impact: 'Clutters history, makes bisecting harder',
      recommendation: 'Use git rebase -i to squash related commits'
    });
  }
  
  // Detect Friday Deploys
  const fridayCommits = commits.filter(c => 
    c.timestamp.getDay() === 5 && 
    c.timestamp.getHours() > 16
  );
  
  if (fridayCommits.length > commits.length * 0.15) {
    patterns.push({
      type: 'friday-deploys',
      severity: 'medium',
      instances: fridayCommits.map(formatInstance),
      impact: 'Higher risk of weekend incidents',
      recommendation: 'Deploy earlier in the week when team is available'
    });
  }
  
  // More anti-patterns...
  
  return patterns;
};
```

#### Feature: Collaboration Pattern Analysis
**Why:** Improve team dynamics.

**Patterns to Detect:**

1. **Knowledge Silos** (one person owns a module)
2. **Review Bottlenecks** (one person reviews everything)
3. **Pair Opportunities** (people who should work together more)
4. **Conflict Zones** (files with frequent merge conflicts)

**Implementation:**
```typescript
const analyzeCollaboration = (commits: Commit[]): CollaborationInsights => {
  // Knowledge silos
  const fileOwnership = calculateFileOwnership(commits);
  const silos = Object.entries(fileOwnership)
    .filter(([file, owners]) => owners.length === 1)
    .map(([file, owners]) => ({
      file,
      owner: owners[0],
      risk: 'high'
    }));
  
  // Review patterns
  const reviewData = extractReviewData(commits);
  const bottlenecks = findReviewBottlenecks(reviewData);
  
  // Conflict zones
  const conflicts = analyzeConflictPatterns(commits);
  
  return {
    silos,
    bottlenecks,
    conflicts,
    recommendations: generateCollaborationRecommendations({
      silos,
      bottlenecks,
      conflicts
    })
  };
};
```

#### Feature: Temporal Pattern Detection
**Why:** Understand when and how work happens.

**Implementation:**
```typescript
const detectTemporalPatterns = (commits: Commit[]): TemporalPatterns => {
  return {
    workingHours: analyzeWorkingHours(commits),
    sprintAlignment: detectSprintPatterns(commits),
    velocityTrends: calculateVelocityTrends(commits),
    qualityByTime: correlateQualityWithTime(commits),
    anomalies: detectTemporalAnomalies(commits)
  };
};

// Example: Quality drops on Fridays
const correlateQualityWithTime = (commits: Commit[]): Correlation => {
  const byDay = groupBy(commits, c => c.timestamp.getDay());
  
  const avgQualityByDay = Object.entries(byDay).map(([day, commits]) => ({
    day: parseInt(day),
    avgQuality: mean(commits.map(c => c.qualityScore))
  }));
  
  return {
    correlation: calculateCorrelation(avgQualityByDay),
    insights: generateTimeQualityInsights(avgQualityByDay)
  };
};
```

**Success Criteria:**
- Detect 10+ distinct anti-patterns
- Identify collaboration bottlenecks accurately
- Surface temporal patterns with statistical significance
- Generate specific, actionable recommendations

---

### Priority 6: Report Generation & Export (Day 5)

#### Feature: Automated Report Generation
**Why:** Share findings with stakeholders.

**Report Types:**

1. **Individual Developer Report**
   - Personal score card
   - Strengths and growth areas
   - Improvement roadmap
   - Example commits (good & bad)

2. **Team Health Report**
   - Team-wide metrics
   - Collaboration analysis
   - Process adherence
   - Recommendations for leads

3. **Repository Health Report**
   - Overall quality assessment
   - Technical debt indicators
   - Maintenance priorities
   - Historical trends

**Implementation:**
```typescript
const generateReport = async (
  analysis: AnalysisResult,
  type: ReportType
): Promise<Report> => {
  // Generate sections
  const sections = await Promise.all([
    generateExecutiveSummary(analysis),
    generateMetricsSection(analysis),
    generateInsightsSection(analysis),
    generateRecommendationsSection(analysis),
    generateVisualizationsSection(analysis)
  ]);
  
  // Use AI to write narrative
  const narrative = await generateNarrative(analysis, type);
  
  return {
    type,
    generatedAt: new Date(),
    sections,
    narrative,
    visualizations: generateReportVisualizations(analysis)
  };
};

const generateNarrative = async (
  analysis: AnalysisResult,
  type: ReportType
): Promise<string> => {
  const prompt = `Write a professional report narrative:
  
  Report Type: ${type}
  Overall Score: ${analysis.overallScore}
  
  Key Findings:
  ${JSON.stringify(analysis.topInsights, null, 2)}
  
  Requirements:
  - Executive summary (2-3 paragraphs)
  - Highlight 3 most important findings
  - Balanced (strengths + growth areas)
  - Professional but conversational
  - Actionable conclusion`;
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a technical writing assistant.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.5
  });
  
  return response.choices[0].message.content;
};
```

#### Feature: Multiple Export Formats

**HTML (Interactive):**
```typescript
const exportHTML = async (report: Report): Promise<string> => {
  return renderToStaticMarkup(
    <ReportTemplate report={report} />
  );
};
```

**PDF:**
```typescript
import { jsPDF } from 'jspdf';

const exportPDF = async (report: Report): Promise<Blob> => {
  const pdf = new jsPDF();
  
  // Add title
  pdf.setFontSize(24);
  pdf.text(report.title, 20, 20);
  
  // Add sections
  let y = 40;
  for (const section of report.sections) {
    pdf.setFontSize(16);
    pdf.text(section.title, 20, y);
    y += 10;
    
    pdf.setFontSize(12);
    const lines = pdf.splitTextToSize(section.content, 170);
    pdf.text(lines, 20, y);
    y += lines.length * 7 + 10;
  }
  
  // Add charts as images
  for (const chart of report.visualizations) {
    const imgData = await chartToBase64(chart);
    pdf.addImage(imgData, 'PNG', 20, y, 170, 100);
    y += 110;
  }
  
  return pdf.output('blob');
};
```

**Markdown:**
```typescript
const exportMarkdown = (report: Report): string => {
  let md = `# ${report.title}\n\n`;
  md += `Generated: ${report.generatedAt.toLocaleString()}\n\n`;
  
  for (const section of report.sections) {
    md += `## ${section.title}\n\n`;
    md += `${section.content}\n\n`;
  }
  
  md += `## Recommendations\n\n`;
  for (const rec of report.recommendations) {
    md += `- **${rec.title}**: ${rec.description}\n`;
  }
  
  return md;
};
```

**JSON (API Export):**
```typescript
const exportJSON = (analysis: AnalysisResult): string => {
  return JSON.stringify(analysis, null, 2);
};
```

#### Feature: Shareable Links
**Why:** Easily share results without files.

**Implementation:**
```typescript
// Store analysis in local database with UUID
const createShareableLink = async (analysis: AnalysisResult): Promise<string> => {
  const id = generateUUID();
  
  await db.run(
    'INSERT INTO shared_analyses (id, data, created_at) VALUES (?, ?, ?)',
    [id, JSON.stringify(analysis), Date.now()]
  );
  
  return `http://localhost:3000/shared/${id}`;
};

// View shared analysis
// app/shared/[id]/page.tsx
export default async function SharedAnalysisPage({ params }: Props) {
  const analysis = await loadSharedAnalysis(params.id);
  
  if (!analysis) {
    return <NotFound />;
  }
  
  return <Dashboard analysis={analysis} readOnly />;
}
```

**Success Criteria:**
- Generate comprehensive reports in <5 seconds
- Export to HTML, PDF, Markdown, JSON
- Shareable links work locally
- Reports are print-friendly

---

### Priority 7: Query System & Interactivity (Day 5)

#### Feature: Natural Language Queries
**Why:** Let users ask specific questions.

**Examples:**
- "Who is the best code reviewer?"
- "Which files change the most?"
- "Show me all refactoring commits from last month"
- "When was authentication last touched?"
- "Who should review my database changes?"

**Implementation:**
```typescript
const processQuery = async (
  query: string,
  analysis: AnalysisResult
): Promise<QueryResult> => {
  // Step 1: Parse intent
  const intent = await parseQueryIntent(query);
  
  // Step 2: Execute structured query
  const results = executeStructuredQuery(intent, analysis);
  
  // Step 3: Generate explanation
  const explanation = await generateExplanation(query, results);
  
  return {
    query,
    intent,
    results,
    explanation,
    visualizations: suggestVisualizations(results)
  };
};

const parseQueryIntent = async (query: string): Promise<QueryIntent> => {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Parse user queries about Git repositories into structured queries.
        
        Available operations:
        - filter (by author, date, file, message)
        - aggregate (count, average, sum, max, min)
        - rank (top N by metric)
        - compare (between entities or time periods)
        
        Return JSON with operation, filters, and parameters.`
      },
      { role: 'user', content: query }
    ],
    response_format: { type: 'json_object' }
  });
  
  return JSON.parse(response.choices[0].message.content);
};
```

#### Feature: Interactive Filters
**Why:** Drill down into data dynamically.

**Filters:**
- Date range
- Contributors
- File paths
- Commit types (feature, bug, refactor)
- Branches
- Score ranges

**Implementation:**
```typescript
interface FilterState {
  dateRange?: [Date, Date];
  contributors?: string[];
  filePaths?: string[];
  commitTypes?: CommitType[];
  branches?: string[];
  scoreRange?: [number, number];
}

const FilterPanel = ({ onFilterChange }: Props) => {
  const [filters, setFilters] = useState<FilterState>({});
  
  const applyFilter = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };
  
  return (
    <div className="filter-panel">
      <DateRangeFilter onChange={v => applyFilter('dateRange', v)} />
      <ContributorFilter onChange={v => applyFilter('contributors', v)} />
      <FilePathFilter onChange={v => applyFilter('filePaths', v)} />
      <CommitTypeFilter onChange={v => applyFilter('commitTypes', v)} />
      <ScoreRangeFilter onChange={v => applyFilter('scoreRange', v)} />
    </div>
  );
};
```

#### Feature: Real-Time Search
**Why:** Find specific commits quickly.

**Implementation:**
```typescript
const CommitSearch = ({ commits }: Props) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Commit[]>([]);
  
  const search = useMemo(() => {
    return (term: string) => {
      const lower = term.toLowerCase();
      return commits.filter(c =>
        c.message.toLowerCase().includes(lower) ||
        c.author.name.toLowerCase().includes(lower) ||
        c.files.some(f => f.filename.toLowerCase().includes(lower))
      );
    };
  }, [commits]);
  
  useEffect(() => {
    if (searchTerm.length > 2) {
      setResults(search(searchTerm));
    } else {
      setResults([]);
    }
  }, [searchTerm, search]);
  
  return (
    <div className="commit-search">
      <input
        type="text"
        placeholder="Search commits..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />
      <SearchResults results={results} />
    </div>
  );
};
```

**Success Criteria:**
- Natural language queries work for 10+ common questions
- Filters update results in real-time
- Search returns results in <100ms
- Query results are visualizable

---

### Priority 8: Performance Optimization & Caching (Day 5)

#### Feature: Intelligent Caching
**Why:** Avoid redundant API calls and computation.

**Caching Layers:**

1. **GitHub API Response Cache (Redis)**
   - TTL: 24 hours for metadata, 7 days for commits
   - Key format: `github:{resource}:{identifier}`

2. **Analysis Results Cache (SQLite)**
   - Persistent storage for completed analyses
   - Incremental updates for new commits

3. **AI Response Cache (Redis)**
   - TTL: 30 days (commit messages don't change)
   - Key format: `ai:{model}:{hash(prompt)}`

**Implementation:**
```typescript
class AnalysisCache {
  private redis: Redis;
  private db: Database;
  
  async getCachedAnalysis(
    owner: string,
    repo: string
  ): Promise<AnalysisResult | null> {
    // Try Redis first
    const key = `analysis:${owner}:${repo}`;
    const cached = await this.redis.get(key);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Try SQLite
    const row = this.db.prepare(
      'SELECT data FROM analyses WHERE owner = ? AND repo = ? ORDER BY created_at DESC LIMIT 1'
    ).get(owner, repo);
    
    return row ? JSON.parse(row.data) : null;
  }
  
  async cacheAnalysis(
    owner: string,
    repo: string,
    analysis: AnalysisResult
  ) {
    // Store in both
    const key = `analysis:${owner}:${repo}`;
    await this.redis.setex(key, 3600, JSON.stringify(analysis));
    
    this.db.prepare(
      'INSERT INTO analyses (owner, repo, data, created_at) VALUES (?, ?, ?, ?)'
    ).run(owner, repo, JSON.stringify(analysis), Date.now());
  }
  
  async getCachedAIResponse(
    model: string,
    prompt: string
  ): Promise<string | null> {
    const hash = createHash('sha256').update(prompt).digest('hex');
    const key = `ai:${model}:${hash}`;
    return await this.redis.get(key);
  }
  
  async cacheAIResponse(
    model: string,
    prompt: string,
    response: string
  ) {
    const hash = createHash('sha256').update(prompt).digest('hex');
    const key = `ai:${model}:${hash}`;
    await this.redis.setex(key, 2592000, response); // 30 days
  }
}
```

#### Feature: Parallel Processing
**Why:** Analyze large repos faster.

**Implementation:**
```typescript
import pMap from 'p-map';

const analyzeCommitsInParallel = async (
  commits: Commit[],
  concurrency = 10
): Promise<CommitAnalysis[]> => {
  return await pMap(
    commits,
    async (commit) => {
      // Check cache first
      const cached = await cache.getCommitAnalysis(commit.sha);
      if (cached) return cached;
      
      // Analyze
      const analysis = await analyzeCommit(commit);
      
      // Cache result
      await cache.cacheCommitAnalysis(commit.sha, analysis);
      
      return analysis;
    },
    { concurrency }
  );
};
```

#### Feature: Incremental Analysis
**Why:** Only analyze new data.

**Implementation:**
```typescript
const analyzeIncremental = async (
  owner: string,
  repo: string
): Promise<AnalysisResult> => {
  // Load previous analysis
  const previous = await cache.getCachedAnalysis(owner, repo);
  
  if (!previous) {
    // First time: full analysis
    return await analyzeRepository(owner, repo);
  }
  
  // Get new commits since last analysis
  const newCommits = await client.getCommitsSince(
    owner,
    repo,
    previous.lastCommitDate
  );
  
  if (newCommits.length === 0) {
    // No new commits
    return previous;
  }
  
  // Analyze only new commits
  const newAnalysis = await analyzeCommits(newCommits);
  
  // Merge with previous
  return mergeAnalyses(previous, newAnalysis);
};
```

#### Feature: Progressive Loading
**Why:** Show results as they become available.

**Implementation:**
```typescript
const AnalysisPipeline = ({ repoUrl }: Props) => {
  const [stage, setStage] = useState<AnalysisStage>('initializing');
  const [progress, setProgress] = useState(0);
  const [partialResults, setPartialResults] = useState<Partial<AnalysisResult>>({});
  
  useEffect(() => {
    const analyze = async () => {
      // Stage 1: Fetch repository
      setStage('fetching_repo');
      const repo = await fetchRepository(repoUrl);
      setPartialResults({ repository: repo });
      setProgress(10);
      
      // Stage 2: Fetch commits
      setStage('fetching_commits');
      const commits = await fetchCommits(repo);
      setPartialResults(prev => ({ ...prev, commits }));
      setProgress(30);
      
      // Stage 3: Basic analysis
      setStage('analyzing_basic');
      const basicMetrics = await calculateBasicMetrics(commits);
      setPartialResults(prev => ({ ...prev, basicMetrics }));
      setProgress(50);
      
      // Stage 4: AI analysis
      setStage('analyzing_ai');
      const aiAnalysis = await performAIAnalysis(commits);
      setPartialResults(prev => ({ ...prev, aiAnalysis }));
      setProgress(70);
      
      // Stage 5: Generate insights
      setStage('generating_insights');
      const insights = await generateInsights({ ...partialResults, aiAnalysis });
      setPartialResults(prev => ({ ...prev, insights }));
      setProgress(100);
      
      setStage('complete');
    };
    
    analyze();
  }, [repoUrl]);
  
  return (
    <div>
      <ProgressBar stage={stage} progress={progress} />
      {partialResults.repository && <RepositoryInfo repo={partialResults.repository} />}
      {partialResults.basicMetrics && <MetricsPreview metrics={partialResults.basicMetrics} />}
      {partialResults.insights && <InsightsList insights={partialResults.insights} />}
    </div>
  );
};
```

**Success Criteria:**
- Cache hit rate >80% for repeated analyses
- Parallel processing reduces analysis time by 50%+
- Incremental analysis only processes new commits
- UI shows progressive results, not blocking

---

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────┐
│                  Frontend (Next.js/React)                │
│  ┌───────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │  Input UI │  │  Dashboard   │  │  Visualizations │  │
│  │  - URL    │  │  - Metrics   │  │  - Charts       │  │
│  │  - Config │  │  - Insights  │  │  - Graphs       │  │
│  └───────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              API Layer (Next.js API Routes)              │
│  ┌─────────────────────────────────────────────────┐   │
│  │         Analysis Orchestrator                    │   │
│  │  - Request routing                               │   │
│  │  - Progress tracking                             │   │
│  │  - Error handling                                │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐  ┌────────────────┐  ┌───────────────┐
│  Git Engine   │  │  AI Engine     │  │  Analysis     │
│  - GitHub API │  │  - OpenAI      │  │  Engine       │
│  - Octokit    │  │  - GPT-4o      │  │  - Scoring    │
│  - Caching    │  │  - Embeddings  │  │  - Patterns   │
└───────────────┘  └────────────────┘  └───────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Data Layer (SQLite + Redis)                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  - Analysis cache                                │   │
│  │  - GitHub API cache                              │   │
│  │  - AI response cache                             │   │
│  │  - Historical data                               │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- TypeScript (strict mode)
- Tailwind CSS + shadcn/ui
- Recharts (standard charts)
- D3.js (custom visualizations)
- React Flow (commit graphs)
- TanStack Query (server state)
- Zustand (client state)

**Backend:**
- Next.js API Routes
- Octokit (GitHub API)
- OpenAI SDK
- simple-git (local Git operations)

**Data:**
- SQLite3 (better-sqlite3)
- Redis (ioredis) for caching
- Zod for validation

**AI/ML:**
- OpenAI API (GPT-4o, GPT-4o-mini)
- Custom embeddings for clustering

**Utilities:**
- date-fns (date manipulation)
- lodash (data transformation)
- p-map (parallel processing)

### Project Structure

```
gitscore/
├── app/
│   ├── page.tsx                    # Landing page with input
│   ├── results/[id]/
│   │   └── page.tsx                # Results dashboard
│   ├── shared/[id]/
│   │   └── page.tsx                # Shared analysis view
│   └── api/
│       ├── analyze/route.ts        # Main analysis endpoint
│       ├── query/route.ts          # Query processor
│       └── export/route.ts         # Report export
├── lib/
│   ├── github/
│   │   ├── client.ts               # GitHub API client
│   │   ├── extractor.ts            # Data extraction
│   │   └── cache.ts                # API caching
│   ├── analysis/
│   │   ├── pipeline.ts             # Analysis orchestration
│   │   ├── scoring.ts              # Scoring algorithms
│   │   ├── patterns.ts             # Pattern detection
│   │   └── insights.ts             # Insight generation
│   ├── ai/
│   │   ├── openai-client.ts        # OpenAI integration
│   │   ├── semantic-analysis.ts    # Commit message AI
│   │   └── insight-generation.ts   # AI-powered insights
│   ├── database/
│   │   ├── sqlite.ts               # SQLite connection
│   │   ├── redis.ts                # Redis connection
│   │   └── schema.ts               # Database schema
│   └── utils/
│       ├── date.ts                 # Date utilities
│       ├── stats.ts                # Statistical functions
│       └── parsing.ts              # Data parsing
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── dashboard/
│   │   ├── Dashboard.tsx
│   │   ├── ScoreCard.tsx
│   │   ├── UserCard.tsx
│   │   └── InsightsList.tsx
│   ├── visualizations/
│   │   ├── CommitTimeline.tsx
│   │   ├── ContributorNetwork.tsx
│   │   ├── HeatMap.tsx
│   │   └── CommitGraph.tsx
│   └── shared/
│       ├── ProgressBar.tsx
│       ├── FilterPanel.tsx
│       └── SearchBar.tsx
├── types/
│   ├── github.ts                   # GitHub API types
│   ├── analysis.ts                 # Analysis types
│   └── scoring.ts                  # Scoring types
└── config/
    ├── benchmarks.ts               # Scoring benchmarks
    ├── prompts.ts                  # AI prompts
    └── settings.ts                 # App settings
```

---

## Data Models

### Core Models

```typescript
// Repository
interface Repository {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  url: string;
  defaultBranch: string;
  description?: string;
  language?: string;
  stars: number;
  forks: number;
  createdAt: Date;
  updatedAt: Date;
}

// Commit
interface Commit {
  sha: string;
  message: string;
  body?: string;
  author: Author;
  committer: Author;
  timestamp: Date;
  branch: string;
  parents: string[];
  
  stats: {
    additions: number;
    deletions: number;
    total: number;
    filesChanged: number;
  };
  
  files: FileChange[];
  
  // Analysis results (populated during analysis)
  analysis?: CommitAnalysis;
  scores?: CommitScores;
}

interface Author {
  name: string;
  email: string;
  username?: string;
  avatarUrl?: string;
}

interface FileChange {
  filename: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

// Analysis Results
interface AnalysisResult {
  id: string;
  repository: Repository;
  analyzedAt: Date;
  
  // Commits
  commits: Commit[];
  totalCommits: number;
  dateRange: [Date, Date];
  
  // Contributors
  contributors: ContributorAnalysis[];
  totalContributors: number;
  
  // Scores
  overallScore: number;
  categoryScores: CategoryScores;
  
  // Insights
  insights: Insight[];
  antiPatterns: AntiPattern[];
  recommendations: Recommendation[];
  
  // Patterns
  collaborationPatterns: CollaborationPattern[];
  temporalPatterns: TemporalPattern[];
  
  // Metadata
  analysisConfig: AnalysisConfig;
  performanceMetrics: PerformanceMetrics;
}

interface CategoryScores {
  messageQuality: number;
  commitHygiene: number;
  branchingStrategy: number;
  codeQuality: number;
  collaboration: number;
}

// Contributor Analysis
interface ContributorAnalysis {
  author: Author;
  
  commits: Commit[];
  totalCommits: number;
  
  stats: {
    totalAdditions: number;
    totalDeletions: number;
    avgCommitSize: number;
    filesChanged: number;
  };
  
  scores: ContributorScores;
  
  patterns: {
    workingHours: number[]; // 0-23
    preferredDays: number[]; // 0-6
    velocity: number; // commits per day
  };
  
  strengths: string[];
  improvements: string[];
  recommendations: Recommendation[];
}

interface ContributorScores {
  overall: number;
  messageQuality: number;
  commitHygiene: number;
  collaboration: number;
  consistency: number;
}

// Commit Analysis
interface CommitAnalysis {
  semantics: {
    followsConvention: boolean;
    conventionType: string;
    intent: CommitIntent;
    clarity: number; // 0-100
    sentiment: 'positive' | 'neutral' | 'negative';
  };
  
  quality: {
    isAtomic: boolean;
    size: 'small' | 'medium' | 'large' | 'xlarge';
    complexity: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
  
  patterns: {
    isRefactor: boolean;
    isFeature: boolean;
    isBugfix: boolean;
    isWIP: boolean;
  };
}

type CommitIntent = 
  | 'feature'
  | 'bugfix'
  | 'refactor'
  | 'docs'
  | 'style'
  | 'test'
  | 'chore'
  | 'performance'
  | 'security';

// Insights
interface Insight {
  id: string;
  category: InsightCategory;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  impact: string;
  evidence: {
    commits?: string[];
    contributors?: string[];
    metrics?: Record<string, number>;
  };
  recommendations: string[];
}

type InsightCategory =
  | 'workflow'
  | 'collaboration'
  | 'quality'
  | 'performance'
  | 'technical-debt';

// Anti-Patterns
interface AntiPattern {
  type: AntiPatternType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  instances: AntiPatternInstance[];
  frequency: number;
  impact: string;
  recommendation: string;
}

type AntiPatternType =
  | 'god-commit'
  | 'commit-diarrhea'
  | 'friday-deploys'
  | 'shotgun-surgery'
  | 'wip-commits'
  | 'merge-hell'
  | 'stealth-edits';

interface AntiPatternInstance {
  commit: string;
  timestamp: Date;
  author: string;
  details: string;
}

// Recommendations
interface Recommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  actionItems: string[];
  impact: string;
  effort: 'low' | 'medium' | 'high';
  resources?: Array<{
    title: string;
    url: string;
  }>;
}
```

---

## UI/UX Design

### Design Principles
1. **Data-First**: Show metrics immediately, details on demand
2. **Progressive Disclosure**: Simple → Complex as user explores
3. **Visual Hierarchy**: Most important data is largest/most prominent
4. **Actionable**: Every insight leads to a recommendation
5. **Comparative**: Always show context (percentiles, trends)

### Color Scheme
```typescript
const colors = {
  score: {
    excellent: '#10b981', // green-500
    good: '#3b82f6',      // blue-500
    average: '#f59e0b',   // amber-500
    poor: '#ef4444',      // red-500
  },
  severity: {
    info: '#3b82f6',      // blue-500
    warning: '#f59e0b',   // amber-500
    critical: '#ef4444',  // red-500
  },
  charts: {
    primary: '#6366f1',   // indigo-500
    secondary: '#8b5cf6', // violet-500
    tertiary: '#ec4899',  // pink-500
  }
};
```

### Typography
- **Headers**: Inter, 600-800 weight
- **Body**: Inter, 400-500 weight
- **Code**: JetBrains Mono, 400 weight

### Components

#### Score Display
```typescript
const ScoreDisplay = ({ score, maxScore }: Props) => {
  const percentage = (score / maxScore) * 100;
  const color = getScoreColor(percentage);
  
  return (
    <div className="relative w-48 h-48">
      <svg viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="8"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${percentage * 2.827} 282.7`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <span className="text-5xl font-bold">{score}</span>
        <span className="text-gray-500">/ {maxScore}</span>
      </div>
    </div>
  );
};
```

#### User Card
```typescript
const UserCard = ({ user }: { user: ContributorAnalysis }) => {
  return (
    <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center gap-4 mb-4">
        <Avatar src={user.author.avatarUrl} name={user.author.name} />
        <div>
          <h3 className="font-semibold">{user.author.name}</h3>
          <p className="text-sm text-gray-500">{user.totalCommits} commits</p>
        </div>
      </div>
      
      <div className="space-y-2">
        <ScoreBadge label="Overall" value={user.scores.overall} />
        <ScoreBadge label="Message Quality" value={user.scores.messageQuality} />
        <ScoreBadge label="Commit Hygiene" value={user.scores.commitHygiene} />
      </div>
      
      <button className="mt-4 w-full btn-primary">
        View Details
      </button>
    </div>
  );
};
```

#### Insight Card
```typescript
const InsightCard = ({ insight }: { insight: Insight }) => {
  const icon = getSeverityIcon(insight.severity);
  const color = getSeverityColor(insight.severity);
  
  return (
    <div className={`border-l-4 p-4 rounded ${color}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">{icon}</div>
        <div className="flex-1">
          <h4 className="font-semibold mb-2">{insight.title}</h4>
          <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
          
          {insight.evidence && (
            <div className="text-sm bg-gray-50 p-2 rounded mb-3">
              <strong>Evidence:</strong>
              <ul className="list-disc list-inside mt-1">
                {Object.entries(insight.evidence.metrics || {}).map(([key, value]) => (
                  <li key={key}>{key}: {value}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="space-y-1">
            {insight.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-green-500">✓</span>
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## Testing Strategy

### Test Repositories
**Curated test repos with different characteristics:**

1. **Small Personal Project** (50-100 commits)
   - Single contributor
   - Inconsistent practices
   - Good for MVP testing

2. **Team Project** (500-1000 commits, 5-10 contributors)
   - Multiple branches
   - Varied quality
   - Good for collaboration analysis

3. **Popular Open Source** (10K+ commits, 100+ contributors)
   - Complex branching
   - High quality standards
   - Good for performance testing

4. **Your Own Projects** (dogfooding)
   - Real-world workflows
   - Known patterns
   - Good for insight validation

### Unit Tests

```typescript
// lib/__tests__/scoring.test.ts
describe('Scoring System', () => {
  it('calculates message quality correctly', () => {
    const commits = [
      mockCommit('feat: add feature'),
      mockCommit('fix: bug'),
      mockCommit('update stuff'), // poor
    ];
    
    const score = calculateMessageQuality(commits);
    expect(score).toBeGreaterThan(50);
    expect(score).toBeLessThan(75);
  });
  
  it('penalizes large commits', () => {
    const commits = [
      mockCommit('feat: add feature', { additions: 1000 }),
      mockCommit('fix: small fix', { additions: 10 }),
    ];
    
    const score = calculateCommitSize(commits);
    expect(score).toBeLessThan(20); // Should be penalized
  });
});

// lib/__tests__/patterns.test.ts
describe('Anti-Pattern Detection', () => {
  it('detects god commits', () => {
    const commits = [
      mockCommit('massive change', { filesChanged: 50, additions: 2000 })
    ];
    
    const patterns = detectAntiPatterns(commits);
    expect(patterns).toContainEqual(
      expect.objectContaining({ type: 'god-commit' })
    );
  });
});
```

### Integration Tests

```typescript
// app/api/__tests__/analyze.test.ts
describe('Analysis API', () => {
  it('analyzes a repository successfully', async () => {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://github.com/user/repo'
      })
    });
    
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result).toHaveProperty('overallScore');
    expect(result.contributors.length).toBeGreaterThan(0);
  });
  
  it('handles invalid repository', async () => {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://github.com/invalid/repo'
      })
    });
    
    expect(response.status).toBe(404);
  });
});
```

### Manual Testing Checklist

**Day 1 (MVP):**
- [ ] Input GitHub URL and validate
- [ ] Fetch repository data successfully
- [ ] Analyze 100 commits without errors
- [ ] Display scores for all users
- [ ] Show recommendations
- [ ] Handle rate limit errors

**Day 2 (AI Analysis):**
- [ ] AI analysis completes without errors
- [ ] Insights are relevant and non-obvious
- [ ] Recommendations are actionable
- [ ] Batching reduces API costs

**Day 3 (Multi-Branch):**
- [ ] All branches fetch correctly
- [ ] Branch filtering works
- [ ] Diff analysis extracts data
- [ ] Scoring reflects quality differences

**Day 4 (Visualizations):**
- [ ] All charts render correctly
- [ ] Charts are interactive (zoom, pan)
- [ ] Responsive on different screen sizes
- [ ] Data updates when filtered

**Day 5 (Reports & Polish):**
- [ ] Reports generate successfully
- [ ] Export to all formats works
- [ ] Shareable links work locally
- [ ] Query system returns correct results
- [ ] Cache improves performance

---

## Future Enhancements

### Post-5-Day Features

#### Advanced ML Models
- Train custom models on commit history
- Predict commit quality before committing
- Recommend optimal commit groupings
- Detect anomalous behavior (security)

#### VS Code Extension
```typescript
// Pre-commit analysis
vscode.commands.registerCommand('gitscore.analyzeStaged', async () => {
  const staged = await getStagedChanges();
  const analysis = await analyzeCommit(staged);
  
  if (analysis.score < 70) {
    const proceed = await vscode.window.showWarningMessage(
      `Commit score: ${analysis.score}/100. Proceed?`,
      'Yes', 'Improve'
    );
    
    if (proceed === 'Improve') {
      showImprovementSuggestions(analysis);
    }
  }
});
```

#### Git Hooks
- Pre-commit: Block low-quality commits
- Pre-push: Require minimum score
- Post-commit: Send analytics to dashboard

#### Team Dashboard
- Real-time team metrics
- Leaderboards (gamification)
- Goal tracking
- Automated reporting (weekly digests)

#### Integration APIs
- GitHub Actions integration
- Slack/Discord notifications
- Jira ticket linking
- CI/CD pipeline integration

#### Enterprise Features
- LDAP/SSO authentication
- Custom scoring rubrics per team
- Compliance reporting
- Multi-repository fleet analysis

---

## Appendix

### OpenAI API Cost Estimation

**MVP (Day 1):**
- No AI usage
- Cost: $0

**Day 2+ (AI Features):**
- Semantic analysis: ~0.5 cents per 100 commits (GPT-4o-mini)
- Insight generation: ~2 cents per repository (GPT-4o)
- Report generation: ~3 cents per report (GPT-4o)

**Example:**
- Analyze 5 repos @ 100 commits each
- Semantic: 5 × $0.005 = $0.025
- Insights: 5 × $0.02 = $0.10
- Reports: 5 × $0.03 = $0.15
- **Total: ~$0.28 for testing**

### GitHub API Rate Limits

**Without Authentication:**
- 60 requests/hour per IP
- Sufficient for MVP testing (1-2 repos)

**With Personal Access Token:**
- 5,000 requests/hour
- Sufficient for extensive testing (20+ repos)

**Best Practices:**
- Cache all responses
- Use conditional requests (ETags)
- Implement exponential backoff
- Monitor rate limit headers

### Recommended GitHub PAT Scopes

**For Public Repos:**
- No scopes needed (public access)

**For Private Repos:**
- `repo` (full repository access)

**For Enhanced Analysis:**
- `read:user` (user information)
- `read:org` (organization data)

### Database Schema

```sql
-- SQLite schema for local storage

CREATE TABLE analyses (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,
  data TEXT NOT NULL, -- JSON
  created_at INTEGER NOT NULL,
  INDEX idx_owner_repo (owner, repo)
);

CREATE TABLE commit_cache (
  sha TEXT PRIMARY KEY,
  data TEXT NOT NULL, -- JSON
  cached_at INTEGER NOT NULL
);

CREATE TABLE ai_cache (
  hash TEXT PRIMARY KEY,
  model TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  response TEXT NOT NULL,
  cached_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE shared_analyses (
  id TEXT PRIMARY KEY,
  analysis_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  FOREIGN KEY (analysis_id) REFERENCES analyses(id)
);
```

---

## Success Criteria

### MVP (Day 1)
- ✅ Analyze public GitHub repository
- ✅ Display overall score + per-user breakdown
- ✅ Show 3 category scores
- ✅ Generate 3 basic recommendations
- ✅ Complete in <10 seconds
- ✅ Handle errors gracefully

### Full Project (Day 5)
- ✅ AI-powered semantic analysis
- ✅ Multi-branch support
- ✅ 5+ visualization types
- ✅ Anti-pattern detection (10+ types)
- ✅ Comparative analysis (time-based)
- ✅ Report generation (3+ formats)
- ✅ Natural language queries
- ✅ Intelligent caching (80%+ hit rate)
- ✅ Analyze 10K+ commits efficiently

---

**Document Version:** 1.0  
**Last Updated:** December 11, 2025  
**Status:** Ready for Implementation
