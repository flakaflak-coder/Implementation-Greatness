# Implementation Lead Playbook
## Design Week Sessie Gids

Dit document is de complete gids voor het runnen van Design Week sessies. Of je nu Sophie bent met 40+ implementaties ervaring, of je eerste Design Week runt - deze playbook zorgt ervoor dat je alle kritieke informatie verzamelt.

---

## Overzicht: De 4 Fases

| Fase | Sessies | Focus | Deliverable |
|------|---------|-------|-------------|
| **1. Kickoff** | 1 | Waarom + Wat + Wie | Business case helder |
| **2. Process Design** | 2-3 | Hoe het werkt + Grenzen | Scope definitie compleet |
| **3. Technical** | 2-3 | Systemen + Data + Security | Technische requirements |
| **4. Sign-off** | 1 | Bevestiging + Open items | Go/No-Go beslissing |

---

# Fase 1: Kickoff

## Doel van de Kickoff

**In 60-90 minuten snap je:**
- Waarom de klant dit project doet (business case)
- Wat ze willen bereiken (success metrics)
- Wie de stakeholders zijn en wie beslist
- Hoeveel volume en welke urgentie

**Na de Kickoff kun je:**
- [ ] In 2 zinnen uitleggen wat de DE gaat doen
- [ ] Zeggen wie de decision maker is
- [ ] Benoemen wat "succes" betekent voor deze klant
- [ ] Een inschatting geven van complexiteit (hoog/medium/laag)

---

## Kickoff Agenda (60-90 min)

| Tijd | Onderwerp | Doel |
|------|-----------|------|
| 0-10 min | Introductie | Verwachtingen alignen |
| 10-30 min | Business Context | Waarom + Volume + Kosten |
| 30-50 min | Success Criteria | KPIs + Verwachtingen |
| 50-70 min | Stakeholders & Timeline | Wie doet wat, wanneer |
| 70-90 min | High-level Scope | Eerste grenzen bepalen |

---

## Kickoff Vragenlijst

### 1. Business Context (Het "Waarom")

> **Doel:** Begrijp de motivatie achter het project. Dit bepaalt prioriteiten later.

| # | Vraag | Waarom belangrijk | Verwacht antwoord |
|---|-------|-------------------|-------------------|
| 1.1 | **"Wat is het probleem dat we oplossen? Waarom nu?"** | Urgentie bepaalt scope-flexibiliteit | Concreet pijnpunt + trigger |
| 1.2 | **"Hoeveel [cases/emails/aanvragen] verwerken jullie per dag/maand?"** | Volume bepaalt ROI en complexiteit | Getal + eenheid |
| 1.3 | **"Wat kost het nu per case?"** (tijd + tools + FTE) | Baseline voor ROI berekening | Euro per case of uren per week |
| 1.4 | "Zijn er piekperiodes?" (maandafsluiting, seizoenen) | Capacity planning | Specifieke periodes |
| 1.5 | "Wat gebeurt er als jullie dit niet oplossen?" | Urgentie + risico inschatten | Business impact |

**Pro tip:** Vraag altijd door op getallen. "Ongeveer 500" → "Is dat 400 of 600? Per dag of per week?"

---

### 2. Success Metrics (Het "Wat")

> **Doel:** Definieer meetbare doelen zodat je later kunt aantonen dat de DE werkt.

| # | Vraag | Waarom belangrijk | Verwacht antwoord |
|---|-------|-------------------|-------------------|
| 2.1 | **"Wat betekent succes voor dit project?"** | Alignment op doelen | 2-3 concrete uitkomsten |
| 2.2 | **"Welk percentage wil je automatiseren?"** | Realistische verwachtingen | Percentage (bijv. 60-80%) |
| 2.3 | **"Wat is de target responstijd?"** | SLA bepalen | Tijd (bijv. < 1 uur) |
| 2.4 | **"Welke kwaliteitseis geldt?"** (accuracy, klanttevredenheid) | Quality threshold | Percentage of score |
| 2.5 | "Hoe meten jullie dit nu?" | Baseline bepalen | Huidige metrics |

**Let op:** Als de klant geen specifieke targets heeft, stel dan voor:
- Fase 1: 40% automation rate, < 4 uur responstijd
- Fase 2: 60% automation rate, < 1 uur responstijd

