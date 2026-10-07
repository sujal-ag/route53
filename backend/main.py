from contextlib import asynccontextmanager
from typing import List, Optional
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Field, Session, SQLModel, create_engine, select


engine = create_engine("sqlite:///./route53.db", connect_args={"check_same_thread": False})


class Zone(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    zone_type: str = "Public hosted zone"
    description: str = ""


class Record(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    zone_id: int = Field(index=True)
    name: str
    record_type: str
    value: str
    ttl: int = 300


class ZoneInput(SQLModel):
    name: str
    zone_type: str = "Public hosted zone"
    description: str = ""


class RecordInput(SQLModel):
    name: str
    record_type: str
    value: str
    ttl: int = 300


@asynccontextmanager
async def lifespan(_: FastAPI):
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        if not session.exec(select(Zone)).first():
            zone = Zone(name="example.com", description="Demo hosted zone")
            session.add(zone)
            session.commit()
            session.refresh(zone)
            session.add(Record(zone_id=zone.id, name="example.com", record_type="A", value="192.0.2.1"))
            session.add(Record(zone_id=zone.id, name="www.example.com", record_type="CNAME", value="example.com"))
            session.commit()
    yield


app = FastAPI(title="Route53 Clone API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/login")
def login(email: str = "demo@example.com"):
    return {"token": str(uuid4()), "user": {"email": email, "name": "Demo User"}}


@app.get("/api/zones", response_model=List[Zone])
def list_zones(q: str = ""):
    with Session(engine) as session:
        zones = session.exec(select(Zone)).all()
        return [zone for zone in zones if q.lower() in zone.name.lower()]


@app.post("/api/zones", response_model=Zone, status_code=201)
def create_zone(data: ZoneInput):
    with Session(engine) as session:
        zone = Zone.model_validate(data)
        session.add(zone)
        session.commit()
        session.refresh(zone)
        return zone


@app.delete("/api/zones/{zone_id}", status_code=204)
def delete_zone(zone_id: int):
    with Session(engine) as session:
        zone = session.get(Zone, zone_id)
        if not zone:
            raise HTTPException(404, "Hosted zone not found")
        for record in session.exec(select(Record).where(Record.zone_id == zone_id)):
            session.delete(record)
        session.delete(zone)
        session.commit()


@app.get("/api/zones/{zone_id}/records", response_model=List[Record])
def list_records(zone_id: int, q: str = ""):
    with Session(engine) as session:
        if not session.get(Zone, zone_id):
            raise HTTPException(404, "Hosted zone not found")
        records = session.exec(select(Record).where(Record.zone_id == zone_id)).all()
        return [record for record in records if q.lower() in f"{record.name} {record.record_type} {record.value}".lower()]


@app.post("/api/zones/{zone_id}/records", response_model=Record, status_code=201)
def create_record(zone_id: int, data: RecordInput):
    with Session(engine) as session:
        if not session.get(Zone, zone_id):
            raise HTTPException(404, "Hosted zone not found")
        record = Record(zone_id=zone_id, **data.model_dump())
        session.add(record)
        session.commit()
        session.refresh(record)
        return record


@app.delete("/api/records/{record_id}", status_code=204)
def delete_record(record_id: int):
    with Session(engine) as session:
        record = session.get(Record, record_id)
        if not record:
            raise HTTPException(404, "Record not found")
        session.delete(record)
        session.commit()
