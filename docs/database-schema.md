# Memory Graph Database Schema

This document outlines the database schema required for the Memory Graph Interface. The application expects a SQLite database with the following tables.

## Tables Overview

| Table Name | Description |
|------------|-------------|
| MEMORY_NODES | Stores individual memory nodes with content and domain information |
| MEMORY_EDGES | Defines connections between memory nodes |
| MEMORY_TAGS | Contains tags associated with memory nodes |
| DOMAINS | Lists available memory domains |
| DOMAIN_REFS | Defines cross-domain references between nodes |

## Detailed Schema

### MEMORY_NODES

Stores individual memory nodes.

```sql
CREATE TABLE IF NOT EXISTS MEMORY_NODES (
  id TEXT PRIMARY KEY,
  content TEXT,
  content_summary TEXT,  -- Optional summary of content
  domain TEXT,           -- The domain this node belongs to
  path TEXT,             -- Optional file path reference
  timestamp TEXT         -- Creation timestamp
);
```

### MEMORY_EDGES

Defines connections (edges) between memory nodes.

```sql
CREATE TABLE IF NOT EXISTS MEMORY_EDGES (
  id TEXT PRIMARY KEY,
  source TEXT,           -- Source node ID
  target TEXT,           -- Target node ID
  type TEXT,             -- Relationship type (e.g., "reference", "association")
  strength REAL,         -- Strength of the relationship (0.0 to 1.0)
  timestamp TEXT,        -- Creation timestamp
  domain TEXT,           -- Domain this edge belongs to
  FOREIGN KEY (source) REFERENCES MEMORY_NODES(id),
  FOREIGN KEY (target) REFERENCES MEMORY_NODES(id)
);
```

### MEMORY_TAGS

Contains tags associated with memory nodes.

```sql
CREATE TABLE IF NOT EXISTS MEMORY_TAGS (
  nodeId TEXT,           -- Node ID the tag belongs to
  tag TEXT,              -- Tag content
  PRIMARY KEY (nodeId, tag),
  FOREIGN KEY (nodeId) REFERENCES MEMORY_NODES(id)
);
```

### DOMAINS

Lists available memory domains.

```sql
CREATE TABLE IF NOT EXISTS DOMAINS (
  id TEXT PRIMARY KEY,
  name TEXT,             -- Display name of the domain
  description TEXT,      -- Domain description
  created TEXT,          -- Creation timestamp
  lastAccess TEXT        -- Last access timestamp
);
```

### DOMAIN_REFS

Defines cross-domain references between nodes.

```sql
CREATE TABLE IF NOT EXISTS DOMAIN_REFS (
  nodeId TEXT,           -- Source node ID
  domain TEXT,           -- Source domain
  targetNodeId TEXT,     -- Target node ID
  targetDomain TEXT,     -- Target domain
  description TEXT,      -- Description of the reference
  bidirectional BOOLEAN, -- If true, relationship goes both ways
  PRIMARY KEY (nodeId, targetNodeId),
  FOREIGN KEY (nodeId) REFERENCES MEMORY_NODES(id),
  FOREIGN KEY (targetNodeId) REFERENCES MEMORY_NODES(id)
);
```

## Example Queries

### Creating a new node

```sql
INSERT INTO MEMORY_NODES (id, content, domain, timestamp)
VALUES ('node123', 'This is a memory node', 'general', '2025-05-06T12:00:00Z');
```

### Creating an edge between two nodes

```sql
INSERT INTO MEMORY_EDGES (id, source, target, type, strength, timestamp, domain)
VALUES ('edge123', 'node123', 'node456', 'association', 0.8, '2025-05-06T12:05:00Z', 'general');
```

### Adding a tag to a node

```sql
INSERT INTO MEMORY_TAGS (nodeId, tag)
VALUES ('node123', 'important');
```

### Creating a domain

```sql
INSERT INTO DOMAINS (id, name, description, created, lastAccess)
VALUES ('general', 'General', 'General purpose memory domain', '2025-05-06T12:00:00Z', '2025-05-06T12:00:00Z');
```