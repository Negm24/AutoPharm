# H.A.V.E system-design diagrams

These diagrams describe the revised project idea, not changes already implemented in the existing auth code. The backend and frontend implementation remains preserved while the redesign is discussed.

## Whole-system context

[Edit the context diagram in Lucidchart](https://lucid.app/lucidchart/0cca437e-1e75-4443-9298-a92ffcc4bd01/edit)

![H.A.V.E whole-system context](<H.A.V.E — System Context Diagram(Lucidchart).png>)

Three frontends—H.A.V.E Terminal, H.A.V.E Advisor, and H.A.V.E Hub—connect to one central backend. Payment is digitally mocked; no physical card reader is required. H.A.V.E Operation is deferred.

## Level 1 logical DFD

[Edit the Level 1 logical DFD in Lucidchart](https://lucid.app/lucidchart/228bdf3d-aee5-4e27-a27b-bf46c0623f61/edit)

The DFD covers identity and doctor approval, product discovery, prescriptions, order preparation, payment and dispensing, and receipts/audit/reporting. Repeated actor/service boxes represent the same entity. Lucidchart is the editable source; a local DFD image export is not included yet.

## Earlier implementation diagrams

Existing auth ERDs and backend-architecture documents remain in this repository as implementation references. The new design documents do not delete or replace the working auth subsystem. Differences between the new requirements and existing implementation will be addressed in later increments.
