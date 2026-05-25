# Production RAG System

## Project Definition

This is a domain-specific "Ask My Docs" system with hybrid retrieval (BM25 + vector search), cross-encoder re-ranking, citation enforcement, and a CI-gated evaluation pipeline.

We pick a corpus of documents such as Technical documentation, Research paper, Legal contracts, or Health care document. And we build a system that retrieves the right information, answers and Questions with proper **_citations_**.

## Foundation

### Target Domain/Corpus

Developer Docs + Runbooks”(mix of Markdown + PDFs + a few web pages).

### User Personas

- **Personas**
  - Persona 1: On-call engineer - incident response, needs fast accurate steps + citations
  - Persona 2: Backend dev - API usage, needs precise details and examples
  - Persona 3: New joiner - onboarding, needs explainers + pointers to canonical docs

- **Primary query types**
  - Troubleshooting (highest priority)
  - How-to procedures
  - API/reference lookups
  - Config/examples

### Must refuse (unanswerable) cases

- **No supporting evidence in retrieved context**
  - Example: “What is the timeout for service X?” but no document/chunk mentions the timeout.
- **Insufficient specificity / missing identifiers**
  - Example: “Why is it failing?” without service name, environment, error message, or time window.
- **Out of scope for the corpus**
  - Example: “How do I set up my personal laptop?” if your corpus is only production runbooks.
- **Requires real-time or external system state**
  - Example: “Is the production DB currently down?” (unless you integrate monitoring; RAG alone can’t know).
- **Policy/approval or access requests**
  - Example: “Give me prod credentials” or “Grant me access to X.”
- **Secrets / sensitive data extraction**
  - Example: “What is the API key/password/token?” even if it appears in docs (should be blocked/redacted).
- **Ambiguous/conflicting sources**
  - Example: two runbooks disagree on a command; refuse or ask user to choose the canonical source/version.
- **High-risk actions without sufficient guardrails**
  - Example: “Delete the database” / “Run this irreversible command” — require explicit confirmation or refuse.

### Success criteria (initial targets)

- **Latency (P95 end-to-end)**
  - MVP (no reranker): ≤ 4–6s
  - Production (hybrid + reranker + verifier): ≤ 8–12s
  - Also track stage budgets: retrieval ≤ 500ms, rerank ≤ 1.5s, generation ≤ 6s
- **Cost per query**
  - Target: ≤ $0.01–$0.05 per query (depends on model choice and context length)
  - Hard guardrails:
    - Context tokens sent to LLM: cap (e.g., ≤ 3k–6k tokens)
    - Max chunks to generator: cap (e.g., M ≤ 8–12 after rerank)
    - Cache embeddings + rerank results for repeated queries
- **Faithfulness / groundedness**
  - “Unsupported claim” rate (on golden set): ≤ 2–5%
  - “Citation mismatch” rate (citation does not contain the claim): ≤ 1–2%
  - Unanswerable handling: ≥ 95% of unanswerable questions should refuse (not hallucinate)
- **Retrieval quality (so faithfulness is achievable)**
  - Evidence recall@N: ≥ 90% (gold evidence appears in top-N retrieved candidates, e.g., N=20 before rerank)
  - Post-rerank recall@M: ≥ 85% (gold evidence appears in top-M passed to generator, e.g., M=8–12)
- **Product quality**
  - User satisfaction (manual/heuristic during dev): ≥ 4/5 on a small test set
  - Debuggability: every answer includes citations + query_id + prompt version in logs

## System Architecture

| Concern                 | Tools            |
| ----------------------- | ---------------- |
| Orchestration           | LangChain        |
| Vector DB               | ChromaDB         |
| BM25 Engine             | ElasticSearch    |
| Cross-encoder Re-ranker | Cohere Re-ranker |
| Evaluation Framework    | Ragas            |

### Data Flow

Document -> Parsing -> Chunking -> Embedding -> Storage -> Retrieval -> Re-ranking -> Answer generation -> Citation validation

## Database Design

### Document Schema

| Field Name                     | Data Type | Key / Constraints                                     | Description                                |
| :----------------------------- | :-------- | :---------------------------------------------------- | :----------------------------------------- |
| `doc_id`                       | String    | Primary Key                                           | Stable ID derived from the source.         |
| `title`                        | String    | -                                                     | Human-readable title.                      |
| `source_type`                  | Enum      | `pdf` \| `markdown` \| `html` \| `github` \| `notion` | The format/source of the document.         |
| `source_uri`                   | String    | -                                                     | Canonicalized file path or URL.            |
| `content_hash` / `doc_version` | String    | -                                                     | SHA256 of the extracted + normalized text. |

### Chunk Schema

| Field Name     | Data Type            | Key / Constraints               | Description                                                                                       |
| :------------- | :------------------- | :------------------------------ | :------------------------------------------------------------------------------------------------ |
| `chunk_id`     | String               | Primary Key                     | Stable unique ID for the chunk.                                                                   |
| `doc_id`       | String               | Foreign Key (`Document.doc_id`) | Which document this chunk came from.                                                              |
| `chunk_index`  | Integer              | -                               | Order of the chunk within the document ($0 \dots N-1$).                                           |
| `text`         | String               | -                               | The actual chunk text used for retrieval and context.                                             |
| `text_hash`    | String               | -                               | Hash of text (useful for deduplication and change detection).                                     |
| `doc_version`  | String               | -                               | Inherited from `Document.doc_version`.                                                            |
| `source_uri`   | String               | -                               | Inherited from `Document.source_uri`.                                                             |
| `title`        | String               | -                               | Inherited from `Document.title`.                                                                  |
| `heading_path` | JSON Array (Strings) | -                               | Sequential headings for meaningful citation. <br>_Example:_ `["Payments", "Retries", "Timeouts"]` |
| `page_start`   | Integer              | Nullable                        | Starting page number (null for non-PDFs).                                                         |
| `page_end`     | Integer              | Nullable                        | Ending page number (null for non-PDFs).                                                           |
| `ingested_at`  | DateTime             | -                               | Timestamp of when the chunk was processed.                                                        |
| `metadata`     | JSON                 | -                               | Flexible bucket for extra fields.                                                                 |
