from fastapi import FastAPI, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
import joblib
import json
from pathlib import Path

from db import SessionLocal, engine
from models import User, History
from models import Base as ModelsBase
from auth import hash_password, verify_password, create_access_token, decode_token

ModelsBase.metadata.create_all(bind=engine)

app = FastAPI(title="SADAR API")

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://sadar-backend.vercel.app",  # domain Vercel kamu (frontend)
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = Path(__file__).parent / "rf_model.joblib"
LE_PATH    = Path(__file__).parent / "label_encoder.joblib"

model = joblib.load(MODEL_PATH)
label_encoder = joblib.load(LE_PATH)

# ---------- DB dependency ----------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------- Auth helpers ----------
def get_current_user(db: Session, authorization: str | None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.replace("Bearer ", "").strip()
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    username = payload["sub"]
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ---------- Schemas ----------
class RegisterReq(BaseModel):
    username: str
    password: str

class LoginReq(BaseModel):
    username: str
    password: str

class PredictReq(BaseModel):
    jenis_kelamin: int      # 0/1
    umur: int
    tingkatan_kelas: int    # 10/11/12
    nilai: float
    q1: int; q2: int; q3: int; q4: int; q5: int; q6: int; q7: int; q8: int; q9: int

# ---------- Routes ----------
@app.post("/register")
def register(req: RegisterReq, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == req.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already used")

    u = User(username=req.username, password_hash=hash_password(req.password))
    db.add(u)
    db.commit()
    return {"message": "registered"}

@app.post("/login")
def login(req: LoginReq, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Wrong username/password")

    token = create_access_token({"sub": user.username})
    return {"access_token": token, "token_type": "bearer"}

@app.post("/predict")
def predict(
    req: PredictReq,
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None)
):
    user = get_current_user(db, authorization)

    X = [[
        req.jenis_kelamin, req.umur, req.tingkatan_kelas, req.nilai,
        req.q1, req.q2, req.q3, req.q4, req.q5, req.q6, req.q7, req.q8, req.q9
    ]]

    proba = model.predict_proba(X)[0]
    idx = int(proba.argmax())
    confidence = float(proba[idx])
    predicted = label_encoder.inverse_transform([idx])[0]

    h = History(
        user_id=user.id,
        input_json=json.dumps(req.model_dump(), ensure_ascii=False),
        predicted_class=predicted,
        confidence=confidence
    )
    db.add(h)
    db.commit()

    return {
        "predicted_class": predicted,
        "confidence": confidence
    }

@app.get("/history")
def history(
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None)
):
    user = get_current_user(db, authorization)

    rows = (
        db.query(History)
        .filter(History.user_id == user.id)
        .order_by(History.created_at.desc())
        .limit(100)
        .all()
    )

    return [{
        "id": r.id,
        "created_at": r.created_at.isoformat(),
        "predicted_class": r.predicted_class,
        "confidence": r.confidence,
        "input": json.loads(r.input_json)
    } for r in rows]

