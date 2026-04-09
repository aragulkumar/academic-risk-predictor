# 🎓 Academic Risk Predictor

> **AI-powered early warning system for student academic risk — built with FastAPI, XGBoost, SHAP, React, and Neon PostgreSQL.**

[![CI](https://github.com/aragulkumar/academic-risk-predictor/actions/workflows/ci.yml/badge.svg)](https://github.com/aragulkumar/academic-risk-predictor/actions/workflows/ci.yml)
![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi)
![XGBoost](https://img.shields.io/badge/XGBoost-2.0-orange)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📋 Overview

Educational institutions often fail to identify academically struggling students early enough to intervene. This system solves that with a **closed-loop predict → alert → act → track** workflow:

- **ML Risk Engine** — XGBoost + Random Forest ensemble produces a composite 0–100 risk score per student
- **SHAP Explainability** — Every score includes a human-readable breakdown (e.g., *"Attendance dropped 28%"*)
- **Role-Based Dashboards** — Separate views for Admin, Mentor, and Student
- **Intervention Tracking** — One-click actions with full timestamped history
- **SMS + Email Alerts** — Twilio + SendGrid integration when students cross thresholds

---

## 🏗️ Architecture

```
┌─────────────────────┐     ┌──────────────────────┐     ┌────────────────────┐
│   React Frontend    │────▶│   FastAPI Backend     │────▶│  Neon PostgreSQL   │
│   (Vite + Tailwind) │     │   (JWT Auth + RBAC)   │     │  (Hosted DB)       │
└─────────────────────┘     └──────────────────────┘     └────────────────────┘
                                       │
                         ┌─────────────┴─────────────┐
                         │                           │
                   ┌─────▼──────┐           ┌────────▼───────┐
                   │ ML Engine  │           │  Alert Service │
                   │ XGBoost +  │           │  Twilio +      │
                   │ SHAP       │           │  SendGrid      │
                   └────────────┘           └────────────────┘
```

---

## 🗂️ Project Structure

```
academic-risk-predictor/
├── backend/               # FastAPI Python application
│   ├── app/
│   │   ├── api/           # Route handlers
│   │   ├── core/          # Config, DB, JWT, security
│   │   ├── ml/            # Predictor & SHAP integration
│   │   ├── models/        # SQLAlchemy ORM models
│   │   ├── schemas/       # Pydantic schemas
│   │   └── services/      # Business logic & alerts
│   ├── main.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/              # React + Tailwind CSS
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── context/
│       ├── api/
│       └── hooks/
├── ml/                    # Standalone training scripts
│   ├── train.py
│   ├── data/
│   └── models/
├── docker-compose.yml
└── .github/workflows/ci.yml
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- Docker & Docker Compose (optional)

### 1. Clone & Configure

```bash
git clone https://github.com/aragulkumar/academic-risk-predictor.git
cd academic-risk-predictor
cp backend/.env.example backend/.env
# Fill in your Neon DB URL and API keys
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### 3. Train the ML Model

```bash
cd ml
python train.py
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 5. Docker (Full Stack)

```bash
docker-compose up --build
```

---

## 🔑 Environment Variables

See [`backend/.env.example`](./backend/.env.example) for all required variables.

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `SECRET_KEY` | JWT signing secret |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio sender phone |
| `SENDGRID_API_KEY` | SendGrid API key |
| `ALERT_FROM_EMAIL` | Sender email address |
| `RISK_ALERT_THRESHOLD` | Score threshold (default: 70) |

---

## 👥 Role-Based Access

| Role | Capabilities |
|---|---|
| **Admin** | Manage users, roles, institution data |
| **Mentor** | View student heatmaps, log interventions, receive alerts |
| **Student** | View personal dashboard, goal tracker, trajectory timeline |

---

## 📊 ML Model Details

- **Algorithm**: XGBoost + Random Forest ensemble
- **Features**: Attendance rate, internal marks, assignment submission rate, trend slope
- **Output**: Composite risk score 0–100 + SHAP feature importance
- **Explainability**: Top-3 SHAP factors per student in plain English

---

## 📄 License

MIT © Ragul Kumar