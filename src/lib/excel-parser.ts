import ExcelJS from "exceljs";

export interface ParsedTask {
  field: string;
  category: string;
  taskName: string;
  targetCount: number;
  completedCount: number;
  achievementRate: number;
  status: string;
  notes: string;
  personInCharge: string;
}

export interface ParsedWeek {
  weekLabel: string;
  periodStart: string;
  periodEnd: string;
  tasks: ParsedTask[];
}

function getCellValue(cell: ExcelJS.Cell): string {
  if (cell.value === null || cell.value === undefined) return "";
  if (typeof cell.value === "object" && "result" in cell.value) {
    return String(cell.value.result ?? "");
  }
  if (typeof cell.value === "object" && "richText" in cell.value) {
    return cell.value.richText.map((rt) => rt.text).join("");
  }
  return String(cell.value);
}

function getNumericValue(cell: ExcelJS.Cell): number {
  const val = cell.value;
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  if (typeof val === "object" && "result" in val) {
    return Number(val.result) || 0;
  }
  return Number(val) || 0;
}

function parseStatus(rate: number): string {
  if (rate >= 100) return "완료";
  if (rate >= 60) return "진행중";
  if (rate >= 1) return "지연";
  return "대기";
}

function parseWeekLabel(raw: string): { weekLabel: string; periodStart: string; periodEnd: string } {
  // Try to extract period like "3.17(월)~3.21(금)" or "2026.3.17~3.21"
  const periodMatch = raw.match(
    /(\d{1,2})\.(\d{1,2})\s*[\(（][^\)）]*[\)）]\s*~\s*(\d{1,2})\.(\d{1,2})/
  );
  let periodStart = "";
  let periodEnd = "";
  let weekLabel = raw.trim();

  if (periodMatch) {
    const m1 = periodMatch[1];
    const d1 = periodMatch[2];
    const m2 = periodMatch[3];
    const d2 = periodMatch[4];
    periodStart = `${m1}.${d1}`;
    periodEnd = `${m2}.${d2}`;
    weekLabel = `${m1}/${d1}~${m2}/${d2}`;
  } else {
    // Try simpler format: "3.17~3.21"
    const simpleMatch = raw.match(/(\d{1,2})\.(\d{1,2})\s*~\s*(\d{1,2})\.(\d{1,2})/);
    if (simpleMatch) {
      periodStart = `${simpleMatch[1]}.${simpleMatch[2]}`;
      periodEnd = `${simpleMatch[3]}.${simpleMatch[4]}`;
      weekLabel = `${simpleMatch[1]}/${simpleMatch[2]}~${simpleMatch[3]}/${simpleMatch[4]}`;
    }
  }

  return { weekLabel, periodStart, periodEnd };
}

export async function parseExcel(buffer: Buffer): Promise<ParsedWeek> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];

  if (!sheet) throw new Error("엑셀 파일에 시트가 없습니다.");

  // Row 2: period info
  const periodCell = getCellValue(sheet.getCell("A2")) || getCellValue(sheet.getCell("B2")) || getCellValue(sheet.getCell("C2"));
  const { weekLabel, periodStart, periodEnd } = parseWeekLabel(periodCell);

  const tasks: ParsedTask[] = [];
  let lastField = "";

  // Row 6~25: data rows
  for (let r = 6; r <= 25; r++) {
    const row = sheet.getRow(r);
    const taskName = getCellValue(row.getCell(3)).trim(); // C column
    if (!taskName) continue;

    const fieldVal = getCellValue(row.getCell(1)).trim(); // A column (may be merged)
    if (fieldVal) lastField = fieldVal;

    const category = getCellValue(row.getCell(2)).trim();
    const targetCount = getNumericValue(row.getCell(4));
    const completedCount = getNumericValue(row.getCell(5));

    // F column: achievement rate (may be formula)
    let achievementRate = getNumericValue(row.getCell(6));
    // If it's a decimal (0.85), convert to percentage
    if (achievementRate > 0 && achievementRate <= 1) {
      achievementRate = Math.round(achievementRate * 100);
    }
    // If both target and completed exist but rate is 0, calculate it
    if (achievementRate === 0 && targetCount > 0) {
      achievementRate = Math.round((completedCount / targetCount) * 100);
    }

    const statusRaw = getCellValue(row.getCell(7)).trim();
    // Parse status from emoji or text, fallback to rate-based
    let status = "";
    if (statusRaw.includes("완료")) status = "완료";
    else if (statusRaw.includes("진행")) status = "진행중";
    else if (statusRaw.includes("지연")) status = "지연";
    else if (statusRaw.includes("대기")) status = "대기";
    else status = parseStatus(achievementRate);

    const notes = getCellValue(row.getCell(8)).trim();
    const personInCharge = getCellValue(row.getCell(9)).trim();

    tasks.push({
      field: lastField || "기타",
      category,
      taskName,
      targetCount,
      completedCount,
      achievementRate,
      status,
      notes,
      personInCharge,
    });
  }

  if (tasks.length === 0) {
    throw new Error("파싱된 업무 데이터가 없습니다. 엑셀 형식을 확인해주세요.");
  }

  return { weekLabel, periodStart, periodEnd, tasks };
}
