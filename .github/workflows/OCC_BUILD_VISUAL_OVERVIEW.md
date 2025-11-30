# OCC Build Workflow - Visual Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    OCC Build - Complete Stack                    │
│                   GitHub Actions Workflow                         │
└─────────────────────────────────────────────────────────────────┘

Triggers: push/PR to main/master, manual dispatch

┌───────────────────────────────────────────────────────────────────┐
│ Stage 1: Foundation                                                │
├───────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐                                                 │
│  │   CogUtil    │  Core utility library                           │
│  │  (Foundation)│  - Thread-safe data structures                  │
│  └──────────────┘  - OS portability                               │
│         │                                                           │
└─────────┼───────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Stage 2: Core Database                                            │
├───────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐                                                 │
│  │  AtomSpace   │  Hypergraph knowledge representation            │
│  │ (Core DB)    │  - Query engine                                 │
│  └──────────────┘  - Graph rewriting                              │
│         │                                                           │
└─────────┼───────────────────────────────────────────────────────────┘
          │
          ├─────────────────────────────────────────┐
          │                                         │
          ▼                                         ▼
┌─────────────────────────┐           ┌──────────────────────────┐
│ Stage 3: Storage         │           │ Stage 4: Networking      │
├──────────────────────────┤           ├──────────────────────────┤
│ ┌────────────────────┐   │           │ ┌──────────────────┐     │
│ │ AtomSpace Storage  │   │           │ │   CogServer      │     │
│ │  (Base Interface)  │   │           │ │   (Network API)  │     │
│ └────────────────────┘   │           │ └──────────────────┘     │
│         │                │           │         │                │
│         ├────────┐       │           └─────────┼────────────────┘
│         ▼        ▼       │                     │
│ ┌────────────┐ ┌──────┐ │                     ▼
│ │ AS-Rocks   │ │ AS-  │ │           ┌──────────────────────┐
│ │ (RocksDB)  │ │ Cog  │◄├───────────┤  AtomSpace-Cog       │
│ └────────────┘ └──────┘ │           │  (Network Storage)   │
│                          │           └──────────────────────┘
└──────────────────────────┘
          │
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Stage 5-9: Reasoning & Learning (Parallel)                        │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────┐                          ┌──────────────┐          │
│  │  Unify   │──────┐                   │  Attention   │          │
│  │(Pattern) │      │                   │ (ECAN/STI)   │          │
│  └──────────┘      │                   └──────────────┘          │
│                    ▼                           │                 │
│              ┌──────────┐                      │                 │
│              │   URE    │                      │                 │
│              │  (Rules) │                      │                 │
│              └──────────┘                      │                 │
│                    │                           │                 │
│         ┌──────────┼───────────┐               │                 │
│         ▼          ▼           ▼               │                 │
│    ┌────────┐ ┌────────┐ ┌─────────┐          │                 │
│    │ Miner  │ │  PLN   │ │AS-MOSES │          │                 │
│    │(Mining)│ │(Logic) │ │ (Evol.) │          │                 │
│    └────────┘ └────────┘ └─────────┘          │                 │
│                                                │                 │
└────────────────────────────────────────────────┼─────────────────┘
                                                 │
                                                 │
                                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Stage 10-13: Extended Components (Parallel)                       │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────┐  ┌───────────┐  ┌─────────┐  ┌────────────┐      │
│  │  Matrix  │  │ SpaceTime │  │   PLN   │  │   Learn    │      │
│  │(Sparse)  │  │  (Spatio  │  │ (Logic) │  │ (Language) │      │
│  │          │  │  Temporal)│  │         │  │            │      │
│  └──────────┘  └───────────┘  └─────────┘  └────────────┘      │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
          │                │                │              │
          │                │                │              │
          └────────────────┴────────────────┴──────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ Final Stage: Package & Report                                     │
├───────────────────────────────────────────────────────────────────┤
│  • Collect all build artifacts                                   │
│  • Generate build report                                          │
│  • Upload for 30 days retention                                  │
└───────────────────────────────────────────────────────────────────┘
```

## Component Statistics

| Category | Components | Build Time (est.) |
|----------|-----------|-------------------|
| Foundation | 1 | ~3 min |
| Core | 1 | ~8 min |
| Storage | 3 | ~5 min each |
| Networking | 2 | ~4 min each |
| Reasoning | 5 | ~4-6 min each |
| Extended | 4 | ~3-5 min each |
| **Total** | **16 jobs** | **~35-40 min** |

## Parallel Execution Groups

```
Group 1: CogUtil (sequential - foundation)
    ↓
