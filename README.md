# Ask My Docs

> A production-oriented, domain-specific Retrieval-Augmented Generation (RAG) system built with TypeScript.

Ask My Docs is a modular RAG application capable of ingesting PDFs, Markdown files, and technical web documentation, indexing them into a vector database, and answering questions with traceable citations.

Unlike many simple RAG demos, this project is designed with production architecture in mind. It emphasizes document structure preservation, metadata tracking, modular components, and an extensible retrieval pipeline that can evolve into a fully production-ready knowledge system.

---

# Features

## Document Ingestion

- PDF ingestion
- Markdown ingestion
- Technical documentation/web page ingestion
- Unified parsing pipeline
- Automatic metadata extraction

## Document Parsing

Each document is parsed into a structured representation instead of raw text.

The parser preserves:

- document metadata
- sections
- headings
- page numbers (PDFs)
- paragraphs
- content blocks

This enables precise retrieval and future citation support.

---

## Intelligent Chunking

Instead of splitting text arbitrarily, the chunker is document-aware.

Features include:

- configurable chunk size
- configurable overlap
- heading-aware chunk boundaries
- metadata preservation
- overlap without crossing section boundaries
- source-independent chunking

Each chunk contains:

- chunk id
- document id
- heading path
- page number
- source information
- block identifiers
- token count

---

## Embeddings

The application generates vector embeddings for every chunk using Gemini's embedding models.

Features:

- batch embeddings
- pluggable embedding providers
- reusable embedding service
- deterministic chunk ids

---

## Vector Storage

Embeddings are stored inside ChromaDB.

Stored metadata includes:

- document id
- chunk id
- heading path
- page number
- source
- source type
- block ids

---

## Semantic Retrieval

Supports semantic similarity search using vector embeddings.

Pipeline:

User Query

↓

Query Embedding

↓

Vector Search

↓

Top-K Retrieval

↓

Context Assembly

---

## Context Assembly

Retrieved chunks are transformed into a structured prompt context before being passed to the language model.

The context builder:

- preserves source information
- preserves heading hierarchy
- preserves chunk identifiers
- limits context size
- prepares the prompt for the LLM

---

## Answer Generation

The LLM answers questions using **only retrieved context**.

The assistant:

- refuses to answer when context is insufficient
- generates inline citations
- returns structured citation metadata
- never accesses the original documents directly

---

# Example

Question

> Why does the paper argue that AGI existential risk is unrealistic?

Answer

> The paper argues that AGI doomer scenarios rely on three unsupported assumptions, including anthropomorphism and the idea that superior intelligence automatically grants unlimited power. [D1]

Citations

- MythOfAGI.pdf
- Page 2
- Executive Summary

---

# Project Structure

```text
src/
  ├── index.ts
  ├── api/
  │   ├── controllers/
  │   ├── middleware/
  │   └── routes/
  ├── chunking/
  │   ├── chunker.ts
  │   └── tokeniser.ts
  ├── citations/
  ├── config/
  │   ├── constants.ts
  │   └── env.ts
  ├── embeddings/
  │   ├── embedding.service.ts
  │   └── embedder/
  │       └── gemini.embedder.ts
  ├── evaluation/
  ├── ingestion/
  │   ├── ingest.ts
  │   ├── cleaners/
  │   │   └── clean-text.ts
  │   ├── factory/
  │   │   └── parser.factory.ts
  │   └── parsers/
  │       ├── parser.interface.ts
  │       ├── markdown.parser.ts
  │       ├── pdf.parser.ts
  │       └── web.parser.ts
  ├── llm/
  │   ├── answer-generator.ts
  │   └── prompt-builder.ts
  ├── pipelines/
  │   ├── generation.pipeline.ts
  │   └── indexing.pipeline.ts
  ├── retrieval/
  │   └── retrieval.service.ts
  ├── shared/
  │   ├── logger/
  │   │   └── logger.ts
  │   ├── types/
  │   │   ├── chunking.types.ts
  │   │   ├── embedding.types.ts
  │   │   ├── generation.types.ts
  │   │   ├── ingestion.types.ts
  │   │   ├── retrieval.types.ts
  │   │   └── store.types.ts
  │   └── utils/
  │       ├── helper.ts
  │       └── statistics.ts
  └── vector-store/
      └── chroma.store.ts
```

---

# Architecture

```text
                     +----------------+
                     |    Document    |
                     +----------------+
                              |
                              |
                     Parser Factory
                              |
        +---------------------+--------------------+
        |                     |                    |
       PDF               Markdown             Web Docs
        |                     |                    |
        +---------------------+--------------------+
                              |
                     Parsed Document
                              |
                              |
                          Chunker
                              |
                       Metadata Preserved
                              |
                          Embeddings
                              |
                          ChromaDB
                              |
                     Semantic Retrieval
                              |
                     Retrieved Chunks
                              |
                     Context Assembly
                              |
                        Prompt Builder
                              |
                          Gemini LLM
                              |
                  Answer + Structured Citations
```

