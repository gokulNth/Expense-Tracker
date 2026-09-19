from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from pathlib import Path
from datetime import datetime
from typing import Optional
import sqlite3
import csv
import os


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = BASE_DIR / "expenses.db"

DATA_DIR.mkdir(parents=True, exist_ok=True)


app = FastAPI(
    title="AI Expense Tracker API",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict this in production
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# DATABASE
# ============================================================

def get_db():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():

    connection = get_db()

    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS monthly_income (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            year INTEGER NOT NULL,
            month INTEGER NOT NULL,
            amount REAL NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(year, month)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            expense_date TEXT NOT NULL,
            amount REAL NOT NULL,
            description TEXT NOT NULL,
            category TEXT NOT NULL,
            cash_purpose TEXT DEFAULT '',
            created_at TEXT NOT NULL
        )
    """)

    connection.commit()
    connection.close()


initialize_database()


# ============================================================
# MODELS
# ============================================================

class IncomeRequest(BaseModel):
    amount: float = Field(gt=0)


class ExpenseRequest(BaseModel):
    amount: float = Field(gt=0)
    description: str = Field(min_length=1)
    category: str = "Other"
    cash_purpose: str = ""


# ============================================================
# DATE HELPERS
# ============================================================

def current_year_month():

    now = datetime.now()

    return now.year, now.month


def month_file_name(year: int, month: int):

    date = datetime(year, month, 1)

    return f"{date.year}{date.strftime('%b')}.csv"


def month_file_path(year: int, month: int):

    return DATA_DIR / month_file_name(year, month)


# ============================================================
# CSV SYNC
# ============================================================

def sync_month_csv(year: int, month: int):

    file_path = month_file_path(year, month)

    connection = get_db()
    cursor = connection.cursor()

    # Get income
    cursor.execute("""
        SELECT amount
        FROM monthly_income
        WHERE year = ?
        AND month = ?
    """, (year, month))

    income = cursor.fetchone()

    # Get expenses
    cursor.execute("""
        SELECT
            expense_date,
            amount,
            description,
            category,
            cash_purpose
        FROM expenses
        WHERE substr(expense_date, 1, 4) = ?
        AND substr(expense_date, 6, 2) = ?
        ORDER BY expense_date ASC, id ASC
    """, (
        str(year),
        f"{month:02d}"
    ))

    expenses = cursor.fetchall()

    connection.close()

    with open(
        file_path,
        "w",
        newline="",
        encoding="utf-8"
    ) as file:

        writer = csv.writer(file)

        writer.writerow([
            "Date",
            "Mode",
            "Amt",
            "reason"
        ])

        # Income row
        if income:

            writer.writerow([
                f"01-{month:02d}-{year}",
                "Income",
                income["amount"],
                "Monthly Income"
            ])

        # Expense rows
        for expense in expenses:

            reason = expense["description"]

            if expense["category"]:
                reason += f" [{expense['category']}]"

            if expense["cash_purpose"]:
                reason += f" - Cash: {expense['cash_purpose']}"

            date_obj = datetime.fromisoformat(
                expense["expense_date"]
            )

            writer.writerow([
                date_obj.strftime("%d-%m-%Y"),
                "Spent",
                expense["amount"],
                reason
            ])

    return file_path


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/")
def health_check():

    return {
        "status": "ok",
        "service": "AI Expense Tracker API"
    }


# ============================================================
# SET / UPDATE MONTHLY INCOME
# ============================================================

@app.post("/api/income")
def set_monthly_income(request: IncomeRequest):

    year, month = current_year_month()

    now = datetime.now().isoformat()

    connection = get_db()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO monthly_income
        (
            year,
            month,
            amount,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?)

        ON CONFLICT(year, month)
        DO UPDATE SET
            amount = excluded.amount,
            updated_at = excluded.updated_at
    """, (
        year,
        month,
        request.amount,
        now,
        now
    ))

    connection.commit()
    connection.close()

    sync_month_csv(year, month)

    return {
        "success": True,
        "year": year,
        "month": month,
        "amount": request.amount
    }


# ============================================================
# GET MONTHLY INCOME
# ============================================================

@app.get("/api/income")
def get_monthly_income():

    year, month = current_year_month()

    connection = get_db()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT amount
        FROM monthly_income
        WHERE year = ?
        AND month = ?
    """, (year, month))

    row = cursor.fetchone()

    connection.close()

    return {
        "year": year,
        "month": month,
        "amount": row["amount"] if row else 0
    }


# ============================================================
# ADD EXPENSE
# ============================================================

@app.post("/api/expenses")
def add_expense(request: ExpenseRequest):

    now = datetime.now()

    connection = get_db()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO expenses
        (
            expense_date,
            amount,
            description,
            category,
            cash_purpose,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        now.isoformat(),
        request.amount,
        request.description.strip(),
        request.category,
        request.cash_purpose.strip(),
        now.isoformat()
    ))

    expense_id = cursor.lastrowid

    connection.commit()
    connection.close()

    sync_month_csv(
        now.year,
        now.month
    )

    return {
        "success": True,
        "id": expense_id,
        "amount": request.amount,
        "description": request.description,
        "category": request.category
    }


# ============================================================
# GET EXPENSES
# ============================================================

@app.get("/api/expenses")
def get_expenses(
    year: Optional[int] = None,
    month: Optional[int] = None
):

    if year is None or month is None:

        year, month = current_year_month()

    connection = get_db()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            id,
            expense_date,
            amount,
            description,
            category,
            cash_purpose
        FROM expenses
        WHERE substr(expense_date, 1, 4) = ?
        AND substr(expense_date, 6, 2) = ?
        ORDER BY expense_date DESC
    """, (
        str(year),
        f"{month:02d}"
    ))

    rows = cursor.fetchall()

    connection.close()

    expenses = []

    for row in rows:

        expenses.append({
            "id": row["id"],
            "date": row["expense_date"],
            "amount": row["amount"],
            "description": row["description"],
            "category": row["category"],
            "cashPurpose": row["cash_purpose"]
        })

    return {
        "year": year,
        "month": month,
        "expenses": expenses
    }


# ============================================================
# DELETE EXPENSE
# ============================================================

@app.delete("/api/expenses/{expense_id}")
def delete_expense(expense_id: int):

    connection = get_db()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT expense_date
        FROM expenses
        WHERE id = ?
    """, (expense_id,))

    expense = cursor.fetchone()

    if not expense:

        connection.close()

        raise HTTPException(
            status_code=404,
            detail="Expense not found"
        )

    expense_date = datetime.fromisoformat(
        expense["expense_date"]
    )

    cursor.execute("""
        DELETE FROM expenses
        WHERE id = ?
    """, (expense_id,))

    connection.commit()
    connection.close()

    sync_month_csv(
        expense_date.year,
        expense_date.month
    )

    return {
        "success": True,
        "message": "Expense deleted"
    }


# ============================================================
# MONTHLY REPORT
# ============================================================

@app.get("/api/reports/{year}/{month}")
def monthly_report(
    year: int,
    month: int
):

    if month < 1 or month > 12:

        raise HTTPException(
            status_code=400,
            detail="Invalid month"
        )

    file_path = sync_month_csv(
        year,
        month
    )

    return FileResponse(
        path=file_path,
        media_type="text/csv",
        filename=month_file_name(
            year,
            month
        )
    )