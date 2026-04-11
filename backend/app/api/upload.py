"""
CSV Upload API — Allows mentors to bulk-upload assessment data from Excel/CSV files.
The CSV must have these columns (same data the training model used):
  roll_number, subject, semester, attendance_pct, internal_marks, assignment_submission_rate
  
Optional column:
  external_marks
"""

import io
import asyncio
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db, AsyncSessionLocal
from app.core.security import require_role
from app.models.assessment import Assessment
from app.models.student import Student
from app.services.risk_service import compute_and_save_risk

router = APIRouter(prefix="/api/upload", tags=["csv-upload"])

REQUIRED_COLS = {"roll_number", "subject", "semester", "attendance_pct", "internal_marks", "assignment_submission_rate"}


@router.post("/assessments")
async def upload_assessments_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "mentor")),
) -> dict[str, Any]:
    """
    Upload a CSV or Excel file with assessment data for multiple students at once.

    Required columns: roll_number, subject, semester, attendance_pct,
                      internal_marks, assignment_submission_rate

    Optional column: external_marks

    The system will:
    1. Match each row to a student by roll_number
    2. Save the assessment
    3. Auto-run the ML risk prediction in the background
    """
    # --- Read File -------------------------------------------------------
    content = await file.read()
    filename = file.filename or ""

    try:
        if filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(content))
        elif filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        else:
            raise HTTPException(
                status_code=400,
                detail="Only .csv or .xlsx files are supported."
            )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read file: {e}")

    # Normalize column names (strip spaces, lowercase)
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    # --- Validate Columns ------------------------------------------------
    missing = REQUIRED_COLS - set(df.columns)
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Missing required columns: {sorted(missing)}. "
                   f"Your file has: {list(df.columns)}"
        )

    # --- Process Each Row -----------------------------------------------
    results: list[dict] = []
    errors: list[dict] = []
    student_ids_to_predict: set[int] = set()

    for idx, row in df.iterrows():
        roll = str(row.get("roll_number", "")).strip()
        if not roll:
            errors.append({"row": idx + 2, "error": "Empty roll_number, skipped."})
            continue

        # Find student by roll number
        result = await db.execute(select(Student).where(Student.roll_number == roll))
        student = result.scalar_one_or_none()

        if not student:
            errors.append({"row": idx + 2, "roll_number": roll, "error": "Student not found in system."})
            continue

        # Mentor can only upload for their own students
        if current_user["role"] == "mentor" and student.mentor_id != current_user["id"]:
            errors.append({"row": idx + 2, "roll_number": roll, "error": "Not your assigned student."})
            continue

        try:
            assess = Assessment(
                student_id=student.id,
                subject=str(row.get("subject", "General")).strip(),
                semester=int(row["semester"]),
                attendance_pct=float(row["attendance_pct"]),
                internal_marks=float(row["internal_marks"]),
                assignment_submission_rate=float(row["assignment_submission_rate"]),
                external_marks=float(row["external_marks"]) if "external_marks" in row and pd.notna(row.get("external_marks")) else None,
            )
            db.add(assess)
            await db.flush()
            student_ids_to_predict.add(student.id)
            results.append({
                "row": idx + 2,
                "roll_number": roll,
                "student_id": student.id,
                "subject": assess.subject,
                "status": "saved"
            })
        except Exception as e:
            errors.append({"row": idx + 2, "roll_number": roll, "error": str(e)})

    await db.commit()

    # --- Background ML Predictions for all affected students ------------
    async def _run_all_predictions():
        async with AsyncSessionLocal() as new_db:
            for sid in student_ids_to_predict:
                try:
                    await compute_and_save_risk(sid, new_db)
                except Exception:
                    pass  # Don't crash if ML fails for one student

    asyncio.create_task(_run_all_predictions())

    return {
        "message": f"Processed {len(df)} rows: {len(results)} saved, {len(errors)} failed.",
        "saved": len(results),
        "failed": len(errors),
        "risk_prediction": f"Running in background for {len(student_ids_to_predict)} students",
        "details": results,
        "errors": errors,
    }


@router.get("/template")
async def download_template() -> dict:
    """Returns the expected CSV column format for mentors to use as a template."""
    return {
        "instructions": "Create a CSV or Excel file with these exact column headers:",
        "required_columns": [
            "roll_number       → Student's roll number (e.g. CS2024001)",
            "subject           → Subject name (e.g. Mathematics)",
            "semester          → Semester number 1-8 (e.g. 3)",
            "attendance_pct    → Attendance percentage 0-100 (e.g. 78.5)",
            "internal_marks    → Internal exam marks 0-100 (e.g. 62.0)",
            "assignment_submission_rate → Assignment submission % 0-100 (e.g. 85.0)",
        ],
        "optional_columns": [
            "external_marks    → End-semester marks 0-100 (e.g. 71.0)"
        ],
        "example_row": {
            "roll_number": "CS2024001",
            "subject": "Mathematics",
            "semester": 3,
            "attendance_pct": 78.5,
            "internal_marks": 62.0,
            "assignment_submission_rate": 85.0,
            "external_marks": 71.0
        }
    }
