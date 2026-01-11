# Archon AI - Database & Memory Architecture

> A scalable, cost-optimized strategy for persistent user data and long-term memory.

---

## Table of Contents

1. [Data Categories](#data-categories)
2. [Technology Stack](#technology-stack)
3. [User Profile Schema](#user-profile-schema)
4. [Memory Architecture (LangMem)](#memory-architecture-langmem)
5. [Database Schema](#database-schema)
6. [Scaling Tiers](#scaling-tiers)
7. [Cost Optimization](#cost-optimization)
8. [Implementation Phases](#implementation-phases)

---

## Data Categories

| Category | Description | Storage | Retrieval Pattern | Retention |
|----------|-------------|---------|-------------------|-----------|
| **User Profile** | Identity, birth data, preferences | PostgreSQL | Always loaded | Forever |
| **Natal Chart** | Computed planetary positions | PostgreSQL JSONB | Always loaded | Forever (immutable) |
| **Semantic Memory** | Facts about user's life | pgvector | On relevant queries | Forever (consolidated) |
| **Episodic Memory** | Past interaction highlights | pgvector | On memory triggers | 1 year, then archived |
| **Procedural Memory** | Learned user preferences | PostgreSQL JSONB | Prompt optimization | Forever |
| **Conversation Summaries** | Compressed chat history | PostgreSQL | Background reference | 90 days active |
| **Session State** | Active conversation context | Redis/Memory | Every request | Session duration |

---

## Technology Stack

### Production Stack (Recommended)

```
┌─────────────────────────────────────────────────────────────────┐
│                        ARCHON AI STACK                          │
├─────────────────────────────────────────────────────────────────┤
│  Client Layer                                                    │
│  └─ Web App (Next.js/React) or Mobile                           │
├─────────────────────────────────────────────────────────────────┤
│  API Layer                                                       │
│  └─ FastAPI + LangGraph Agent                                    │
│  └─ WebSocket for streaming responses                           │
├─────────────────────────────────────────────────────────────────┤
│  Memory Layer (LangMem)                                          │
│  ├─ Hot Path: Profile updates during conversation               │
│  └─ Background: Memory extraction after conversation ends       │
├─────────────────────────────────────────────────────────────────┤
│  Storage Layer                                                   │
│  ├─ PostgreSQL (Supabase) ─── Profiles, Charts, Summaries       │
│  ├─ pgvector ─────────────── Semantic/Episodic Memory Search    │
│  └─ Redis (optional) ──────── Session cache, rate limiting      │
├─────────────────────────────────────────────────────────────────┤
│  External Services                                               │
│  ├─ LLM: Groq (primary) / OpenAI (fallback)                     │
│  ├─ Embeddings: OpenAI text-embedding-3-small                   │
│  └─ Geocoding: Nominatim / Google Maps API                      │
└─────────────────────────────────────────────────────────────────┘
```

### Why This Stack?

| Component | Choice | Reasoning |
|-----------|--------|-----------|
| **Primary DB** | Supabase (PostgreSQL) | Free tier, built-in auth, pgvector, realtime |
| **Vector Search** | pgvector | No separate vector DB needed until 100k+ users |
| **LLM** | Groq | 10x cheaper than OpenAI, fast inference |
| **Embeddings** | OpenAI text-embedding-3-small | Best price/performance ratio |
| **Session Cache** | Redis Cloud Free | 30MB free, sub-ms latency |

---

## User Profile Schema

### Required Fields (Onboarding)

| Field | Type | Required | Collection Method | Example |
|-------|------|----------|-------------------|---------|
| `name` | string | Yes | Conversational | "I'm Sarah" |
| `gender` | enum | Yes | Conversational | "I'm a woman" / "he/him" |
| `birth_date` | date | Yes | Conversational | "June 15, 1990" |
| `birth_time` | time | Recommended | Conversational | "around 2pm" |
| `birth_city` | string | Yes | Conversational | "New York" |
| `birth_lat/lon` | float | Auto | Geocoding | 40.7128, -74.0060 |
| `birth_timezone` | string | Auto | Timezone lookup | "America/New_York" |

### Optional Fields

| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| `current_city` | string | No | Transit calculations for current location |
| `current_lat/lon` | float | No | Accurate transit house placements |
| `current_timezone` | string | No | Local time for daily forecasts |
| `email` | string | No | Account recovery, notifications |

### Gender Options

```python
class Gender(str, Enum):
    MALE = "male"           # he/him
    FEMALE = "female"       # she/her
    NON_BINARY = "non_binary"  # they/them
    OTHER = "other"         # custom pronouns
    PREFER_NOT_TO_SAY = "prefer_not_to_say"  # they/them default
```

### Onboarding State Machine

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  NEW_USER   │────>│  BASIC_INFO │────>│  BIRTH_DATA │
│             │     │  (name,     │     │  (date,     │
│  No data    │     │   gender)   │     │   location) │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                    ┌─────────────┐             │
                    │  COMPLETE   │<────────────┘
                    │  Chart      │
                    │  computed   │
                    └─────────────┘
                           │
                    ┌─────────────┐
                    │  ENHANCED   │  (optional)
                    │  +birth_time│
                    │  +current   │
                    │   location  │
                    └─────────────┘
```

### Minimum Viable Profile

For natal chart computation, we need at minimum:
- `birth_date` (required)
- `birth_city` → geocoded to lat/lon (required)
- `birth_time` (optional, defaults to 12:00 noon if unknown)

---

## Memory Architecture (LangMem)

### Memory Flow Diagram

```
User Conversation
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│                    HOT PATH (During Chat)                 │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  1. Load user profile (always)                      │ │
│  │  2. Search memories IF query triggers:              │ │
│  │     - "remember", "last time", "you told me"        │ │
│  │     - "my career", "my relationship"                │ │
│  │  3. Update profile IF user shares birth info        │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│              BACKGROUND PATH (After Chat)                 │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  ReflectionExecutor (debounced, 30-60 min delay)    │ │
│  │  ┌─────────────────────────────────────────────────┐│ │
│  │  │  1. Extract semantic memories                   ││ │
│  │  │     "User is a software engineer"               ││ │
│  │  │     "User is considering a career change"       ││ │
│  │  │                                                 ││ │
│  │  │  2. Extract episodic memories                   ││ │
│  │  │     "Discussed Saturn return anxiety on 1/5"    ││ │
│  │  │                                                 ││ │
│  │  │  3. Consolidate & deduplicate                   ││ │
│  │  │     Merge: "works in tech" + "software eng"     ││ │
│  │  │                                                 ││ │
│  │  │  4. Store in pgvector (user-namespaced)         ││ │
│  │  └─────────────────────────────────────────────────┘│ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Memory Namespacing

```python
# Namespace structure for multi-tenant isolation
namespace = ("archon", "{user_id}", "{memory_type}")

# Examples:
("archon", "user_123", "semantic")   # Facts about user
("archon", "user_123", "episodic")   # Past interactions
("archon", "user_123", "procedural") # Preferences
```

### When to Retrieve Memories

| Query Contains | Action | Example |
|----------------|--------|---------|
| "remember", "last time", "before" | Search episodic | "Do you remember what we discussed?" |
| "my career", "my relationship" | Search semantic | "How does Mars affect my career?" |
| "you said", "you told me" | Search episodic | "You told me about a transit" |
| Generic astrology question | No memory fetch | "What does Mercury retrograde mean?" |

### Memory Extraction Triggers

| User Shares | Memory Type | Stored Content |
|-------------|-------------|----------------|
| Career info | Semantic | "User works as a nurse" |
| Relationship status | Semantic | "User recently got engaged" |
| Life event | Episodic | "User is moving to London in March" |
| Preference | Procedural | "User prefers detailed explanations" |
| Emotional state | Episodic | "User expressed anxiety about Saturn return" |

---

## Database Schema

### PostgreSQL Tables (Supabase)

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- USER PROFILES
-- ============================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Identity
    name TEXT,
    gender TEXT CHECK (gender IN ('male', 'female', 'non_binary', 'other', 'prefer_not_to_say')),
    email TEXT,

    -- Birth Data (for natal chart - immutable once set)
    birth_date DATE NOT NULL,
    birth_time TIME,                    -- NULL if unknown
    birth_time_unknown BOOLEAN DEFAULT FALSE,
    birth_city TEXT NOT NULL,
    birth_lat DOUBLE PRECISION NOT NULL,
    birth_lon DOUBLE PRECISION NOT NULL,
    birth_timezone TEXT NOT NULL,

    -- Current Location (optional, for transit calculations)
    current_city TEXT,
    current_lat DOUBLE PRECISION,
    current_lon DOUBLE PRECISION,
    current_timezone TEXT,

    -- Cached Natal Chart (computed once, stored as JSON)
    natal_chart JSONB,
    chart_computed_at TIMESTAMPTZ,

    -- Onboarding State
    onboarding_complete BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)
);

-- ============================================
-- LONG-TERM MEMORIES (LangMem compatible)
-- ============================================
CREATE TABLE memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,

    -- Memory Classification
    namespace TEXT NOT NULL,            -- 'semantic', 'episodic', 'procedural'

    -- Content
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',

    -- Vector Embedding (for semantic search)
    embedding VECTOR(1536),             -- OpenAI text-embedding-3-small

    -- Source Tracking
    source_conversation_id UUID,
    extracted_at TIMESTAMPTZ DEFAULT NOW(),

    -- Usage Tracking (for relevance scoring)
    last_accessed_at TIMESTAMPTZ,
    access_count INT DEFAULT 0,

    -- Lifecycle
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ              -- NULL = never expires
);

-- ============================================
-- CONVERSATION SUMMARIES
-- ============================================
CREATE TABLE conversation_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,

    -- Summary Content
    summary TEXT NOT NULL,
    key_topics TEXT[],
    insights_extracted JSONB DEFAULT '[]',

    -- Conversation Metadata
    message_count INT,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,

    -- Linked Memories (IDs of extracted memories)
    memory_ids UUID[],

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Profile lookups
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_email ON profiles(email);

-- Memory search
CREATE INDEX idx_memories_user_id ON memories(user_id);
CREATE INDEX idx_memories_namespace ON memories(namespace);
CREATE INDEX idx_memories_user_namespace ON memories(user_id, namespace);

-- Vector similarity search (IVFFlat for pgvector)
CREATE INDEX idx_memories_embedding ON memories
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Conversation lookups
CREATE INDEX idx_summaries_user_id ON conversation_summaries(user_id);
CREATE INDEX idx_summaries_started_at ON conversation_summaries(started_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (Supabase)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own memories" ON memories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own summaries" ON conversation_summaries
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Search memories by semantic similarity
CREATE OR REPLACE FUNCTION search_memories(
    p_user_id UUID,
    p_embedding VECTOR(1536),
    p_namespace TEXT DEFAULT NULL,
    p_limit INT DEFAULT 5,
    p_min_similarity FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    namespace TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.content,
        m.namespace,
        m.metadata,
        1 - (m.embedding <=> p_embedding) AS similarity
    FROM memories m
    WHERE m.user_id = p_user_id
        AND (p_namespace IS NULL OR m.namespace = p_namespace)
        AND 1 - (m.embedding <=> p_embedding) >= p_min_similarity
    ORDER BY m.embedding <=> p_embedding
    LIMIT p_limit;
END;
$$;

-- Update last active timestamp
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles SET last_active_at = NOW() WHERE user_id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Scaling Tiers

### Tier 1: MVP / Free ($0/mo)
**Users:** 0-1,000

| Component | Solution | Limit |
|-----------|----------|-------|
| Database | Supabase Free | 500MB PostgreSQL |
| Vector Search | pgvector (included) | ~50k vectors |
| Auth | Supabase Auth | 50k MAU |
| LLM | Groq llama-3.1-8b | $0.05/1M tokens |
| Embeddings | OpenAI | $0.02/1M tokens |
| Hosting | Vercel/Railway Free | Limited |

### Tier 2: Growth ($25-50/mo)
**Users:** 1,000-10,000

| Component | Solution | Cost |
|-----------|----------|------|
| Database | Supabase Pro | $25/mo (8GB) |
| Vector Search | pgvector | Included |
| Auth | Supabase Auth | Included |
| LLM | Groq + Gemini fallback | ~$15-30/mo |
| Cache | Redis Cloud Free | $0 (30MB) |
| Hosting | Railway Starter | $5/mo |

### Tier 3: Scale ($100-300/mo)
**Users:** 10,000-100,000

| Component | Solution | Cost |
|-----------|----------|------|
| Database | Supabase Pro + Replicas | $75/mo |
| Vector Search | Pinecone Starter | $70/mo |
| Auth | Supabase Auth | Included |
| LLM | Groq + OpenAI hybrid | ~$100-150/mo |
| Cache | Redis Cloud Essentials | $15/mo |
| Hosting | Railway Pro | $20/mo |

### Tier 4: Enterprise ($500+/mo)
**Users:** 100,000+

| Component | Solution | Cost |
|-----------|----------|------|
| Database | Dedicated PostgreSQL | $200+/mo |
| Vector Search | Pinecone Standard | $200+/mo |
| Auth | Auth0 / Supabase Enterprise | $100+/mo |
| LLM | Multi-provider w/ load balancing | Variable |
| Cache | Redis Enterprise | $50+/mo |
| Hosting | Kubernetes (GKE/EKS) | Variable |

---

## Cost Optimization

### 1. Memory Retrieval is Selective

```python
# DON'T: Load all memories into every context
context = load_all_memories(user_id)  # Expensive!

# DO: Only fetch when query warrants it
if should_fetch_memories(query):
    memories = search_memories(user_id, query, limit=3)
```

**Impact:** 60-80% reduction in token usage

### 2. Background Memory Extraction

```python
# DON'T: Extract on every message
for message in conversation:
    extract_memories(message)  # Redundant, incomplete context

# DO: Debounce and batch after conversation
executor.submit(
    extract_memories(full_conversation),
    after_seconds=1800  # 30 min delay
)
```

**Impact:** 70% reduction in extraction LLM calls

### 3. Natal Charts are Computed Once

```python
# Birth data NEVER changes
if profile.natal_chart is None:
    chart = compute_natal_chart(profile.birth_data)
    profile.natal_chart = chart  # Cache forever
```

**Impact:** Zero ongoing chart computation cost

### 4. Tiered LLM Usage

```python
# Routine queries → Cheap model
if is_simple_query(query):
    response = groq_llama.invoke(query)  # $0.05/1M tokens

# Complex interpretations → Premium model
else:
    response = openai_gpt4.invoke(query)  # $30/1M tokens
```

**Impact:** 80% cost reduction vs always using GPT-4

### 5. Conversation Summarization

```python
# DON'T: Store full message history
messages_table.insert(all_messages)  # Storage grows unbounded

# DO: Summarize and extract key insights
summary = summarize_conversation(messages)
memories = extract_memories(messages)
store_summary(summary)
delete_raw_messages(conversation_id)
```

**Impact:** 90% reduction in storage costs

---

## Implementation Phases

### Phase 1: Local Development (Current)
- SQLite for profiles
- ChromaDB for vector search
- In-memory session state
- Hardcoded test data

### Phase 2: MVP Launch
- Migrate to Supabase Free
- Enable pgvector
- Implement LangMem background extraction
- Conversational onboarding

### Phase 3: Growth
- Upgrade to Supabase Pro
- Add Redis session cache
- Implement memory consolidation
- Add prompt optimization (procedural memory)

### Phase 4: Scale
- Add read replicas
- Migrate vectors to Pinecone
- Implement sharding by user cohort
- Multi-region deployment

---

## Monitoring & Alerts

### Key Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| P95 Response Latency | < 2s | > 5s |
| Memory Search Latency | < 100ms | > 500ms |
| Token Usage / User / Day | < 5,000 | > 10,000 |
| Database Storage Growth | Linear | > 2x monthly |
| Error Rate | < 0.1% | > 1% |

### Cost Monitoring

```sql
-- Daily LLM cost estimate
SELECT
    DATE(created_at) as date,
    COUNT(*) as conversations,
    SUM(token_count) as total_tokens,
    SUM(token_count) * 0.00005 as estimated_cost_usd
FROM conversation_logs
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## Appendix: Estimated Costs by Scale

| Monthly Users | DB | LLM | Embeddings | Total |
|---------------|----|----|------------|-------|
| 100 | $0 | $1.50 | $0.10 | ~$2 |
| 1,000 | $0 | $15 | $1 | ~$16 |
| 10,000 | $25 | $150 | $10 | ~$185 |
| 50,000 | $75 | $750 | $50 | ~$875 |
| 100,000 | $150 | $1,500 | $100 | ~$1,750 |

*Assumptions: 10 messages/user/day, 500 tokens/message, Groq pricing*