---

### 3. Stakeholders & Beslissers

> **Doel:** Weet wie je nodig hebt voor welke beslissingen.

| # | Vraag | Waarom belangrijk | Verwacht antwoord |
|---|-------|-------------------|-------------------|
| 3.1 | **"Wie is de eigenaar van dit project?"** | Escalatie + go/no-go | Naam + rol |
| 3.2 | **"Wie kent het proces het beste?"** (SME) | Process Design sessies | Naam + beschikbaarheid |
| 3.3 | **"Wie is de technische contactpersoon?"** | Technical sessies | Naam + systeem expertise |
| 3.4 | **"Wie moet tekenen voor go-live?"** | Sign-off planning | Naam + rol |
| 3.5 | "Wie moet erbij zijn bij welke sessie?" | Agenda planning | Namen per sessie type |

**Stakeholder Matrix invullen:**

| Naam | Rol | Betrokken bij | Email | Beslissingsbevoegd? |
|------|-----|---------------|-------|---------------------|
| | | | | Ja / Nee |
| | | | | Ja / Nee |
| | | | | Ja / Nee |

---

### 4. Timeline & Constraints

> **Doel:** Begrijp harde deadlines en beperkingen.

| # | Vraag | Waarom belangrijk | Verwacht antwoord |
|---|-------|-------------------|-------------------|
| 4.1 | **"Is er een harde deadline?"** | Planning bepalen | Datum + reden |
| 4.2 | "Zijn er freeze periodes?" (geen changes rond piek) | Risico's | Specifieke periodes |
| 4.3 | "Wanneer zijn de stakeholders beschikbaar?" | Sessie planning | Beschikbaarheid |
| 4.4 | "Zijn er afhankelijkheden van andere projecten?" | Risico's | Projectnamen + impact |

---

### 5. High-level Scope (Eerste Grenzen)

> **Doel:** Krijg een eerste beeld van wat wel/niet in scope is.

| # | Vraag | Waarom belangrijk | Verwacht antwoord |
|---|-------|-------------------|-------------------|
| 5.1 | **"Wat zijn de belangrijkste case types?"** | Focus bepalen | Lijst met 3-5 types |
| 5.2 | **"Welke cases moeten ALTIJD naar een mens?"** | Eerste guardrails | Concrete scenarios |
| 5.3 | "Welke kanalen zijn relevant?" (email, chat, portal) | Technische scope | Kanaal + volume split |
| 5.4 | "Wat is absoluut NIET in scope voor fase 1?" | Grenzen stellen | Concrete uitsluitingen |

---

## Kickoff Checklist

**Voor je weggaat, heb je:**

- [ ] Business case samengevat in 2 zinnen
- [ ] Volume getal (per dag/week/maand)
- [ ] Kosten per case (huidige situatie)
- [ ] 2-3 meetbare KPIs met targets
- [ ] Stakeholder matrix ingevuld
- [ ] Go-live deadline (of "geen harde deadline")
- [ ] Eerste scope grenzen (wat wel, wat niet)
- [ ] Planning voor Process Design sessies

---

# Fase 2: Process Design

## Doel van Process Design

**In 2-3 sessies begrijp je:**
- Hoe het proces van A tot Z werkt (happy path)
- Welke uitzonderingen er zijn en hoe die worden afgehandeld
- Wat precies wel en niet in scope is
- Wanneer naar een mens wordt geëscaleerd

**Na Process Design kun je:**
- [ ] Het proces tekenen als flowchart
- [ ] Alle case types benoemen met % verdeling
- [ ] De complete scope lijst presenteren (IN/OUT)
- [ ] Elke escalatie trigger benoemen

---

## Process Design Sessie 1: Happy Path

### Agenda (90 min)

| Tijd | Onderwerp | Doel |
|------|-----------|------|
| 0-15 min | Case types inventarisatie | Welke typen, % verdeling |
| 15-45 min | Happy path doorlopen | Stap voor stap |
| 45-75 min | Informatie & documenten | Wat is nodig per stap |
| 75-90 min | Eerste scope items | IN scope vastleggen |

### Vragenlijst: Happy Path

