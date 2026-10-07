# Route 53 Clone

This is an honest, intentionally limited placement prototype inspired by the AWS Route 53 console. It is **not** a complete AWS replacement and does not implement real DNS, IAM, billing, or cloud integrations.

## Included

- Route 53-style navigation and hosted-zone dashboard
- Mocked demo account (no real authentication or AWS credentials)
- SQLite persistence through a FastAPI API
- Create/list/delete hosted zones
- Select a zone and create/list/delete DNS records
- Common record type selector: A, AAAA, CNAME, TXT, MX, NS, PTR, SRV, CAA
- Seeded demo data

## Run locally

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Python 3.8+ is supported. The dependency pins use Uvicorn 0.33 because it is
compatible with older Python 3.8 package indexes.

### Frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. The SQLite database is created as `backend/route53.db` on first API startup.

## Architecture

The Next.js client calls the FastAPI REST API. FastAPI uses SQLModel with SQLite and deletes records when their parent hosted zone is deleted. The frontend has no AWS dependency and uses a local demo user.
