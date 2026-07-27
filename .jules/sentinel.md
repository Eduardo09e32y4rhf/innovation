## 2025-01-20 - Fix Unhandled TypeError in secureEqual during Webhook Token Validation
**Vulnerability:** The `secureEqual` method in `AsaasWebhookController` passes the incoming header value (`received`) directly to `Buffer.from()`. If the header is missing, `received` is undefined, causing `Buffer.from(undefined)` to throw an unhandled `TypeError` (server crash / denial of service).
**Learning:** Functions that wrap crypto operations must always explicitly check types and handle falsy values before type conversion, especially on external user inputs like HTTP headers.
**Prevention:** Always validate that the variable is truthy or a string before converting it to a Buffer for `crypto.timingSafeEqual()`.
