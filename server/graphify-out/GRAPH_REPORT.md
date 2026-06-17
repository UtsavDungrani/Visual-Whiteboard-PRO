# Graph Report - server  (2026-06-17)

## Corpus Check
- 9 files · ~4,783 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 75 nodes · 78 edges · 8 communities (4 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3b0a4675`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]

## God Nodes (most connected - your core abstractions)
1. `app` - 3 edges
2. `scripts` - 3 edges
3. `cleanupLayout()` - 2 edges
4. `architectureAssist()` - 2 edges
5. `express` - 1 edges
6. `cors` - 1 edges
7. `http` - 1 edges
8. `{ Server }` - 1 edges
9. `mongoose` - 1 edges
10. `Whiteboard` - 1 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (8 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (26): activeUsers, aiLimiter, auth, authLimiter, bcrypt, cors, { createAdapter }, ElementContext (+18 more)

### Community 1 - "Community 1"
Cohesion: 0.17
Nodes (9): app, mongoose, UserSchema, { app }, mongoose, request, User, { app } (+1 more)

### Community 2 - "Community 2"
Cohesion: 0.17
Nodes (12): dependencies, bcryptjs, cors, dotenv, express, express-rate-limit, jsonwebtoken, mongoose (+4 more)

### Community 3 - "Community 3"
Cohesion: 0.18
Nodes (10): devDependencies, jest, supertest, main, name, private, scripts, start (+2 more)

## Knowledge Gaps
- **58 isolated node(s):** `express`, `cors`, `http`, `{ Server }`, `mongoose` (+53 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Community 2` to `Community 3`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **What connects `express`, `cors`, `http` to the rest of the system?**
  _58 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._