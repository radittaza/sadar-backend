import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import LabelEncoder
import joblib
from pathlib import Path

DATA_PATH = Path(__file__).parent / "Dataset_Depresi_SMA4.csv"
OUT_MODEL = Path(__file__).parent.parent / "backend" / "rf_model.joblib"
OUT_LE   = Path(__file__).parent.parent / "backend" / "label_encoder.joblib"

def main():
    df = pd.read_csv(DATA_PATH)

    # fitur (tanpa phq_score untuk menghindari leakage)
    feature_cols = [
        "jenis_kelamin", "umur", "tingkatan_kelas", "nilai",
        "q1","q2","q3","q4","q5","q6","q7","q8","q9"
    ]
    X = df[feature_cols].copy()
    y = df["kelas"].copy()

    le = LabelEncoder()
    y_enc = le.fit_transform(y)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_enc, test_size=0.2, random_state=42, stratify=y_enc
    )

    model = RandomForestClassifier(
        n_estimators=400,
        random_state=42,
        class_weight="balanced",
        max_depth=None
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    print("Accuracy:", acc)
    print(classification_report(y_test, preds, target_names=le.classes_))

    joblib.dump(model, OUT_MODEL)
    joblib.dump(le, OUT_LE)
    print(f"Saved model to: {OUT_MODEL}")
    print(f"Saved label encoder to: {OUT_LE}")

if __name__ == "__main__":
    main()