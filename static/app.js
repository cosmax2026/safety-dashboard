let TOKEN = sessionStorage.getItem("token") || "";
let chartInstances = {};

// --- Auth ---
async function login() {
    const pw = document.getElementById("password-input").value;
    const errEl = document.getElementById("login-error");
    try {
        const res = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: pw }),
        });
        if (!res.ok) {
            errEl.textContent = "비밀번호가 올바르지 않습니다.";
            return;
        }
        const data = await res.json();
        TOKEN = data.token;
        sessionStorage.setItem("token", TOKEN);
        showDashboard();
    } catch (e) {
        errEl.textContent = "서버 연결 실패";
    }
}

function logout() {
    TOKEN = "";
    sessionStorage.removeItem("token");
    document.getElementById("login-screen").style.display = "flex";
    document.getElementById("dashboard").style.display = "none";
}

function showDashboard() {
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    fetchSummary();
}

function authHeaders() {
    return { Authorization: "Bearer " + TOKEN };
}

// --- Upload ---
async function uploadFile(input) {
    const file = input.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    try {
        const res = await fetch("/api/upload", {
            method: "POST",
            headers: authHeaders(),
            body: formData,
        });
        if (res.status === 401) { logout(); return; }
        const data = await res.json();
        alert(data.message || "업로드 완료");
        fetchSummary();
    } catch (e) {
        alert("업로드 실패: " + e.message);
    }
    input.value = "";
}

// --- Filters ---
function getFilters() {
    return {
        month: document.getElementById("f-month").value,
        location: document.getElementById("f-location").value,
        grade: document.getElementById("f-grade").value,
        disaster_type: document.getElementById("f-disaster").value,
        process: document.getElementById("f-process").value,
        person: document.getElementById("f-person").value,
        week: document.getElementById("f-week").value,
        completion: document.getElementById("f-completion").value,
        repeat: document.getElementById("f-repeat").value,
        keyword: document.getElementById("f-keyword").value,
    };
}

function resetFilters() {
    document.getElementById("f-month").value = "전체";
    document.getElementById("f-location").value = "전체";
    document.getElementById("f-grade").value = "전체";
    document.getElementById("f-disaster").value = "전체";
    document.getElementById("f-process").value = "전체";
    document.getElementById("f-person").value = "전체";
    document.getElementById("f-week").value = "0";
    document.getElementById("f-completion").value = "전체";
    document.getElementById("f-repeat").value = "전체";
    document.getElementById("f-keyword").value = "";
    fetchSummary();
}

function populateFilter(selectId, options, keepValue) {
    const sel = document.getElementById(selectId);
    const prev = sel.value;
    const defaultOption = sel.options[0].outerHTML;
    sel.innerHTML = defaultOption;
    options.forEach(opt => {
        const o = document.createElement("option");
        o.value = opt;
        o.textContent = opt;
        sel.appendChild(o);
    });
    if (keepValue && options.includes(prev)) sel.value = prev;
}

