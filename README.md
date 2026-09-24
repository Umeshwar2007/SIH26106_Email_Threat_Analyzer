[README.md](https://github.com/user-attachments/files/32588191/README.md)
<div align="center">

# 🛡️ Skynet

### AI-Powered Email Threat Detection, GeoLocation & Forensic Intelligence Platform

<p>
  <strong>SMART INDIA HACKATHON 2026</strong> · Problem Statement <code>SIH26106</code>
</p>

<p>
  <img src="https://img.shields.io/badge/Theme-Blockchain%20%26%20Cybersecurity-111111?style=for-the-badge">
  <img src="https://img.shields.io/badge/Category-Software-111111?style=for-the-badge">
  <img src="https://img.shields.io/badge/AI-Multimodal-111111?style=for-the-badge">
  <img src="https://img.shields.io/badge/Forensics-Email%20Intelligence-111111?style=for-the-badge">
</p>

<p>
  <a href="https://github.com/Umeshwar2007/SIH26106_Email_Threat_Analyzer">💻 Repository</a>
  ·
  <a href="https://youtu.be/QFZP61jhcGU?si=tsZrauGPPKoz8Bgy">▶️ Demo</a>
</p>

</div>

---

## 🎯 The Product

Email remains a major entry point for phishing, business email compromise (BEC), credential theft and social engineering. Modern attacks can combine convincing text, lookalike domains, malicious links, spoofed authentication and layered relay infrastructure, making simple spam detection insufficient for an investigation.

**Skynet is being built as a unified email threat detection and forensic intelligence platform.** Instead of stopping at *“this email looks suspicious”*, the product is designed to continue into **why it is suspicious, what signals triggered the detection, where the observed infrastructure sits, what domains and URLs are involved, and how the evidence can be investigated and preserved.**

The intended workflow is:

**Detect → Investigate → Correlate → Preserve Evidence**

The current prototype brings the core analyst experience together through an email-analysis frontend and API, while the ML, multimodal, graph and blockchain layers are being developed progressively.

---

## 🚧 Current Prototype Status

> **Current status: Core frontend and API are implemented. ML training is in progress separately. Advanced graph and blockchain layers are planned.**

Skynet has moved beyond the initial UI concept. The **frontend and API are currently functional**, with the application already structured around the main email-ingestion and investigation workflow.

### ✅ Completed / operational

| Component | Status | Progress |
|---|---|---|
| **Frontend** | 🟢 Done | Analyst-facing prototype with Analyze, Results, History and detailed investigation views |
| **Backend API** | 🟢 Done | API layer implemented for the analysis workflow and future model integration |
| **`.eml` ingestion** | 🟢 Done | RFC 822 email input and raw message workflow |
| **Email parsing** | 🟢 Done | Header, envelope and message metadata extraction |
| **SPF / DKIM / DMARC** | 🟢 Done | Authentication and alignment analysis in the forensic workflow |
| **Header / relay analysis** | 🟢 Done | Received-chain reconstruction and infrastructure inspection |
| **IP intelligence** | 🟢 Done | IP, ASN, geolocation and infrastructure-oriented analysis |
| **Domain / URL intelligence** | 🟢 Done | Lookalike/homoglyph and suspicious URL analysis |
| **Risk analysis UI** | 🟢 Done | Threat classification, risk score and detection signals |
| **Forensic investigation UI** | 🟢 Done | Detailed case, infrastructure and authentication views |
| **Analysis history** | 🟢 Done | Case/history interface |
| **ML model** | 🟡 Training | Training separately on the prepared email dataset |
| **Image recognition** | 🟡 In progress | Visual analysis is being developed alongside text detection |
| **Logo identification** | 🟡 In progress | Work is underway for identifying brand/logo impersonation |
| **Multimodal detection** | 🟡 In progress | Text and visual signals will be combined later |
| **Infrastructure graph** | 🟠 Planned | Graph concept and reference design are prepared |
| **GNN campaign correlation** | 🟠 Planned | Future campaign/infrastructure correlation layer |
| **Blockchain evidence layer** | 🟠 Planned | Hyperledger-based evidence anchoring is a future phase |

---

## 🧠 ML Progress

The ML pipeline is currently being trained **separately from the application** so that the model can be evaluated independently before being integrated into the API.

The current training runs have produced an **observed accuracy of approximately 99.9872%** on the present evaluation setup.

> **Note:** 99.9872% is the current experimental result, not a claim of real-world production accuracy. Further leakage checks, deduplication, cross-dataset evaluation, precision/recall/F1 analysis and adversarial testing are required before treating the number as representative of deployment performance.

The ML direction is also expanding beyond text classification:

- **Text analysis** for phishing, spam, BEC and suspicious language
- **Image recognition** for visual phishing content and embedded screenshots
- **Logo identification** for brand impersonation
- **URL/domain signals** as structured detection features
- **Forensic features** from headers and authentication results
- **Multimodal fusion** as the next integration stage

The objective is to expose the trained models through the existing API and return a unified, explainable analysis result to the frontend.

---

## ✨ What Skynet Does

| Capability | What it brings together |
|---|---|
| 🧠 **AI Threat Detection** | NLP-based analysis of suspicious email content and language |
| 👁️ **Visual Intelligence** | Image recognition and planned logo/brand impersonation detection |
| 📩 **Email Forensics** | SPF, DKIM, DMARC and `Received`-chain analysis |
| 🌍 **Origin Intelligence** | IP, ASN, geolocation, DNS and infrastructure information |
| 🔗 **Domain & URL Analysis** | Lookalike domains, homoglyphs, suspicious links and redirects |
| 📊 **Explainable Risk Analysis** | Threat score backed by individual detection signals |
| 🕵️ **Investigation Workspace** | Case results, infrastructure details and forensic context |
| 🔐 **Evidence Integrity** | SHA-256 evidence hashing; blockchain anchoring planned |
| 🕸️ **Infrastructure Graph** | Planned visualization of relationships between IPs, domains and relays |
| 🛡️ **Privacy & Access Control** | PII masking and RBAC are part of the planned architecture |

---

## 🧩 Current System Flow

```text
                         ┌─────────────────────┐
                         │      .EML Input     │
                         └──────────┬──────────┘
                                    │
                                    ▼
                       ┌────────────────────────┐
                       │ Parse & Normalize Email│
                       └────────────┬───────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              ┌───────────┐  ┌────────────┐  ┌──────────────┐
              │ Text / ML │  │ Image /    │  │ Header &     │
              │ Analysis  │  │ Logo Intel │  │ Auth Forensics│
              └─────┬─────┘  └──────┬─────┘  └──────┬───────┘
                    │               │                │
                    └───────────────┼────────────────┘
                                    ▼
                         ┌────────────────────┐
                         │ Threat / Risk      │
                         │ Analysis           │
                         └─────────┬──────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
              IP / Geo         Domain / URL    Investigation
              Intelligence     Intelligence      Context
                    │              │              │
                    └──────────────┼──────────────┘
                                   ▼
                         ┌────────────────────┐
                         │ Analyst Frontend   │
                         │ Results + History  │
                         └─────────┬──────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │ Future: Graph + Blockchain  │
                    └─────────────────────────────┘
```

The architecture remains modular so the core detection-to-investigation workflow can be developed and demonstrated independently while advanced components are integrated later.

---

## 🖥️ Prototype Interface

The current frontend is designed as a focused analyst workspace rather than an overloaded SOC dashboard.

### Analyze

Stage an `.eml` file, inspect the raw message and send it into the forensic analysis pipeline.

### Results

The result view presents:

- Overall threat classification
- Risk score and confidence
- Detection signals
- SPF / DKIM / DMARC results
- Message envelope information
- Domain and homoglyph analysis
- Origin infrastructure
- URL and redirect information
- Evidence hash
- Recommended investigation actions

### Investigation

The detailed investigation view provides:

- Received-header trajectory
- Relay hops
- IP intelligence
- ASN information
- Geolocation
- Threat-intelligence context
- Related case information
- Authentication validation
- Threat-vector correlation

### History

The prototype also provides a case history view for previously analyzed artifacts.

---

## 🕸️ Infrastructure Graph — Future Work

A dedicated **Infrastructure Graph** view has been designed as a reference for a future stage of the product.

The planned graph will connect entities such as:

```text
Email
  │
  ├── Domain
  ├── IP
  │    └── ASN
  │         └── Location
  ├── Relay
  ├── URL
  └── Related Case
```

The reference design focuses on showing observed relationships between infrastructure rather than claiming to identify a human attacker.

Planned graph capabilities include:

- Observed IPs
- Relay infrastructure
- Domains
- ASNs
- Locations
- Threat-intelligence matches
- Related investigations
- Relationship types
- Confidence information

**The interactive graph engine, Neo4j layer and GNN-based campaign correlation are future development work.**

---

## 🧠 Intelligence Layer

Skynet is designed around **explainability rather than a single black-box prediction**.

### Risk scoring

Multiple signals are intended to contribute to an investigation-oriented risk result so an analyst can understand *why* an email was flagged.

### Multimodal analysis

The ML work is being expanded beyond text to include image recognition and logo/brand identification. This is intended to help detect attacks where the visual appearance of an embedded page, screenshot or brand imitation carries much of the deception.

### Future graph intelligence

The planned graph layer will connect senders, domains, IPs, ASNs and cases to support infrastructure and campaign-level correlation.

### Future GNN correlation

Once the graph foundation is implemented, Graph Neural Network approaches can be evaluated for confidence-scored campaign similarity and correlation.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React / Next.js, TypeScript, Tailwind CSS, GSAP |
| **Backend API** | Python, FastAPI |
| **Email Parsing** | Python `email`, MIME / RFC 822 tooling |
| **Authentication** | SPF, DKIM, DMARC analysis |
| **NLP / ML** | Hugging Face Transformers, RoBERTa and related experimentation |
| **Vision** | Image recognition / Vision Transformer direction |
| **Geo / IP Intelligence** | GeoIP, ASN, DNS and reputation sources |
| **Domain Intelligence** | DNS, WHOIS/RDAP and URL analysis |
| **Graph UI** | Planned interactive graph implementation |
| **Graph Intelligence** | Planned Neo4j / GraphSAGE direction |
| **Evidence Layer** | SHA-256 currently; Hyperledger Fabric planned |
| **Deployment** | Docker / Python / web deployment |

The exact production stack may evolve as the prototype moves toward a fully integrated system.

---

## 🔍 Why This Is Different

Most email security workflows stop at detection or require analysts to jump between separate tools for headers, domains, IP intelligence and investigation.

Skynet is being built around a **single detection-to-forensics workflow**:

**Threat detection**  
→ **Visual analysis**  
→ **Header & protocol analysis**  
→ **Geo / IP intelligence**  
→ **Domain & URL intelligence**  
→ **Investigation**  
→ **Future campaign correlation**  
→ **Evidence preservation**

The focus is not simply producing a phishing label. The goal is to provide an investigator with the surrounding technical context needed to understand the message and its observed infrastructure.

---

## 🏗️ Development Roadmap

### Phase 01 — Core Prototype
- [x] Frontend
- [x] Backend API
- [x] `.eml` ingestion
- [x] Email parsing
- [x] Header analysis
- [x] SPF / DKIM / DMARC workflow
- [x] IP / domain intelligence
- [x] Risk/result interface
- [x] Investigation interface
- [x] History interface

### Phase 02 — AI Detection
- [x] Dataset preparation
- [x] Initial model training
- [ ] Robust cross-dataset evaluation
- [ ] API model integration
- [ ] Production inference pipeline

### Phase 03 — Multimodal Intelligence
- [x] Initial image-recognition work
- [🟡] Logo identification
- [🟡] Visual phishing analysis
- [ ] Text + image fusion
- [ ] Unified multimodal scoring

### Phase 04 — Infrastructure Graph
- [x] Graph concept defined
- [x] Reference graph screen/design created
- [ ] Interactive graph implementation
- [ ] Infrastructure relationship model
- [ ] Related-case traversal
- [ ] Campaign correlation

### Phase 05 — Advanced Intelligence
- [ ] Neo4j integration
- [ ] GraphSAGE / GNN experimentation
- [ ] Confidence-scored campaign clustering
- [ ] Cold-start fallback

### Phase 06 — Evidence Layer
- [x] SHA-256 evidence hashing direction
- [ ] Hyperledger Fabric integration
- [ ] Tamper-evident ledger anchoring
- [ ] Chain-of-custody verification

### Phase 07 — Production Hardening
- [ ] RBAC
- [ ] PII masking
- [ ] Audit logging
- [ ] Secure evidence storage
- [ ] Dockerized deployment
- [ ] Performance testing
- [ ] Security testing

---

## 🔒 Security & Privacy

Security is treated as part of the architecture rather than a final UI feature.

The planned system includes:

- 🔐 **RBAC** for controlled analyst access
- 🕶️ **PII masking** before unnecessary exposure
- 🔏 **SHA-256 hashing** for evidence integrity
- ⛓️ **Hyperledger Fabric** for the planned evidence layer
- 🌐 **Self-hostable deployment** for organizations with data-sovereignty requirements
- 📋 **Audit logging** for investigation access and evidence operations

---

## ⚠️ Known Limitations

No email-forensics system can guarantee the identity or physical location of an attacker from email evidence alone.

Skynet accounts for challenges such as:

- VPNs, Tor nodes and cloud relays can obscure originating infrastructure.
- AI-generated phishing can reduce the usefulness of traditional linguistic heuristics.
- Model performance can vary significantly across datasets and real-world traffic.
- High benchmark accuracy does not automatically imply production-level generalization.
- Graph correlation should be expressed through confidence and evidence, not definitive human attribution.
- Threat intelligence data can be incomplete, delayed or inconsistent.

---

## 📚 Research Foundation

The project is based on research across email phishing detection, header analysis, multimodal security, threat intelligence, graph-based correlation and forensic evidence handling.

The research process informs both the current prototype and future architecture, while implementation decisions are being validated experimentally rather than assuming every proposed component belongs in the first release.

---

## 🚀 Project Links

| Resource | Link |
|---|---|
| 💻 GitHub | [SIH 2026 Email Threat Analyzer](https://github.com/Umeshwar2007/SIH26106_Email_Threat_Analyzer) |
| ▶️ Demo | [Watch on YouTube](https://youtu.be/QFZP61jhcGU?si=tsZrauGPPKoz8Bgy) |

---

## 👥 Team Skynet

**Smart India Hackathon 2026 · SIH26106**

Built as a team project around the theme **Blockchain & Cybersecurity**, with the goal of bringing AI-powered email detection, infrastructure intelligence and forensic investigation into one practical analyst workflow.

---

<div align="center">

### 🛡️ Detect smarter. Trace deeper. Preserve the evidence.

**Skynet — Email Threat Detection + Forensic Intelligence**

</div>