| # | Vraag | Waarom belangrijk | Noteer |
|---|-------|-------------------|--------|
| P1.1 | **"Welke typen [cases/aanvragen] zijn er?"** | Case type lijst | Type + % volume |
| P1.2 | **"Loop me door een standaard case van begin tot eind"** | Happy path steps | Stap 1, 2, 3... |
| P1.3 | "Wat triggert het proces?" (email, formulier, event) | Start conditie | Trigger + bron |
| P1.4 | "Welke informatie is nodig om te starten?" | Intake requirements | Velden + bronnen |
| P1.5 | "Welke documenten/bijlagen zijn betrokken?" | Document types | Type + formaat |
| P1.6 | **"Wat is het eindresultaat van een succesvolle case?"** | Definition of done | Concrete output |
| P1.7 | "Hoe weet de klant dat het is afgerond?" | Communicatie | Bevestiging type |

**Tekenen tijdens de sessie:**

```
[Trigger] → [Stap 1] → [Stap 2] → [Stap 3] → [Einde]
   │           │           │           │
   └─Info?     └─Actie?    └─Check?    └─Output?
```

---

## Process Design Sessie 2: Uitzonderingen & Escalaties

### Agenda (90 min)

| Tijd | Onderwerp | Doel |
|------|-----------|------|
| 0-20 min | "Wat als..." scenarios | Exception cases |
| 20-50 min | Escalatie triggers | Wanneer naar mens |
| 50-70 min | OUT of scope items | Grenzen bepalen |
| 70-90 min | Guardrails | Wat mag NOOIT |

### Vragenlijst: Uitzonderingen

| # | Vraag | Waarom belangrijk | Noteer |
|---|-------|-------------------|--------|
| P2.1 | **"Wat zijn de meest voorkomende uitzonderingen?"** | Exception handling | Scenario + frequentie |
| P2.2 | "Wat als informatie ontbreekt?" | Missing data flow | Actie + template |
| P2.3 | "Wat als het document onleesbaar is?" | Quality issues | Actie + escalatie |
| P2.4 | **"Wanneer MOET dit naar een mens?"** | Escalatie triggers | Concrete condities |
| P2.5 | "Naar wie escaleer je?" | Routing rules | Team/persoon per type |
| P2.6 | "Wat gebeurt er bij een klacht?" | Complaint handling | Apart proces? |

### Vragenlijst: Scope Grenzen

| # | Vraag | Waarom belangrijk | Noteer |
|---|-------|-------------------|--------|
| P2.7 | **"Welke case types handelen jullie NIET af met dit proces?"** | OUT of scope | Concrete types |
| P2.8 | **"Welke acties mag de DE NOOIT doen?"** | Guardrails | NEVER lijst |
| P2.9 | "Zijn er financiële limieten?" | Financial guardrails | Bedragen |
| P2.10 | "Zijn er wettelijke beperkingen?" | Compliance | Regels + wetgeving |

---

## Process Design Sessie 3: Skills & Communicatie

### Agenda (60-90 min)

| Tijd | Onderwerp | Doel |
|------|-----------|------|
| 0-25 min | DE Skills definiëren | Wat moet de DE kunnen |
| 25-50 min | Kennisbronnen | Waar komt de kennis vandaan |
| 50-75 min | Tone of voice | Hoe communiceert de DE |
| 75-90 min | Response templates | Standaard antwoorden |

### Vragenlijst: Skills

| # | Vraag | Waarom belangrijk | Noteer |
|---|-------|-------------------|--------|
| P3.1 | **"Welke acties moet de DE kunnen uitvoeren?"** | Skills lijst | Actie + frequentie |
| P3.2 | "Moet de DE vragen kunnen beantwoorden?" | Q&A skill | Ja/Nee + type vragen |
| P3.3 | "Moet de DE kunnen routeren naar teams?" | Routing skill | Teams + regels |
| P3.4 | "Moet de DE zaken kunnen goedkeuren/afwijzen?" | Decisioning skill | Criteria |
| P3.5 | "Moet de DE ontbrekende info kunnen opvragen?" | Request info skill | Templates |

### Vragenlijst: Kennis & Communicatie

