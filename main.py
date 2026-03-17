import os
import json
import hashlib
import secrets
from datetime import datetime, date
from typing import Optional

from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import openpyxl

app = FastAPI(title="Safety Risk Dashboard")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
DATA_FILE = os.path.join(UPLOAD_DIR, "current_data.json")
PASSWORD = os.environ.get("DASHBOARD_PASSWORD", "safety2026")
SESSION_TOKENS: set[str] = set()

os.makedirs(UPLOAD_DIR, exist_ok=True)


# --- Auth ---
@app.post("/api/login")
async def login(request: Request):
    body = await request.json()
    if body.get("password") == PASSWORD:
        token = secrets.token_hex(32)
        SESSION_TOKENS.add(token)
        return {"token": token}
    raise HTTPException(status_code=401, detail="비밀번호가 올바르지 않습니다.")


def verify_token(request: Request):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if token not in SESSION_TOKENS:
        raise HTTPException(status_code=401, detail="인증이 필요합니다.")


# --- Excel Parsing ---
def parse_date(val) -> Optional[str]:
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.strftime("%Y-%m-%d")
    if isinstance(val, date):
        return val.strftime("%Y-%m-%d")
    s = str(val).strip()
    if not s:
        return None
    for fmt in ("%Y.%m.%d", "%Y-%m-%d", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(s.split(" ")[0] if " " in s and "." not in s else s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return s


def parse_number(val) -> int:
    if val is None:
        return 0
    try:
        return int(val)
    except (ValueError, TypeError):
        return 0


def extract_location_group(location: str) -> str:
    if not location:
        return "기타"
    loc = location.strip()
    if "화성" in loc:
        for i in range(1, 10):
            if f"{i}공장" in loc or f"{i} 공장" in loc:
                return f"화성{i}공장"
        return "화성(기타)"
    if "평택" in loc:
        for i in range(1, 10):
            if f"{i}공장" in loc or f"{i} 공장" in loc:
                return f"평택{i}공장"
        return "평택(기타)"
    if "고렴" in loc:
        return "고렴리 창고"
    return loc[:10] if len(loc) > 10 else loc


def parse_excel(file_path: str) -> list[dict]:
    wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
    all_records = []

    target_sheets = [s for s in wb.sheetnames if s != "미완료"]

    for sheet_name in target_sheets:
        ws = wb[sheet_name]
        month_label = sheet_name

        for row in ws.iter_rows(min_row=7, max_row=ws.max_row, values_only=True):
            if not row or len(row) < 27:
                continue

            no = row[0]
            if no is None or str(no).strip() == "":
                continue
            try:
                int(no)
            except (ValueError, TypeError):
                continue

            department = str(row[1] or "").strip()
            person = str(row[2] or "").strip()

            if not department and not person:
                continue

            date_val = parse_date(row[3])
            location = str(row[4] or "").strip()
            content = str(row[5] or "").strip()
            process = str(row[6] or "").strip()
            disaster_type = str(row[7] or "").strip()

            likelihood_before = parse_number(row[8])
            severity_before = parse_number(row[9])
            risk_before = parse_number(row[10])
            grade_before = str(row[11] or "").strip().replace(" ", "")

            improvement_needed = str(row[12] or "").strip()
            improvement_plan = str(row[14] or "").strip()
            improve_dept = str(row[15] or "").strip()
            planned_date = parse_date(row[16])
            actual_date = parse_date(row[17])

            likelihood_after = parse_number(row[18])
            severity_after = parse_number(row[19])
            risk_after = parse_number(row[20])
            grade_after = str(row[21] or "").strip().replace(" ", "")

            completion = str(row[23] or "").strip()
            note = str(row[24] or "").strip()
            tracking_manager = str(row[25] or "").strip()
            week = parse_number(row[26]) if len(row) > 26 else 0

            if grade_before == "-" or grade_before == "":
                grade_before = "-"

            record = {
                "no": int(no),
                "month": month_label,
                "department": department,
                "person": person,
                "date": date_val,
                "location": location,
                "location_group": extract_location_group(location),
                "content": content[:100],
                "content_full": content,
                "process": process,
                "disaster_type": disaster_type,
                "likelihood_before": likelihood_before,
                "severity_before": severity_before,
                "risk_before": risk_before,
                "grade_before": grade_before,
                "improvement_needed": improvement_needed,
                "improvement_plan": improvement_plan,
                "improve_dept": improve_dept,
                "planned_date": planned_date,
                "actual_date": actual_date,
                "likelihood_after": likelihood_after,
                "severity_after": severity_after,
                "risk_after": risk_after,
                "grade_after": grade_after,
                "completion": completion,
                "note": note,
                "tracking_manager": tracking_manager,
                "week": week,
            }
            all_records.append(record)

    wb.close()
    return all_records


@app.post("/api/upload")
async def upload_excel(request: Request, file: UploadFile = File(...)):
    verify_token(request)

    if not file.filename.endswith((".xlsx", ".xlsm")):
        raise HTTPException(status_code=400, detail="엑셀 파일(.xlsx, .xlsm)만 업로드 가능합니다.")

    file_path = os.path.join(UPLOAD_DIR, "uploaded.xlsm")
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    try:
        records = parse_excel(file_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"엑셀 파싱 오류: {str(e)}")

    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    return {"message": f"{len(records)}건의 데이터를 업로드했습니다.", "count": len(records)}


# --- Data API ---
def load_data() -> list[dict]:
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


@app.get("/api/data")
async def get_data(request: Request):
    verify_token(request)
    records = load_data()
    return {"records": records, "total": len(records)}


@app.get("/api/summary")
async def get_summary(
    request: Request,
    month: Optional[str] = None,
    location: Optional[str] = None,
    grade: Optional[str] = None,
    disaster_type: Optional[str] = None,
    process: Optional[str] = None,
    person: Optional[str] = None,
    week: Optional[int] = None,
    keyword: Optional[str] = None,
    completion: Optional[str] = None,
):
    verify_token(request)
    records = load_data()

    # Apply filters
    if month and month != "전체":
        records = [r for r in records if r["month"] == month]
    if location and location != "전체":
        records = [r for r in records if r["location_group"] == location]
    if grade and grade != "전체":
        records = [r for r in records if r["grade_before"] == grade]
    if disaster_type and disaster_type != "전체":
        records = [r for r in records if r["disaster_type"] == disaster_type]
    if process and process != "전체":
        records = [r for r in records if r["process"] == process]
    if person and person != "전체":
        records = [r for r in records if r["person"] == person]
    if week and week > 0:
        records = [r for r in records if r["week"] == week]
    if completion and completion != "전체":
        records = [r for r in records if r["completion"] == completion]
    if keyword:
        kw = keyword.lower()
        records = [r for r in records if kw in r.get("content_full", "").lower()
                   or kw in r.get("location", "").lower()
                   or kw in r.get("improvement_plan", "").lower()]

    # Detect repeated risks by normalized content
    import re
    from collections import Counter

    def normalize_content(text):
        if not text:
            return ""
        t = text.strip()
        t = re.sub(r'[.,!?;:\-~·…\s]+', '', t)
        return t.lower()

    content_counts = Counter()
    norm_map = {}
    for r in records:
        c = r.get("content_full", "").strip()
        norm = normalize_content(c)
        if norm:
            content_counts[norm] += 1
            norm_map[id(r)] = norm

    # Mark repeat info on each record
    for r in records:
        norm = norm_map.get(id(r), "")
        cnt = content_counts.get(norm, 0)
        r["repeat_count"] = cnt
        r["is_repeat"] = cnt >= 2

    total = len(records)
    repeat_total = sum(1 for r in records if r["is_repeat"])

    # Grade counts (before improvement)
    grade_a = sum(1 for r in records if r["grade_before"] == "A")
    grade_b = sum(1 for r in records if r["grade_before"] == "B")
    grade_c = sum(1 for r in records if r["grade_before"] == "C")
    grade_d = sum(1 for r in records if r["grade_before"] == "D")

    complete = sum(1 for r in records if r["completion"] == "완료")
    incomplete = sum(1 for r in records if r["completion"] != "완료")

    # By location group
    location_stats: dict[str, dict[str, int]] = {}
    for r in records:
        lg = r["location_group"]
        if lg not in location_stats:
            location_stats[lg] = {"A": 0, "B": 0, "C": 0, "D": 0, "-": 0}
        g = r["grade_before"] if r["grade_before"] in ("A", "B", "C", "D") else "-"
        location_stats[lg][g] += 1

    # By week
    week_stats: dict[str, int] = {}
    for r in records:
        m = r["month"]
        w = r["week"]
        if w > 0:
            key = f"{m} {w}주차"
            week_stats[key] = week_stats.get(key, 0) + 1

    # By disaster type
    disaster_stats: dict[str, int] = {}
    for r in records:
        dt = r["disaster_type"] if r["disaster_type"] else "미분류"
        disaster_stats[dt] = disaster_stats.get(dt, 0) + 1

    # By process
    process_stats: dict[str, int] = {}
    for r in records:
        p = r["process"] if r["process"] else "미분류"
        process_stats[p] = process_stats.get(p, 0) + 1

    # Filter options
    all_records = load_data()
    months = sorted(set(r["month"] for r in all_records))
    locations = sorted(set(r["location_group"] for r in all_records))
    disaster_types = sorted(set(r["disaster_type"] for r in all_records if r["disaster_type"]))
    processes = sorted(set(r["process"] for r in all_records if r["process"]))
    persons = sorted(set(r["person"] for r in all_records if r["person"]))
    weeks = sorted(set(r["week"] for r in all_records if r["week"] > 0))

    return {
        "total": total,
        "repeat_total": repeat_total,
        "grade_a": grade_a,
        "grade_b": grade_b,
        "grade_c": grade_c,
        "grade_d": grade_d,
        "complete": complete,
        "incomplete": incomplete,
        "location_stats": location_stats,
        "week_stats": week_stats,
        "disaster_stats": disaster_stats,
        "process_stats": process_stats,
        "records": records,
        "filters": {
            "months": months,
            "locations": locations,
            "disaster_types": disaster_types,
            "processes": processes,
            "persons": persons,
            "weeks": weeks,
        },
    }


# --- Static Files ---
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def root():
    return FileResponse("static/index.html")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