// --- Fetch Data ---
async function fetchSummary() {
    const filters = getFilters();
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
        if (v && v !== "전체" && v !== "0") params.append(k, v);
    });

    try {
        const res = await fetch("/api/summary?" + params.toString(), {
            headers: authHeaders(),
        });
        if (res.status === 401) { logout(); return; }
        const data = await res.json();

        if (data.total === 0 && !filters.keyword && filters.month === "전체") {
            document.getElementById("no-data").style.display = "block";
        } else {
            document.getElementById("no-data").style.display = "none";
        }

        // Client-side repeat filter
        let displayRecords = data.records;
        const repeatFilter = document.getElementById("f-repeat").value;
        if (repeatFilter === "반복") {
            displayRecords = displayRecords.filter(r => r.is_repeat);
        } else if (repeatFilter === "단건") {
            displayRecords = displayRecords.filter(r => !r.is_repeat);
        }

        updateStats(data);
        updateCharts(data);
        updateTable(displayRecords);
        updateFilters(data.filters);
        document.getElementById("total-badge").textContent = data.total + " cases";
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

// --- Stats ---
function updateStats(data) {
    document.getElementById("s-total").textContent = data.total;
    document.getElementById("s-a").textContent = data.grade_a;
    document.getElementById("s-b").textContent = data.grade_b;
    document.getElementById("s-c").textContent = data.grade_c;
    document.getElementById("s-d").textContent = data.grade_d;
    document.getElementById("s-complete").textContent = data.complete;
    document.getElementById("s-pending").textContent = data.incomplete;
    document.getElementById("s-repeat").textContent = data.repeat_total || 0;
}

// --- Charts ---
const GRADE_COLORS = {
    A: "#27ae60",
    B: "#3498db",
    C: "#f39c12",
    D: "#e74c3c",
    "-": "#bdc3c7",
};

function destroyChart(id) {
    if (chartInstances[id]) {
        chartInstances[id].destroy();
        delete chartInstances[id];
    }
}

function updateCharts(data) {
    // 1. Location bar chart
    destroyChart("chart-location");
    const locLabels = Object.keys(data.location_stats);
    const locDatasets = ["A", "B", "C", "D"].map(g => ({
        label: g + "등급",
        data: locLabels.map(l => data.location_stats[l][g] || 0),
        backgroundColor: GRADE_COLORS[g],
        borderRadius: 4,
    }));
    chartInstances["chart-location"] = new Chart(
        document.getElementById("chart-location"),
        {
            type: "bar",
            data: { labels: locLabels, datasets: locDatasets },
            options: {
                responsive: true,
                plugins: { legend: { display: true, position: "top" } },
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true, ticks: { stepSize: 5 } },
                },
            },
        }
    );

    // 2. Grade donut
    destroyChart("chart-grade");
    chartInstances["chart-grade"] = new Chart(
        document.getElementById("chart-grade"),
        {
            type: "doughnut",
            data: {
                labels: ["A등급", "B등급", "C등급", "D등급"],
                datasets: [{
                    data: [data.grade_a, data.grade_b, data.grade_c, data.grade_d],
                    backgroundColor: [GRADE_COLORS.A, GRADE_COLORS.B, GRADE_COLORS.C, GRADE_COLORS.D],
                    borderWidth: 0,
                }],
            },
            options: {
                responsive: true,
                cutout: "60%",
                plugins: {
                    legend: { position: "top" },
                },
            },
        }
    );

    // 3. Completion donut
    destroyChart("chart-completion");
    chartInstances["chart-completion"] = new Chart(
        document.getElementById("chart-completion"),
        {
            type: "doughnut",
            data: {
                labels: ["완료", "미완료"],
                datasets: [{
                    data: [data.complete, data.incomplete],
                    backgroundColor: ["#27ae60", "#f39c12"],
                    borderWidth: 0,
                }],
            },
            options: {
                responsive: true,
                cutout: "60%",
                plugins: {
                    legend: { position: "top" },
                },
            },
        }
    );

    // 4. Weekly bar chart
    destroyChart("chart-week");
    const weekLabels = Object.keys(data.week_stats);
    const weekData = weekLabels.map(k => data.week_stats[k]);
    chartInstances["chart-week"] = new Chart(
        document.getElementById("chart-week"),
        {
            type: "bar",
            data: {
                labels: weekLabels,
                datasets: [{
                    label: "발굴 건수",
                    data: weekData,
                    backgroundColor: "#e74c3c",
                    borderRadius: 4,
                }],
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true },
                },
            },
        }
    );

    // 5. Disaster type chart (category tab)
    destroyChart("chart-disaster");
    const disLabels = Object.keys(data.disaster_stats);
    const disData = disLabels.map(k => data.disaster_stats[k]);
    const disColors = disLabels.map((_, i) =>
        ["#e74c3c", "#3498db", "#f39c12", "#27ae60", "#9b59b6", "#1abc9c", "#e67e22", "#34495e", "#e91e63", "#00bcd4"][i % 10]
    );
    chartInstances["chart-disaster"] = new Chart(
        document.getElementById("chart-disaster"),
        {
            type: "doughnut",
            data: {
                labels: disLabels,
                datasets: [{
                    data: disData,
                    backgroundColor: disColors,
                    borderWidth: 0,
                }],
            },
            options: {
                responsive: true,
                cutout: "50%",
                plugins: { legend: { position: "right" } },
            },
        }
    );

    // 6. Process chart (category tab)
    destroyChart("chart-process");
    const procLabels = Object.keys(data.process_stats);
    const procData = procLabels.map(k => data.process_stats[k]);
    const procColors = procLabels.map((_, i) =>
        ["#3498db", "#e74c3c", "#27ae60", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22", "#34495e", "#e91e63", "#00bcd4"][i % 10]
    );
    chartInstances["chart-process"] = new Chart(
        document.getElementById("chart-process"),
        {
            type: "bar",
            data: {
                labels: procLabels,
                datasets: [{
                    label: "건수",
                    data: procData,
                    backgroundColor: procColors,
                    borderRadius: 4,
                }],
            },
            options: {
                responsive: true,
                indexAxis: "y",
                plugins: { legend: { display: false } },
                scales: {
                    x: { beginAtZero: true },
                    y: { grid: { display: false } },
                },
            },
        }
    );
}