| # | Vraag | Waarom belangrijk | Noteer |
|---|-------|-------------------|--------|
| P3.6 | **"Waar staat de kennis die de DE nodig heeft?"** | Knowledge sources | Systeem + locatie |
| P3.7 | "Zijn er bestaande FAQ's of kennisbanken?" | Existing content | URL/locatie |
| P3.8 | **"Wat is de gewenste tone of voice?"** | Brand voice | Formeel/informeel |
| P3.9 | "In welke talen moet de DE communiceren?" | Language support | Talen + prioriteit |
| P3.10 | "Zijn er bestaande templates die we moeten volgen?" | Template compliance | Voorbeelden |

---

## Process Design Checklist

**Na alle Process Design sessies heb je:**

- [ ] Case type lijst met % verdeling
- [ ] Happy path: alle stappen gedocumenteerd
- [ ] Minimaal 5 exception scenarios
- [ ] Escalatie triggers met routing regels
- [ ] Complete IN SCOPE lijst
- [ ] Complete OUT OF SCOPE lijst
- [ ] Guardrails: NEVER en ALWAYS regels
- [ ] Skills lijst met kennisbronnen
- [ ] Tone of voice gedefinieerd
- [ ] Response templates (of bronnen)

---

# Fase 3: Technical Deep-dive

## Doel van Technical

**In 2-3 sessies begrijp je:**
- Welke systemen betrokken zijn
- Welke data nodig is en waar die vandaan komt
- Hoe we koppelen (API, database, portal)
- Security en compliance requirements

**Na Technical kun je:**
- [ ] Alle systemen tekenen in een integratie diagram
- [ ] Per systeem zeggen: lezen, schrijven, of beide
- [ ] De technische contactpersoon per systeem benoemen
- [ ] Security requirements opsommen

---

## Technical Sessie 1: Systemen Inventarisatie

### Agenda (90 min)

| Tijd | Onderwerp | Doel |
|------|-----------|------|
| 0-30 min | Systemen landscape | Welke systemen |
| 30-60 min | Data flows | Wat gaat waar heen |
| 60-90 min | Per systeem details | Access type + contacten |

### Vragenlijst: Systemen

| # | Vraag | Waarom belangrijk | Noteer |
|---|-------|-------------------|--------|
| T1.1 | **"Welke systemen raakt dit proces?"** | Integration landscape | Systeem + functie |
| T1.2 | **"Per systeem: moet de DE lezen, schrijven, of beide?"** | Access type | R/W/RW per systeem |
| T1.3 | "Waar komt de input vandaan?" (email, portal, API) | Inbound channels | Kanaal + format |
| T1.4 | "Waar moet de output naartoe?" | Outbound targets | Systeem + format |
| T1.5 | "Is er een master data systeem?" | Source of truth | Systeem + data types |

### Vragenlijst: Per Systeem

| # | Vraag | Waarom belangrijk | Noteer |
|---|-------|-------------------|--------|
| T1.6 | **"Wie is de technische contactpersoon voor [systeem]?"** | Integratie eigenaar | Naam + email |
| T1.7 | "Is er een API beschikbaar?" | Integratie methode | Ja/Nee + docs |
| T1.8 | "Welke authenticatie is nodig?" | Security | OAuth/API key/etc |
| T1.9 | "Zijn er rate limits of quota's?" | Technical constraints | Limieten |

**Systeem Matrix invullen:**

| Systeem | Functie | Access | API? | Contact | Docs |
|---------|---------|--------|------|---------|------|
| | | R/W/RW | Ja/Nee | | URL |
| | | R/W/RW | Ja/Nee | | URL |

---

## Technical Sessie 2: Data & Velden

### Agenda (90 min)

| Tijd | Onderwerp | Doel |
|------|-----------|------|
| 0-30 min | Input data velden | Welke velden nodig |
| 30-60 min | Output/update velden | Wat schrijven we |
| 60-90 min | Data mapping | Bron → Doel mapping |

### Vragenlijst: Data Velden

| # | Vraag | Waarom belangrijk | Noteer |
|---|-------|-------------------|--------|
| T2.1 | **"Welke velden heeft de DE nodig om te lezen?"** | Input fields | Veld + systeem + format |
| T2.2 | **"Welke velden moet de DE kunnen updaten/aanmaken?"** | Output fields | Veld + systeem + format |
| T2.3 | "Zijn er verplichte velden?" | Validation rules | Veld + conditie |
| T2.4 | "Welke velden zijn gevoelig?" (PII, financieel) | Data sensitivity | Veld + classificatie |
| T2.5 | "Zijn er veldnaam conventies?" | Naming standards | Prefix/format |