Group 2: AtomSpace (depends on CogUtil)
    ↓
Group 3 (parallel):
    ├── AtomSpace Storage → Rocks
    ├── CogServer → AtomSpace-Cog
    ├── Unify → URE → [Miner, PLN, AS-MOSES]
    ├── Matrix
    ├── SpaceTime
    └── Learn
    ↓
Group 4 (parallel):
    ├── Attention (needs CogServer)
    └── [Other dependent components]
    ↓
Group 5: Package & Report (needs all)
```

## Key Features

### Caching Strategy
```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   CCache    │────▶│     GHC      │────▶│ Haskell Deps    │
│ (Compiler)  │     │  (Haskell)   │     │   (Stack)       │
└─────────────┘     └──────────────┘     └─────────────────┘
     ~50%                ~80%                   ~90%
  Time Saved         Time Saved             Time Saved
```

### Dependency Flow
```
CogUtil ──┬─▶ AtomSpace ──┬─▶ AtomSpace-Storage ──┬─▶ AtomSpace-Rocks
          │               │                        └─▶ CogServer ──▶ AtomSpace-Cog
          │               │                                        └─▶ Attention
          │               ├─▶ Unify ──▶ URE ──┬─▶ Miner
          │               │                   ├─▶ PLN
          │               │                   └─▶ AS-MOSES
          │               ├─▶ Matrix
          │               ├─▶ SpaceTime
          │               └─▶ Learn
          │
          └─▶ [All components depend on CogUtil]
```

## Comparison with CircleCI

| Feature | CircleCI | GitHub Actions |
|---------|----------|----------------|
| Jobs | 14 | 16 |
| Parallelization | Limited | Better |
| Caching | Workspace | Artifacts + Cache |
| Dependencies | Docker image | APT packages |
| Test handling | Always run | Continue on error |
| Artifacts | Per plan | 1-30 days |
| Documentation | Basic | Comprehensive |

## Build Matrix Potential

Currently single platform (Ubuntu). Can expand to:

```
┌─────────────────────────────────────────┐
│ Operating Systems                        │
├──────────┬──────────┬──────────┬────────┤
│  Ubuntu  │  macOS   │ Windows  │ Alpine │
│ (Current)│ (Future) │ (Future) │(Future)│
└──────────┴──────────┴──────────┴────────┘
```

## Artifact Flow

```
┌─────────────┐
│ Each Build  │
│   Stage     │
└──────┬──────┘
       │ Upload *.so files
       ▼
┌─────────────────┐
│ GitHub Storage  │
│  (Artifacts)    │
│  Retention: 1d  │
└──────┬──────────┘
       │ Download in Package stage
       ▼
┌─────────────────┐
│ Build Report    │
│  (Combined)     │
│ Retention: 30d  │
└─────────────────┘
```

## Resource Usage

```
Runner: ubuntu-latest (2-core, 7GB RAM)

Per Job:
┌─────────────────────────────────┐
│ Dependency Install:  ~2 min     │
│ Component Build:     ~3-8 min   │
│ Test Execution:      ~1-3 min   │
│ Artifact Upload:     ~30 sec    │
├─────────────────────────────────┤
│ Total per job:       ~7-14 min  │
└─────────────────────────────────┘

Total Pipeline: ~35-40 min (with parallelization)
```

## Next Steps

1. ✅ Workflow created
2. ✅ Documentation complete
3. ⏳ Test on actual push
4. ⏳ Monitor build times
5. ⏳ Optimize as needed
6. ⏳ Add multi-platform support
7. ⏳ Create custom Docker image for faster builds

---

**Created**: 2025-11-30
**Based on**: CircleCI configs in cogutil/ and atomspace/
**Workflow File**: `.github/workflows/occ-build.yml`
**Documentation**: 
- `OCC_BUILD_WORKFLOW_README.md`
- `CIRCLECI_TO_GITHUB_ACTIONS.md`
