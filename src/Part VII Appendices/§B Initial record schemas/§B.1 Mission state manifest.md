### §B.1 Mission state manifest

The schemas in this appendix are initial examples of required meanings, not a permanent data model or technology prescription. Maintain at least the following fields at initiation, adapting, dividing, or replacing implementation formats as needed while preserving authoritative meaning and history:

| Field | Required meaning |
| --- | --- |
| `mission_id` | Stable identity of the undertaking |
| `founding_document_digest` | Integrity reference for the canonical original |
| `operating_spec_version` | Version of the effective operating rules |
| `state_version` | Identifiable current state or snapshot |
| `classification_registry` | Effective classification definitions, versions, mappings, and migration records |
| `mission_epoch` | Evidence for `T = 0`, any surrogate timestamp and uncertainty, and conversion references |
| `completion_conditions` | Seven separate assessments with evidence and uncertainty |
| `workstreams` | Active and inactive objectives, owners, dependencies, lifecycle state, and next actions or review conditions |
| `resource_position` | Assets, obligations, spending authority, and runway |
| `capability_register` | Available capabilities, critical gaps, and acquisition plans |
| `authority_register` | Current permissions, limits, and approving functions |
| `request_index` | Prepared, submitted, delivered, pending, answered, expired, and closed requests with dependencies |
| `evidence_index` | Sources, experiments, measurements, reviews, and provenance |
| `decision_index` | Significant decisions and their reasoning |
| `incident_index` | Failures, corrections, and unresolved problems |
| `inactivity_and_wake_state` | Paused scopes, responsible functions, review intervals, installed wake mechanisms, and wake history |
| `recovery_guide` | Instructions for a successor instance |
| `last_reconciliation` | Status and provenance of the most recent consistency check |
