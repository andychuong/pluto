ai-git-workflow/
├── install.sh                    # Installer script
├── commands/
│   ├── micro.md                  # /micro - create micro-commit
│   ├── consolidate.md            # /consolidate - run consolidation
│   ├── consolidate-plan.md       # /consolidate-plan - dry run
│   ├── qa.md                     # /qa - run QA checks
│   ├── recover.md                # /recover - recovery workflow
│   └── session.md                # /session - manage sessions
├── agents/
│   ├── consolidation-agent.md    # Analyzes and groups commits
│   ├── qa-agent.md               # Validates consolidated commits
│   └── git-historian-agent.md    # Writes good commit messages
└── CLAUDE.md                     # Project instructions (hooks into main agent)