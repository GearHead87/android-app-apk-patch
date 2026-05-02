# DIMS drug catalog — SQLite schema (`dims_drug_catalog.sqlite`)

This document visualizes the database structure with [Mermaid](https://mermaid.js.org/) diagrams. SQLite does **not** declare `FOREIGN KEY` constraints in this file; relationships below are **logical** (how the app joins data). Some columns use different types for the same concept (e.g. `generic_id` as `INTEGER` vs `TEXT`).

---

## 1. Table inventory

| Table | Role |
|--------|------|
| `t_drug_generic` | Core systemic drug monograph (doses, pregnancy ref, text fields). |
| `t_drug_brand` | Brand lines linked to generic + company. |
| `t_company_name` | Pharmaceutical company directory. |
| `t_pregnancy_category` | Pregnancy category lookup. |
| `t_indication` | Indication lookup. |
| `t_indication_generic_index` | Many-to-many: generic ↔ indication. |
| `t_systemic` | Hierarchical systemic classification (`systemic_parent_id` self-reference). |
| `t_therapitic` | Therapeutic class; points at systemic class via text id. |
| `t_therapitic_generic` | Many-to-many: generic ↔ therapeutic class. |
| `t_herbal_generic` | Herbal monograph. |
| `t_herbal_brand` | Herbal brands. |
| `t_favourite` | User favourites (denormalized snapshot fields). |
| `t_sponsored_brand` | Sponsored brand ↔ generic links. |
| `addvertisement` | Simple ads (`id` autoincrement). |
| `t_addvertisement` | Richer ads with DPI assets + `company_id` / `generic_id`. |
| `district` | Districts. |
| `thana` | Thanas/upazilas; `dist_id` → district. |
| `d_specialty` | Specialty lookup. |
| `occupation` | Occupation lookup. |
| `job_category_type` | Job category lookup. |
| `job` | Job postings; `job_category` → category type. |
| `chamber_info` | Doctor chamber listings. |
| `android_metadata` | Android locale metadata (single row pattern). |
| `sqlite_sequence` | Internal SQLite autoincrement sequence table. |

---

## 2. Core drug & classification (systemic)

```mermaid
erDiagram
    t_drug_generic {
        INTEGER generic_id PK
        TEXT generic_name
        TEXT precaution
        TEXT indication
        TEXT contra_indication
        TEXT side_effect
        INTEGER pregnancy_category_id FK
        TEXT mode_of_action
        TEXT interaction
        TEXT pregnancy_category_note
        TEXT adult_dose
        TEXT child_dose
        TEXT renal_dose
        TEXT administration
    }

    t_pregnancy_category {
        TEXT pregnancy_id PK
        TEXT pregnancy_name
        TEXT pregnancy_description
    }

    t_company_name {
        TEXT company_id PK
        TEXT company_name
        TEXT company_order
    }

    t_drug_brand {
        TEXT brand_id PK
        TEXT generic_id FK
        TEXT company_id FK
        TEXT brand_name
        TEXT form
        TEXT strength
        TEXT price
        TEXT packsize
    }

    t_indication {
        TEXT indication_id PK
        TEXT indication_name
    }

    t_indication_generic_index {
        INTEGER id
        TEXT generic_id FK
        INTEGER indication_id FK
    }

    t_systemic {
        INTEGER systemic_id PK
        TEXT systemic_name
        INTEGER systemic_parent_id FK
    }

    t_therapitic {
        TEXT therapitic_id PK
        TEXT therapitic_name
        TEXT therapitic_systemic_class_id FK
    }

    t_therapitic_generic {
        INTEGER id
        TEXT generic_id FK
        TEXT therapitic_id FK
    }

    t_drug_generic ||--o{ t_drug_brand : "generic_id"
    t_company_name ||--o{ t_drug_brand : "company_id"
    t_pregnancy_category ||--o{ t_drug_generic : "pregnancy_category_id → pregnancy_id"
    t_drug_generic ||--o{ t_indication_generic_index : "generic_id"
    t_indication ||--o{ t_indication_generic_index : "indication_id"
    t_systemic ||--o| t_systemic : "systemic_parent_id"
    t_systemic ||--o{ t_therapitic : "therapitic_systemic_class_id"
    t_drug_generic ||--o{ t_therapitic_generic : "generic_id"
    t_therapitic ||--o{ t_therapitic_generic : "therapitic_id"
```

---

## 3. Herbal products

```mermaid
erDiagram
    t_herbal_generic {
        TEXT generic_id PK
        TEXT generic_name
        TEXT therapeutic_class
        TEXT composition
        TEXT description
        TEXT indication
        TEXT dosage
        TEXT side_effects
        TEXT contraindication
        TEXT precaution
        TEXT pregnancy_lactation
        TEXT mode_of_actions
        TEXT drug_interaction
    }

    t_herbal_brand {
        TEXT brand_id PK
        TEXT brand_name
        TEXT generic_id FK
        TEXT form
        TEXT strength
        TEXT price
        TEXT packsize
        TEXT company_id FK
    }

    t_company_name {
        TEXT company_id PK
        TEXT company_name
        TEXT company_order
    }

    t_herbal_generic ||--o{ t_herbal_brand : "generic_id"
    t_company_name ||--o{ t_herbal_brand : "company_id"
```

---

## 4. Favourites, sponsorship, advertisements

```mermaid
erDiagram
    t_favourite {
        TEXT generic_id
        TEXT generic_name
        TEXT company_name
        TEXT brand_name
        TEXT form
        TEXT strength
        TEXT price
        TEXT packsize
    }

    t_sponsored_brand {
        TEXT brand_id
        TEXT generic_id
    }

    addvertisement {
        INTEGER id PK
        TEXT name
        TEXT image
        TEXT link
        TEXT valid_till
        TEXT updated_at
        TEXT created_at
    }

    t_addvertisement {
        INTEGER ads_id PK
        INTEGER company_id
        INTEGER generic_id
        VARCHAR name
        INTEGER type
        TEXT LDPI
        TEXT MDPI
        TEXT HDPI
        TEXT XHDPI
        TEXT url
    }
```

*Notes:* `t_favourite` stores a flat snapshot (not necessarily FK-linked rows). `t_sponsored_brand` logically references brand/generic ids from the drug tables. `addvertisement` and `t_addvertisement` are two separate ad models.

---

## 5. Geography, jobs, chambers, lookups

```mermaid
erDiagram
    district {
        INTEGER id PK
        TEXT name
    }

    thana {
        INTEGER id PK
        TEXT name
        INTEGER dist_id FK
    }

    job_category_type {
        INTEGER id PK
        TEXT name
    }

    job {
        INTEGER id PK
        TEXT qualification
        TEXT position
        TEXT company
        TEXT job_type
        INTEGER job_category FK
        TEXT salary
        TEXT application_last_date
        TEXT details
        TEXT location
        TEXT experience
        TEXT phone
        TEXT email
        INTEGER vacancy
    }

    chamber_info {
        INTEGER id PK
        TEXT chamber_name
        TEXT address
        TEXT phone
        TEXT time
    }

    d_specialty {
        INTEGER id PK
        TEXT specialty
    }

    occupation {
        INTEGER id PK
        TEXT name
    }

    android_metadata {
        TEXT locale
    }

    district ||--o{ thana : "dist_id"
    job_category_type ||--o{ job : "job_category"
```

---

## 6. High-level map (how domains connect)

```mermaid
flowchart TB
    subgraph Drug["Systemic drugs"]
        DG[t_drug_generic]
        DB[t_drug_brand]
        CN[t_company_name]
        PC[t_pregnancy_category]
        DG --> DB
        CN --> DB
        PC --> DG
    end

    subgraph Classify["Classification"]
        SYS[t_systemic]
        TH[t_therapitic]
        TG[t_therapitic_generic]
        SYS --> SYS
        SYS --> TH
        DG --> TG
        TH --> TG
    end

    subgraph Indication["Indications"]
        IND[t_indication]
        IGI[t_indication_generic_index]
        DG --> IGI
        IND --> IGI
    end

    subgraph Herbal["Herbal"]
        HG[t_herbal_generic]
        HB[t_herbal_brand]
        HG --> HB
        CN -.-> HB
    end

    subgraph Other["App / misc"]
        FAV[t_favourite]
        SB[t_sponsored_brand]
        AD1[addvertisement]
        AD2[t_addvertisement]
        DIS[district]
        THN[thana]
        JB[job]
        JCT[job_category_type]
        CH[chamber_info]
        DIS --> THN
        JCT --> JB
    end
```

Dotted line from `t_company_name` to `t_herbal_brand`: logical link via `company_id`, same as systemic path.

---

## 7. Implementation notes

- **Primary keys:** Only `addvertisement.id`, `chamber_info.id`, and `t_addvertisement.ads_id` are declared `PRIMARY KEY` in SQL. Other tables rely on application-level uniqueness (many ids are `TEXT`).
- **Indexes:** The only explicit index besides PKs is the auto-index on `t_addvertisement` (`ads_id`).
- **ID types:** Junction tables often use `TEXT generic_id` while `t_drug_generic.generic_id` is `INTEGER` — clients may coerce when joining.
- **`sqlite_sequence`:** Used by SQLite for `AUTOINCREMENT` bookkeeping; not application data.
