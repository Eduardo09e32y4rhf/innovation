# Remaining Python Runtime

## Current legacy files

- [`IA/resume_parser.py`](IA/resume_parser.py)
- [`IA/sentiment_analysis.py`](IA/sentiment_analysis.py)
- [`IA/backend/worker.py`](IA/backend/worker.py)

## Start command

Not fully defined in repository. The legacy worker is Celery-based and expects a Python runtime plus Redis.

Suggested local start command:

```bash
python -m celery -A IA.backend.worker.celery_app worker --loglevel=info
```

## Ports and endpoints

- No Python HTTP endpoints are defined in the inspected legacy files.
- `IA/backend/worker.py` uses Redis as Celery broker/backend and exposes a task named `analyze_resume_task`.

## Env vars

- `GEMINI_API_KEY` for Gemini client initialization in [`IA/resume_parser.py`](IA/resume_parser.py) and [`IA/sentiment_analysis.py`](IA/sentiment_analysis.py)
- `REDIS_URL` via [`IA/backend/worker.py`](IA/backend/worker.py) / settings fallback

## Expected payloads

### `analyze_resume_task`

Input:

```json
{
  "resume_text": "string",
  "job_description": "string"
}
```

Output:

```json
{
  "status": "success",
  "message": "...",
  "candidate": {
    "fullName": "string",
    "email": "string",
    "phone": "string",
    "currentRole": "string",
    "professionalSummary": "string",
    "skills": ["string"],
    "experienceYears": 0,
    "education": ["string"]
  }
}
```
# IA Python runtime reference

This document captures the remaining Python runtime surface for the IA module. The TypeScript module in `modules/ia/src` is the preferred integration surface; Python remains only for legacy runtime capabilities that are not yet replaced.

## Runtime entry points

- Main legacy parser: `IA/resume_parser.py`
- Sentiment helper: `IA/sentiment_analysis.py`
- Worker/runtime glue: `IA/backend/worker.py`

## Start command

No dedicated Python service launcher is committed in this module yet. The legacy runtime is invoked from the existing Python environment used by the IA scripts.

If you need to run the legacy worker manually, use the project’s existing Python entrypoint conventions from the repository root and keep the environment variables below available.

## Port

- No stable Python HTTP port is declared in the inspected IA scripts.
- The TypeScript module currently treats Python as an external bridge/provider, not a fixed local API.

## Known endpoints / bridge operations

The TypeScript bridge is defined by the following logical operations in `modules/ia/src/integrations/python-bridge.ts`:

- `parseResume`
- `screenCandidate`
- `analyzeSentiment`
- `log`

These are contract operations; no concrete HTTP route is enforced yet.

## Environment variables

Documented/expected variables from the legacy IA surface:

- `GEMINI_API_KEY` — required by `IA/resume_parser.py`
- Any provider-specific credentials used by `IA/sentiment_analysis.py` and `IA/backend/worker.py`

Do not expose secrets in the frontend. Keep all AI credentials server-side only.

## Input / output payloads

### Resume parsing

Input contract: `modules/ia/src/contracts/resume-contracts.ts`

```json
{
  "fileName": "curriculo.pdf",
  "mimeType": "application/pdf",
  "filePath": "/tmp/curriculo.pdf",
  "contentBase64": "base64-encoded-file",
  "textContent": "optional extracted text",
  "source": "upload"
}
```

Output contract:

```json
{
  "status": "success",
  "message": "",
  "candidate": {
    "fullName": "",
    "email": "",
    "phone": "",
    "currentRole": "",
    "professionalSummary": "",
    "skills": [],
    "experienceYears": 0,
    "education": [],
    "location": "",
    "languages": []
  },
  "rawText": "",
  "provider": "python-gemini"
}
```

### Screening

Input contract: `modules/ia/src/contracts/screening-contracts.ts`

Output contract:

```json
{
  "status": "approved",
  "score": {
    "skillsMatch": 0,
    "experienceMatch": 0,
    "educationMatch": 0,
    "overall": 0
  },
  "reasons": [],
  "recommendations": []
}
```

### Sentiment

Input contract: `modules/ia/src/contracts/sentiment-contracts.ts`

Output contract:

```json
{
  "sentimento": "Neutro",
  "tom": "",
  "engajamento": 0,
  "confidence": 0,
  "status": "ok"
}
```

### Logging

Input contract: `modules/ia/src/contracts/logging-contracts.ts`

Output contract:

```json
{
  "accepted": true,
  "provider": "console",
  "id": "",
  "storedAt": ""
}
```

## Remaining Python gaps

- No committed Python HTTP contract was found for the IA runtime.
- `IA/resume_parser.py` is still a stub and does not send files to Gemini yet.
- `IA/sentiment_analysis.py` and `IA/backend/worker.py` should be treated as legacy until their runtime contract is formalized.

## Integration guidance

- Keep TypeScript orchestration in `modules/ia/src/services/ia-orchestrator.ts`.
- Route bridge calls through `modules/ia/src/integrations/python-bridge.ts`.
- Treat Python as an optional provider until a stable API is committed.