// --- Table ---
function updateTable(records) {
    const tbody = document.getElementById("data-tbody");
    tbody.innerHTML = "";
    records.forEach(r => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${r.no}</td>
            <td>${r.month}</td>
            <td>${r.person}</td>
            <td>${r.date || "-"}</td>
            <td>${r.location || "-"}</td>
            <td title="${escapeHtml(r.content_full)}">${escapeHtml(r.content)}</td>
            <td>${r.disaster_type || "-"}</td>
            <td><span class="grade-badge grade-${r.grade_before}">${r.grade_before}</span></td>
            <td><span class="grade-badge grade-${r.grade_after || "-"}">${r.grade_after || "-"}</span></td>
            <td class="${r.completion === "완료" ? "status-complete" : "status-incomplete"}">${r.completion || "-"}</td>
            <td>${r.is_repeat ? '<span class="repeat-badge">' + r.repeat_count + '회</span>' : '<span class="repeat-badge single">1회</span>'}</td>
            <td>${r.week || "-"}</td>
        `;
        tbody.appendChild(tr);
    });
}

function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// --- Filters Update ---
function updateFilters(filters) {
    populateFilter("f-month", filters.months, true);
    populateFilter("f-location", filters.locations, true);
    populateFilter("f-disaster", filters.disaster_types, true);
    populateFilter("f-process", filters.processes, true);
    populateFilter("f-person", filters.persons, true);

    const weekSel = document.getElementById("f-week");
    const prevWeek = weekSel.value;
    weekSel.innerHTML = '<option value="0">전체</option>';
    filters.weeks.forEach(w => {
        const o = document.createElement("option");
        o.value = w;
        o.textContent = w + "주차";
        weekSel.appendChild(o);
    });
    if (prevWeek !== "0") weekSel.value = prevWeek;
}

// --- Tabs ---
function switchTab(tabName, btn) {
    document.querySelectorAll(".tab-content").forEach(el => el.style.display = "none");
    document.querySelectorAll(".tab").forEach(el => el.classList.remove("active"));
    document.getElementById("tab-" + tabName).style.display = "block";
    btn.classList.add("active");
}

// --- PDF Export (Multi-page A4) ---
async function exportPDF() {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();   // 210mm
    const pageHeight = pdf.internal.pageSize.getHeight();  // 297mm
    const margin = 12;
    const contentWidth = pageWidth - 2 * margin;
    const maxContentHeight = pageHeight - 2 * margin;
    let currentY = margin;

    // Capture element as canvas image
    async function captureElement(el) {
        return await html2canvas(el, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
        });
    }

    // Add a captured canvas to PDF, splitting across pages if needed
    function addCanvasToPDF(canvas) {
        const ratio = contentWidth / canvas.width;
        const totalImgHeight = canvas.height * ratio;

        if (totalImgHeight <= maxContentHeight && currentY + totalImgHeight <= pageHeight - margin) {
            // Fits on current page
            pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, currentY, contentWidth, totalImgHeight);
            currentY += totalImgHeight + 6;
        } else if (totalImgHeight <= maxContentHeight) {
            // Fits on one page but needs a new page
            pdf.addPage();
            currentY = margin;
            pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, currentY, contentWidth, totalImgHeight);
            currentY += totalImgHeight + 6;
        } else {
            // Too tall - split across multiple pages
            let srcY = 0;
            const srcPageHeight = maxContentHeight / ratio;

            while (srcY < canvas.height) {
                if (currentY > margin + 5) {
                    pdf.addPage();
                    currentY = margin;
                }

                const sliceHeight = Math.min(srcPageHeight, canvas.height - srcY);
                const sliceCanvas = document.createElement("canvas");
                sliceCanvas.width = canvas.width;
                sliceCanvas.height = sliceHeight;
                sliceCanvas.getContext("2d").drawImage(
                    canvas, 0, srcY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight
                );

                const drawHeight = sliceHeight * ratio;
                pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", margin, currentY, contentWidth, drawHeight);
                currentY += drawHeight;
                srcY += sliceHeight;
            }
            currentY += 6;
        }
    }

    try {
        // Show all tab contents temporarily
        const tabContents = document.querySelectorAll(".tab-content");
        const savedDisplays = [];
        tabContents.forEach(el => {
            savedDisplays.push(el.style.display);
            el.style.display = "block";
        });

        // Title page header
        pdf.setFontSize(18);
        pdf.text("Safety Risk Dashboard Report", pageWidth / 2, currentY + 8, { align: "center" });
        pdf.setFontSize(11);
        pdf.text(new Date().toLocaleDateString("ko-KR"), pageWidth / 2, currentY + 16, { align: "center" });
        currentY += 24;

        // 1. Stats cards
        const statsEl = document.querySelector(".stats-cards");
        if (statsEl) addCanvasToPDF(await captureElement(statsEl));

        // 2. All chart boxes (overview + category tabs)
        const chartBoxes = document.querySelectorAll(".chart-box");
        for (const box of chartBoxes) {
            addCanvasToPDF(await captureElement(box));
        }

        // 3. Data table
        const tableEl = document.querySelector(".table-container");
        if (tableEl) addCanvasToPDF(await captureElement(tableEl));

        // Restore tab visibility
        tabContents.forEach((el, i) => {
            el.style.display = savedDisplays[i];
        });

        pdf.save("Safety_Risk_Dashboard_Report.pdf");
    } catch (e) {
        alert("PDF 생성 실패: " + e.message);
    }
}

// --- Init ---
if (TOKEN) {
    fetch("/api/summary", { headers: authHeaders() })
        .then(res => {
            if (res.ok) showDashboard();
            else logout();
        })
        .catch(() => logout());
}