---

## Technical Sessie 3: Security & Compliance

### Agenda (60-90 min)

| Tijd | Onderwerp | Doel |
|------|-----------|------|
| 0-30 min | Security requirements | Wat is verplicht |
| 30-60 min | Compliance & wetgeving | AVG/GDPR, audit trails |
| 60-90 min | Error handling | Wat als het misgaat |

### Vragenlijst: Security

| # | Vraag | Waarom belangrijk | Noteer |
|---|-------|-------------------|--------|
| T3.1 | **"Welke security requirements gelden?"** | Security compliance | Requirements lijst |
| T3.2 | "Is MFA/SSO verplicht?" | Authentication | Methode |
| T3.3 | "Welke data mag niet buiten jullie omgeving?" | Data residency | Restricties |
| T3.4 | "Zijn er logging/audit requirements?" | Audit trail | Wat loggen |
| T3.5 | **"Welke compliance frameworks gelden?"** (AVG, SOC2, ISO) | Compliance | Frameworks |

### Vragenlijst: Error Handling

| # | Vraag | Waarom belangrijk | Noteer |
|---|-------|-------------------|--------|
| T3.6 | "Wat moet er gebeuren als een systeem niet bereikbaar is?" | Failover | Actie + melding |
| T3.7 | "Hoe lang mogen retries duren?" | Timeout handling | Tijd + max attempts |
| T3.8 | "Wie moet worden gealarmeerd bij fouten?" | Alerting | Contact + methode |

---

## Technical Checklist

**Na alle Technical sessies heb je:**

- [ ] Systeem integratie diagram
- [ ] Per systeem: R/W/RW + API info + contact
- [ ] Input velden lijst met bronnen
- [ ] Output velden lijst met targets
- [ ] Data mapping (bron → doel)
- [ ] Security requirements gedocumenteerd
- [ ] Compliance frameworks geïdentificeerd
- [ ] Error handling strategie
- [ ] Alle technische contacten + emails

---

# Fase 4: Sign-off

## Doel van Sign-off

**In 1 sessie bevestig je:**
- De complete scope is correct
- Alle open items zijn opgelost
- De stakeholders accorderen de aanpak
- Go/No-Go beslissing wordt genomen

**Na Sign-off heb je:**
- [ ] Getekende scope (digitaal akkoord)
- [ ] Alle open items gesloten of geaccepteerd als risico
- [ ] Go-live planning bevestigd
- [ ] Volgende stappen afgesproken

---

## Sign-off Agenda (60-90 min)

| Tijd | Onderwerp | Doel |
|------|-----------|------|
| 0-15 min | Samenvatting project | Alignment check |
| 15-35 min | Scope review | IN/OUT bevestigen |
| 35-50 min | Open items | Oplossen of accepteren |
| 50-70 min | Risico's & mitigatie | Transparantie |
| 70-90 min | Go/No-Go + planning | Beslissing + next steps |

---

## Sign-off Vragenlijst

### Scope Bevestiging

| # | Vraag | Waarom belangrijk | Noteer |
|---|-------|-------------------|--------|
| S1 | **"Klopt deze IN SCOPE lijst?"** | Scope validatie | Akkoord / Wijzigingen |
| S2 | **"Klopt deze OUT OF SCOPE lijst?"** | Grenzen validatie | Akkoord / Wijzigingen |
| S3 | "Zijn er items toegevoegd sinds de laatste sessie?" | Scope creep check | Nieuwe items |
| S4 | "Zijn alle stakeholders het eens met deze scope?" | Alignment | Ja/Nee + wie niet |

### Open Items

| # | Vraag | Waarom belangrijk | Noteer |
|---|-------|-------------------|--------|
| S5 | **"Zijn er nog onopgeloste vragen of onduidelijkheden?"** | Open items | Lijst + eigenaar |
| S6 | "Welke items kunnen we accepteren als 'na go-live'?" | Fase 2 backlog | Items + prioriteit |
| S7 | "Welke items blokkeren go-live?" | Blokkers | Items + oplossing |

### Go/No-Go

