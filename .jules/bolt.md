## 2024-05-24 - [Database N+1 Query Anti-Pattern]
**Learning:** The application codebase has multiple N+1 query patterns when retrieving candidate applications, specifically iterating through `Application` records and querying the `User` model inside loops. SQLAlchemy's `joinedload` can effectively avoid this.
**Action:** Always verify if `joinedload(Application.candidate)` can be used when loading `Application` instances that require candidate details to reduce the number of queries and prevent synchronous blocking.