---

# Technology Stack

| Layer           | Technology             |
| --------------- | ---------------------- |
| Language        | TypeScript             |
| Runtime         | Node.js                |
| LLM             | Gemini                 |
| Embeddings      | text-embedding-3-small |
| Vector Database | ChromaDB               |
| Parsing         | Custom parsers         |
| Tokenization    | tiktoken               |
| Logging         | Pino                   |

---

# Prerequisites

- Node.js >= 20
- pnpm
- Docker (recommended for ChromaDB)
- Gemini API key

---

# Installation

Clone the repository

```bash
git clone <repository-url>
cd ask-my-docs
```

Install dependencies

```bash
pnpm install
```

---

# Environment Variables

Create a `.env` file.

```env
GEMINI_API_KEY=your_api_key
CHROMA_URL=http://localhost:8000
```

---

# Running ChromaDB

Using Docker:

```yaml
services:
  chroma:
    image: chromadb/chroma
    ports:
      - "8000:8000"
    volumes:
      - chroma-data:/chroma/chroma

volumes:
  chroma-data:
```

Run

```bash
docker compose up -d
```

---

# Running the Project

Development

```bash
pnpm dev
```

Build

```bash
pnpm build
```

---

# Ingestion Pipeline

```text
Document

↓

Parser

↓

Parsed Document

↓

Chunker

↓

Embeddings

↓

ChromaDB
```

---

# Retrieval Pipeline

```text
Question

↓

Query Embedding

↓

Vector Search

↓

Top K Chunks

↓

Prompt Builder

↓

Gemini

↓

Answer
```

---

# Current Capabilities

- ✅ PDF ingestion
- ✅ Markdown ingestion
- ✅ Technical web documentation ingestion
- ✅ Structured parsing
- ✅ Intelligent chunking
- ✅ Metadata preservation
- ✅ Gemini embeddings
- ✅ ChromaDB integration
- ✅ Semantic retrieval
- ✅ Context assembly
- ✅ Answer generation
- ✅ Inline citations
- ✅ Structured citation metadata

---

# Design Principles

This project focuses on building production-quality RAG systems.

Core principles include:

- modular architecture
- source-independent ingestion
- document-aware chunking
- deterministic chunk ids
- metadata preservation
- traceable citations
- interchangeable embedding providers
- extensible retrieval pipeline

---

# Roadmap

## Phase 1 — Core RAG (Completed)

- [x] Multi-source document ingestion
- [x] Parser factory
- [x] Intelligent chunking
- [x] Metadata preservation
- [x] Embeddings
- [x] ChromaDB integration
- [x] Semantic retrieval
- [x] Context assembly
- [x] Answer generation
- [x] Structured citations

---

## Phase 2 — Production Retrieval (In Progress)

- [ ] Hybrid Retrieval (BM25 + Vector Search)
- [ ] Reciprocal Rank Fusion (RRF)
- [ ] Cross Encoder Re-ranking
- [ ] Citation enforcement
- [ ] Prompt versioning
- [ ] Configurable retrieval pipeline
- [ ] Multi-document querying

---

## Phase 3 — Evaluation & Quality

- [ ] Golden evaluation dataset
- [ ] RAGAS integration
- [ ] Faithfulness evaluation
- [ ] Context precision evaluation
- [ ] Answer correctness evaluation
- [ ] Automated evaluation scripts
- [ ] CI/CD quality gates

---

## Future Enhancements

- [ ] Weaviate support
- [ ] Local embedding models
- [ ] Streaming responses
- [ ] Incremental indexing
- [ ] OCR support
- [ ] Image extraction
- [ ] Table-aware retrieval
- [ ] Knowledge graph integration
- [ ] Multi-modal RAG
- [ ] User authentication
- [ ] Web UI
- [ ] REST API
- [ ] Dockerized deployment
- [ ] Kubernetes deployment

---

# Why This Project?

Many RAG examples stop after:

```
PDF
↓
Vector Database
↓
LLM
↓
Answer
```

This project aims to demonstrate how production RAG systems are actually built by emphasizing:

- modular architecture
- reusable components
- structured document parsing
- metadata preservation
- retrieval quality
- citation traceability
- production-ready extensibility

The long-term goal is to evolve this project into a complete production-grade document intelligence platform capable of supporting enterprise knowledge bases, technical documentation, research papers, and domain-specific assistants.

---

# License

MIT