| # | Vraag | Waarom belangrijk | Noteer |
|---|-------|-------------------|--------|
| S8 | **"Geven jullie akkoord om door te gaan naar build?"** | Go/No-Go | Ja/Nee |
| S9 | "Wie tekent namens de klant?" | Formele accordering | Naam + rol |
| S10 | "Wat is de geplande go-live datum?" | Planning | Datum |
| S11 | "Wie zijn de contactpersonen tijdens build?" | Communicatie | Namen + rollen |

---

## Sign-off Checklist

**Na Sign-off heb je:**

- [ ] Scope akkoord (schriftelijk/email bevestiging)
- [ ] Open items lijst (opgelost of gepland)
- [ ] Go/No-Go beslissing genoteerd
- [ ] Naam van wie heeft getekend
- [ ] Go-live datum bevestigd
- [ ] Contactpersonen voor build fase
- [ ] Volgende stappen afgesproken

---

# Appendix: Quick Reference Cards

## Per Sessie: Kritieke Vragen

### Kickoff (moet je altijd vragen)
1. "Wat is het probleem dat we oplossen?"
2. "Hoeveel cases per dag/maand?"
3. "Wat betekent succes?"
4. "Wie is de decision maker?"

### Process Design (moet je altijd vragen)
1. "Loop me door een standaard case"
2. "Wanneer MOET dit naar een mens?"
3. "Wat mag de DE NOOIT doen?"
4. "Welke case types zijn OUT of scope?"

### Technical (moet je altijd vragen)
1. "Welke systemen raakt dit?"
2. "Lezen, schrijven, of beide?"
3. "Wie is de technische contact?"
4. "Welke security requirements gelden?"

### Sign-off (moet je altijd vragen)
1. "Klopt deze scope?"
2. "Zijn er nog open items?"
3. "Wie tekent?"
4. "Go of No-Go?"

---

## Extraction Type → Vraag Mapping

| Als je dit wilt extraheren | Stel deze vraag |
|---------------------------|-----------------|
| STAKEHOLDER | "Wie is betrokken bij dit proces?" |
| GOAL | "Wat is het probleem dat we oplossen?" |
| KPI_TARGET | "Wat betekent succes? Welk percentage/tijd?" |
| VOLUME_EXPECTATION | "Hoeveel cases per dag/maand?" |
| CHANNEL | "Via welke kanalen komen cases binnen?" |
| HAPPY_PATH_STEP | "Loop me door een standaard case" |
| EXCEPTION_CASE | "Wat als [iets] misgaat?" |
| ESCALATION_TRIGGER | "Wanneer MOET dit naar een mens?" |
| SCOPE_IN | "Wat doet de DE wel?" |
| SCOPE_OUT | "Wat doet de DE niet?" |
| GUARDRAIL_NEVER | "Wat mag de DE NOOIT doen?" |
| GUARDRAIL_ALWAYS | "Wat moet de DE ALTIJD doen?" |
| SKILL_* | "Welke acties moet de DE kunnen uitvoeren?" |
| SYSTEM_INTEGRATION | "Welke systemen raakt dit?" |
| SECURITY_REQUIREMENT | "Welke security requirements gelden?" |

---

## Red Flags: Wanneer doorvragen

| Je hoort... | Vraag door met... |
|-------------|-------------------|
| "Meestal..." | "En wat als het niet 'meestal' is?" |
| "Dat hangt ervan af" | "Waarvan precies? Geef een voorbeeld" |
| "Dat weten we nog niet" | "Wie weet dit wel? Wanneer weten we dit?" |
| "Dat is een edge case" | "Hoe vaak komt dit voor? 1%? 10%?" |
| "Dat doen we handmatig" | "Hoeveel tijd kost dat? Wie doet dit?" |
| "Eigenlijk altijd" | "Zijn er uitzonderingen? Wanneer niet?" |
| "Ongeveer/Ongeveer" | "Kunnen we dat preciezer maken?" |

---

## Na Elke Sessie: 5-Minuten Wrap-up

Direct na elke sessie, noteer:

1. **3 belangrijkste inzichten** uit deze sessie
2. **Open vragen** voor volgende sessie
3. **Risico's of concerns** die je zag
4. **Scope wijzigingen** ten opzichte van vorige sessie
5. **Actie items** (wie doet wat voor wanneer)

---

*Versie 1.0 - Januari 2026*
*Gebaseerd op 40+ implementaties door het Freeday team*
