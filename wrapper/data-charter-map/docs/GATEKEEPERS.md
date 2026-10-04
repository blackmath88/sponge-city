# The data question: access, gatekeepers and true unknowns

## Why this matters

For a sponge-city decision tool, **"Do we have the data?" is not a binary question.**

A more useful sequence is:

1. **Does the information exist?**
2. **Who holds or controls it?**
3. **Under what conditions can it be accessed?**
4. **What decision becomes possible when it is unlocked?**
5. **If it does not exist, what must be measured, inspected or tested on site?**

This distinction matters because a value can be unknown to the prototype without being unknown to the city, and a value can be unavailable publicly without being unmeasured.

> **Unknown to us ≠ unknown to the city ≠ not measured anywhere.**

The product should expose those differences instead of collapsing them into a generic "missing data" label.

## Evidence-access states

Use the following access states alongside the existing evidence classes.

| Access state | Meaning | Typical gatekeeper |
| --- | --- | --- |
| **Open** | Directly available and reusable from an official or public source. | Open-data portal / canton / federal source |
| **Registered** | Available through a login or bounded self-service request. | Public authority / planning portal |
| **Restricted** | Exists, but is released only for a legitimate area, project or purpose. | Cadastral or technical authority |
| **Operator-held** | The infrastructure operator holds the authoritative detail. | IWB or another network operator |
| **Project-held** | Information exists within a private project, property or professional workflow. | Owner / planner / engineer / consultant |
| **Site check required** | A decision-quality value must be inspected, sampled, surveyed or tested locally. | Qualified specialist / field team |
| **Unknown** | We do not yet know whether usable evidence exists or who owns it. | To be investigated |

These states describe **access**, not confidence or evidence quality. A registered dataset can still be modelled or stale; an open dataset can still be too coarse for a site decision.

## Gatekeeper is a first-class field

For every decision-relevant field, the Evidence Passport should be able to carry:

```text
question
data_exists
access_state
gatekeeper
authoritative_source
what_we_know
what_remains_hidden
unlock_action
decision_blocked
evidence_class
limitations
```

Example:

```yaml
question: Is there a utility conflict under the proposed rain-garden footprint?
data_exists: yes
access_state: restricted
gatekeeper:
  - Basel-Stadt cadastral authority
  - relevant network operator
what_we_know:
  - network type and approximate location may be available
what_remains_hidden:
  - burial depth
  - exact clearance
  - operator confirmation
unlock_action:
  - obtain an area-limited planning extract
  - confirm with operator before excavation
decision_blocked: Can we excavate here?
```

The hackathon does not need to implement this as a final schema immediately. It is the content model the interface should grow toward.

## Basel examples

### Utility conflicts

- **Information exists:** yes.
- **Access:** restricted / operator-held.
- **Gatekeeper:** cadastral authority plus the relevant network operator.
- **Publicly visible context:** enough for screening, not excavation clearance.
- **Typical unresolved facts:** depth, protection distances, exact current routing.
- **Decision unlocked:** whether a proposed footprint can proceed to detailed design.

### Drainage destination and sewer context

- **Information exists:** operationally, at least in part.
- **Access:** mediated / restricted.
- **Gatekeeper:** Tiefbauamt drainage / GEP owners and, for private drainage, property-side records.
- **Publicly visible context:** general sewer and drainage system context.
- **Typical unresolved facts:** exact connected surface, inlet/catchment relation, hydraulic or project-specific capacity.
- **Decision unlocked:** where retained or overflow water can safely go.

### Infiltration feasibility

- **Information exists:** partly.
- **Access:** mixed.
- **Gatekeeper:** public environmental authorities for context; qualified site investigation for the decisive local value.
- **Publicly visible context:** groundwater, boreholes, protection areas, contamination screening, published infiltration context.
- **Typical unresolved facts:** actual local soil permeability, pavement build-up, exact groundwater clearance.
- **Decision unlocked:** whether infiltration is a credible intervention mechanism at this footprint.

### Performance after construction

- **Information may exist:** pilot or research monitoring may produce it.
- **Access:** project-held or partnership-dependent unless published.
- **Gatekeeper:** project owner / research partner / monitoring operator.
- **Typical unresolved facts:** quality-controlled retention, cooling or tree-performance measurements at the required spatial and temporal scale.
- **Decision unlocked:** whether a design performs as expected after implementation.

## The four questions the interface should answer

### 1. What do we know?

Open datasets, observations, official models, verified imagery and other evidence available now.

### 2. What exists but is gated?

Information that is likely or known to exist but requires registration, a planning request, operator contact or project authorization.

### 3. Who can unlock it?

The named **gatekeeper** and the action required to gain access.

### 4. What genuinely does not exist yet?

Evidence that must be produced through a survey, inspection, infiltration test, soil sample, monitoring campaign or other site-specific work.

## Product language

Avoid using **missing** for every unavailable value.

Prefer language that preserves the reason:

- **Open**
- **Gated**
- **Site check required**
- **Unknown**

Where useful, the detailed access state can refine **Gated** into registered, restricted, operator-held or project-held.

Example user-facing statement:

> This location looks promising from public evidence. Before recommending infiltration, two decisive facts must be unlocked: utility clearance from the infrastructure gatekeeper and local permeability from a site test.

That is a more useful planning state than either "suitable" or "data missing".

## Visual model

```text
                 THE DATA QUESTION

        ┌────────────────────────────┐
        │      OPEN / AVAILABLE      │
        │ maps · sensors · OGD       │
        └─────────────┬──────────────┘
                      │
                      ▼
        ┌────────────────────────────┐
        │    EXISTS, BUT GATED       │
        │ utilities · sewer · GEP    │
        └─────────────┬──────────────┘
                      │
              WHO IS THE GATEKEEPER?
                      │
          ┌───────────┼────────────┐
          ▼           ▼            ▼
       Authority    Operator    Property /
                               Professional
          │
          ▼
        ┌────────────────────────────┐
        │      SITE KNOWLEDGE        │
        │ test · inspect · measure   │
        └─────────────┬──────────────┘
                      │
                      ▼
                 DECISION READY?
```

## Content / UI TODO

This should become a visible part of the wrapper rather than remain documentation only.

A future **Evidence Passport** or **Data Question** panel for the selected street/candidate should show:

- evidence status;
- access status;
- gatekeeper;
- what is known now;
- what remains unavailable;
- the action needed to unlock it;
- which decision is blocked until then.

The key product proposition is not that SpongeSquad magically fills every data gap. It helps a user understand **which evidence is sufficient for screening, which evidence is gated, who controls it, and what still has to be learned on site before a real intervention decision can be made.**
