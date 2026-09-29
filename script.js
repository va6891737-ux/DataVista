/* ===== DataVista - merged script ===== */
let students = [];
let performanceChart;
let passFailChart;
let rainChart;
let cropChart;

const PASS_MARK = 40;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* ---------- Helpers ---------- */
const $ = id => document.getElementById(id);
const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const getStatus = mark => (mark >= PASS_MARK ? "Pass" : "Fail");
const escapeHTML = text =>
  text.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function saveStudents() {
  try { localStorage.setItem("dv_students", JSON.stringify(students)); } catch (e) {}
}
function loadStudents() {
  try { students = JSON.parse(localStorage.getItem("dv_students")) || []; } catch (e) { students = []; }
}

function showMessage(text, ok) {
  const msg = $("formMsg");
  if (!msg) return;
  msg.textContent = text;
  msg.className = ok ? "form-msg ok" : "form-msg";
}

function refreshAll() {
  displayStudents();
  updateDashboard();
  updateChart();
  updatePassFailChart();
  updateInsights();
  updateStudentAI();
}

/* ---------- Add / delete student ---------- */
function addStudent() {
  const nameInput = $("studentName");
  const markInput = $("studentMark");
  const name = nameInput.value.trim();
  const mark = Number(markInput.value);

  if (name === "") {
    showMessage("Enter the student name.", false);
    nameInput.focus();
    return;
  }
  if (markInput.value === "" || mark < 0 || mark > 100) {
    showMessage("Enter a mark between 0 and 100.", false);
    markInput.focus();
    return;
  }

  students.push({ name: name, mark: mark });
  saveStudents();
  nameInput.value = "";
  markInput.value = "";
  showMessage(name + " added.", true);
  refreshAll();
}

function deleteStudent(index) {
  students.splice(index, 1);
  saveStudents();
  refreshAll();
}

/* ---------- Records table (search + status filter) ---------- */
function displayStudents() {
  const searchValue = $("searchStudent").value.trim().toLowerCase();
  const selectedStatus = $("statusFilter").value;
  const tableBody = $("studentTableBody");
  tableBody.innerHTML = "";

  let shown = 0;
  students.forEach((student, index) => {
    const status = getStatus(student.mark);
    const matchesName = student.name.toLowerCase().includes(searchValue);
    const matchesStatus = selectedStatus === "All" || selectedStatus === status;
    if (!matchesName || !matchesStatus) return;

    shown++;
    const badgeClass = status === "Pass" ? "pass-badge" : "fail-badge";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${escapeHTML(student.name)}</td>
      <td>${student.mark}</td>
      <td>
        <span class="status-badge ${badgeClass}">${status}</span>
        <button class="delete-btn" onclick="deleteStudent(${index})"
          aria-label="Delete ${escapeHTML(student.name)}">Delete</button>
      </td>`;
    tableBody.appendChild(row);
  });

  if (shown === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="4" class="empty">No records found. Add a student or change the filter.</td></tr>';
  }
}
function searchStudent() { displayStudents(); }
function filterStatus() { displayStudents(); }

/* ---------- Dashboard ---------- */
function updateDashboard() {
  const total = students.length;
  const average = total > 0 ? students.reduce((sum, s) => sum + s.mark, 0) / total : 0;
  const passCount = students.filter(s => s.mark >= PASS_MARK).length;
  const failCount = total - passCount;
  const passPercentage = total > 0 ? (passCount / total) * 100 : 0;
  const failPercentage = total > 0 ? (failCount / total) * 100 : 0;

  $("totalStudents").textContent = total;
  $("averageMark").textContent = average.toFixed(1);
  $("passPercentage").textContent = passPercentage.toFixed(1) + "%";
  $("failPercentage").textContent = failPercentage.toFixed(1) + "%";
}

/* ---------- Charts ---------- */
function baseScales() {
  return {
    x: { grid: { display: false }, ticks: { color: cssVar("--mut") } },
    y: { beginAtZero: true, grid: { color: cssVar("--grid") }, border: { display: false }, ticks: { color: cssVar("--mut") } }
  };
}

function updateChart() {
  const canvas = $("performanceChart");
  const labels = students.map(s => s.name);
  const data = students.map(s => s.mark);
  if (performanceChart) performanceChart.destroy();

  const scales = baseScales();
  scales.y.max = 100;

  performanceChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Marks",
        data: data,
        backgroundColor: students.map(s => (s.mark >= PASS_MARK ? cssVar("--acc") : cssVar("--bad"))),
        borderRadius: 6,
        maxBarThickness: 40
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: scales
    }
  });
}

function updatePassFailChart() {
  const canvas = $("passFailChart");
  const passCount = students.filter(s => s.mark >= PASS_MARK).length;
  const failCount = students.filter(s => s.mark < PASS_MARK).length;
  if (passFailChart) passFailChart.destroy();

  passFailChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["Pass", "Fail"],
      datasets: [{ data: [passCount, failCount], backgroundColor: [cssVar("--ok"), cssVar("--bad")], borderWidth: 0 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "66%",
      plugins: { legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8 } } }
    }
  });
}

/* ---------- Insights ---------- */
function updateInsights() {
  const performanceInsight = $("performanceInsight");
  const classInsight = $("classInsight");

  if (students.length === 0) {
    performanceInsight.textContent = "Add students to see insights.";
    classInsight.textContent = "Analytics will appear here.";
    return;
  }

  const average = students.reduce((sum, s) => sum + s.mark, 0) / students.length;
  const topStudent = students.reduce((top, s) => (s.mark > top.mark ? s : top));
  const passCount = students.filter(s => s.mark >= PASS_MARK).length;

  performanceInsight.textContent =
    `${topStudent.name} has the highest mark (${topStudent.mark}). Class average is ${average.toFixed(1)}.`;
  classInsight.textContent =
    `${passCount} out of ${students.length} students have passed.`;
}

/* ---------- TN Rainfall (sample data) ---------- */
let seed = 7;
const random = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

const rainBase = [45, 30, 25, 60, 70, 55, 90, 110, 140, 280, 320, 150];
const districtFactor = { Chennai: 1.5, Thiruvannamalai: 1.1, Madurai: 0.8, Coimbatore: 0.9, Thanjavur: 1.2, Tirunelveli: 0.85 };
const rainfall = {};
Object.keys(districtFactor).forEach(d => {
  rainfall[d] = rainBase.map(v => Math.round(v * districtFactor[d] * (0.85 + random() * 0.3)));
});

function updateRainChart() {
  const district = $("districtSelect").value;
  const values = rainfall[district];
  if (rainChart) rainChart.destroy();

  rainChart = new Chart($("rainChart"), {
    type: "bar",
    data: { labels: MONTHS, datasets: [{ label: "Rainfall (mm)", data: values, backgroundColor: cssVar("--acc"), borderRadius: 5, maxBarThickness: 36 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: baseScales() }
  });

  const peak = values.indexOf(Math.max(...values));
  const total = values.reduce((a, b) => a + b, 0);
  $("rainNote").textContent =
    `${district}: wettest month is ${MONTHS[peak]} (${values[peak]} mm). Yearly total is about ${total} mm.`;
}

/* ---------- Crop prices (sample data) ---------- */
const cropBase = { Rice: [2050, 15], Tomato: [1800, 180], Onion: [2200, 150], Banana: [2600, 60], Groundnut: [5600, 40] };
const cropPrices = {};
Object.keys(cropBase).forEach(c => {
  const [base, swing] = cropBase[c];
  cropPrices[c] = MONTHS.map((_, i) =>
    Math.round(base + swing * Math.sin(i / 1.9) + i * 8 + (random() - 0.5) * swing * 0.6));
});

function updateCropChart() {
  const crop = $("cropSelect").value;
  const values = cropPrices[crop];
  if (cropChart) cropChart.destroy();

  cropChart = new Chart($("cropChart"), {
    type: "line",
    data: {
      labels: MONTHS,
      datasets: [{ label: "Price (₹/quintal)", data: values, borderColor: cssVar("--acc"), backgroundColor: cssVar("--accbg"), fill: true, tension: 0.3, pointRadius: 3, borderWidth: 2 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: baseScales() }
  });

  const hi = values.indexOf(Math.max(...values));
  const lo = values.indexOf(Math.min(...values));
  $("cropNote").textContent =
    `${crop}: highest in ${MONTHS[hi]} (₹${values[hi]}), lowest in ${MONTHS[lo]} (₹${values[lo]}).`;
}

/* ---------- AI: in-browser machine learning ---------- */
let forecastChart;

// 1) Linear regression (least squares) for trend + forecast
function linearRegression(y) {
  const n = y.length;
  const x = y.map((_, i) => i);
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  x.forEach((v, i) => { sxy += (v - mx) * (y[i] - my); sxx += (v - mx) ** 2; syy += (y[i] - my) ** 2; });
  const slope = sxy / sxx;
  return { slope: slope, intercept: my - slope * mx, r2: (sxy * sxy) / (sxx * syy) };
}
const predictNext = (values, steps) => {
  const m = linearRegression(values);
  return Array.from({ length: steps }, (_, i) => Math.round(m.intercept + m.slope * (values.length + i)));
};

function updateForecast() {
  const crop = $("forecastCrop").value;
  const values = cropPrices[crop];
  const m = linearRegression(values);
  const trend = values.map((_, i) => Math.round(m.intercept + m.slope * i));
  const future = predictNext(values, 3);
  const nulls = future.map(() => null);
  const unusual = detectAnomalies(values);
  if (forecastChart) forecastChart.destroy();

  forecastChart = new Chart($("forecastChart"), {
    type: "line",
    data: {
      labels: MONTHS.concat(["Next 1", "Next 2", "Next 3"]),
      datasets: [
        { label: "Actual", data: values.concat(nulls), borderColor: cssVar("--acc"), tension: 0.3, pointRadius: 3, borderWidth: 2 },
        { label: "Trend", data: trend.concat(nulls), borderColor: cssVar("--mut"), borderDash: [6, 4], pointRadius: 0, borderWidth: 1.5 },
        { label: "Forecast", data: values.map(() => null).concat(future), borderColor: cssVar("--ok"), backgroundColor: cssVar("--ok"), pointRadius: 5 },
        { label: "Unusual", data: values.map((v, i) => (unusual.includes(i) ? v : null)).concat(nulls), showLine: false, borderColor: cssVar("--bad"), backgroundColor: cssVar("--bad"), pointStyle: "triangle", pointRadius: 8 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false, scales: baseScales(),
      plugins: { legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8 } } }
    }
  });

  const dir = m.slope >= 0 ? "rising" : "falling";
  $("forecastNote").textContent =
    `${crop} price is ${dir} by about ₹${Math.abs(m.slope).toFixed(1)} per month. Forecast for 3 months ahead: ₹${future[2]}. Model fit (R²): ${m.r2.toFixed(2)}. ` +
    (unusual.length
      ? `Unusual months: ${unusual.map(i => MONTHS[i] + " (₹" + values[i] + ")").join(", ")}.`
      : "No unusual months found.");
}

// 2) K-Means clustering (1D) to group students by marks
function kMeans1D(values, k) {
  const sorted = values.slice().sort((a, b) => a - b);
  let centers = Array.from({ length: k }, (_, i) => sorted[Math.floor((i + 0.5) * sorted.length / k)]);
  let groups = [];
  for (let iter = 0; iter < 25; iter++) {
    groups = centers.map(() => []);
    values.forEach((v, idx) => {
      let best = 0;
      centers.forEach((c, ci) => { if (Math.abs(v - c) < Math.abs(v - centers[best])) best = ci; });
      groups[best].push(idx);
    });
    const next = groups.map((g, ci) => g.length ? g.reduce((s, idx) => s + values[idx], 0) / g.length : centers[ci]);
    if (next.every((c, i) => c === centers[i])) break;
    centers = next;
  }
  return centers.map((c, i) => ({ center: c, members: groups[i] })).sort((a, b) => b.center - a.center);
}

function updateStudentAI() {
  const box = $("clusterList");
  if (students.length < 3) {
    box.innerHTML = '<div class="empty">Add at least 3 students to see the groups.</div>';
    return;
  }
  const clusters = kMeans1D(students.map(s => s.mark), 3).filter(c => c.members.length);
  const names = ["Top performers", "Middle group", "Needs support"];
  box.innerHTML = clusters.map((c, i) => {
    const label = clusters.length === 3 ? names[i] : (i === 0 ? names[0] : names[2]);
    const list = c.members.map(idx => escapeHTML(students[idx].name)).join(", ");
    return `<div class="cluster"><strong><span>${label}</span><span>${c.members.length} students</span></strong>` +
           `<small>Average mark ${c.center.toFixed(1)}. ${list}</small></div>`;
  }).join("");
  const atRisk = students.filter(s => s.mark >= PASS_MARK && s.mark < PASS_MARK + 15);
  if (atRisk.length) {
    box.innerHTML += `<div class="cluster"><strong><span>At risk (close to failing)</span><span>${atRisk.length}</span></strong>` +
      `<small>${atRisk.map(s => escapeHTML(s.name) + " (" + s.mark + ")").join(", ")}</small></div>`;
  }
}

// 3) "Ask DataVista": keyword intent matching over the page's own data
const askExamples = [
  "Who is the top student?", "How many students passed?", "Which students are at risk?",
  "Which crop has the highest price?", "Forecast rice price", "When does Chennai get the most rain?"
];

function answerQuestion(question) {
  const q = question.toLowerCase();
  const total = students.length;
  const districts = Object.keys(rainfall), cropNames = Object.keys(cropPrices);
  const district = districts.find(d => q.includes(d.toLowerCase()));
  const crop = cropNames.find(c => q.includes(c.toLowerCase()));

  if (district) {
    const v = rainfall[district], i = v.indexOf(Math.max(...v));
    return `${district} gets the most rain in ${MONTHS[i]} (${v[i]} mm). Yearly total is about ${v.reduce((a, b) => a + b, 0)} mm.`;
  }
  if (crop) {
    const v = cropPrices[crop], hi = v.indexOf(Math.max(...v)), lo = v.indexOf(Math.min(...v));
    const f = predictNext(v, 3);
    return `${crop}: highest price in ${MONTHS[hi]} (₹${v[hi]}), lowest in ${MONTHS[lo]} (₹${v[lo]}). Forecast for the next 3 months: ₹${f.join(", ₹")}.`;
  }
  if (q.includes("rain")) {
    const totals = districts.map(d => [d, rainfall[d].reduce((a, b) => a + b, 0)]).sort((a, b) => b[1] - a[1]);
    return `${totals[0][0]} has the highest yearly rainfall (${totals[0][1]} mm). ${totals[totals.length - 1][0]} has the lowest (${totals[totals.length - 1][1]} mm).`;
  }
  if (q.includes("crop") || q.includes("price")) {
    const avgs = cropNames.map(c => [c, cropPrices[c].reduce((a, b) => a + b, 0) / 12]).sort((a, b) => b[1] - a[1]);
    return `${avgs[0][0]} has the highest average price (₹${Math.round(avgs[0][1])} per quintal). ${avgs[avgs.length - 1][0]} has the lowest (₹${Math.round(avgs[avgs.length - 1][1])}).`;
  }
  if (q.includes("student") || q.includes("mark") || q.includes("pass") || q.includes("fail") || q.includes("risk") || q.includes("top") || q.includes("average")) {
    if (!total) return "There are no students yet. Add students in the Students section first.";
    const avg = students.reduce((s, x) => s + x.mark, 0) / total;
    const passed = students.filter(s => s.mark >= PASS_MARK);
    if (q.includes("risk")) {
      const r = students.filter(s => s.mark >= PASS_MARK && s.mark < PASS_MARK + 15);
      return r.length ? `At risk (close to failing): ${r.map(s => s.name + " (" + s.mark + ")").join(", ")}.` : "No student is close to the pass mark right now.";
    }
    if (q.includes("fail")) {
      const f = students.filter(s => s.mark < PASS_MARK);
      return f.length ? `Failed: ${f.map(s => s.name + " (" + s.mark + ")").join(", ")}.` : "Nobody has failed. Every student is at or above the pass mark.";
    }
    if (q.includes("top") || q.includes("best") || q.includes("highest")) {
      const t = students.reduce((a, b) => (b.mark > a.mark ? b : a));
      return `${t.name} is the top student with ${t.mark} marks.`;
    }
    if (q.includes("average")) return `The class average is ${avg.toFixed(1)} marks.`;
    return `${passed.length} of ${total} students passed (${Math.round(passed.length / total * 100)}%). Class average is ${avg.toFixed(1)}.`;
  }
  return "I can answer questions about students, rainfall and crop prices. Try one of the suggestions above.";
}

function askDataVista(text) {
  const q = text.trim();
  if (!q) { $("askAnswer").textContent = "Type a question first."; return; }
  $("askAnswer").textContent = answerQuestion(q);
}

$("forecastCrop").innerHTML = Object.keys(cropPrices).map(c => `<option>${c}</option>`).join("");
$("forecastCrop").addEventListener("change", updateForecast);
$("askChips").innerHTML = askExamples.map(t => `<button class="chip-btn" type="button">${t}</button>`).join("");
$("askChips").addEventListener("click", e => {
  const b = e.target.closest(".chip-btn");
  if (!b) return;
  $("askInput").value = b.textContent;
  askDataVista(b.textContent);
});
$("askBtn").addEventListener("click", () => askDataVista($("askInput").value));
$("askInput").addEventListener("keydown", e => { if (e.key === "Enter") askDataVista($("askInput").value); });

// Anomaly detection: flag months far from the regression trend (z-score of residuals)
function detectAnomalies(values, threshold = 1.5) {
  const m = linearRegression(values);
  const res = values.map((v, i) => v - (m.intercept + m.slope * i));
  const std = Math.sqrt(res.reduce((a, r) => a + r * r, 0) / res.length);
  if (!std) return [];
  return res.map((r, i) => (Math.abs(r / std) > threshold ? i : -1)).filter(i => i >= 0);
}

/* ---------- CSV upload ---------- */
function parseCSV(text) {
  return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    .map(line => line.split(",").map(c => c.trim().replace(/^"|"$/g, "")));
}
function readCsvFile(input, done) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => done(String(reader.result));
  reader.readAsText(file);
  input.value = "";
}
function setMsg(id, text, ok) {
  const el = $(id);
  el.textContent = text;
  el.className = ok ? "upload-msg ok" : "upload-msg";
}
function refreshSelects() {
  const opts = obj => Object.keys(obj).map(k => `<option>${escapeHTML(k)}</option>`).join("");
  $("districtSelect").innerHTML = opts(rainfall);
  $("cropSelect").innerHTML = opts(cropPrices);
  $("forecastCrop").innerHTML = opts(cropPrices);
  updateRainChart();
  updateCropChart();
  updateForecast();
}
function applySeries(store, text, msgId, label) {
  const found = {};
  parseCSV(text).forEach(cells => {
    const nums = cells.slice(1, 13);
    if (cells[0] && nums.length === 12 && nums.every(c => c !== "" && Number.isFinite(Number(c)))) {
      found[cells[0]] = nums.map(Number);
    }
  });
  const count = Object.keys(found).length;
  if (!count) {
    setMsg(msgId, "No valid rows found. Each row needs a name and 12 numbers (Jan to Dec).", false);
    return;
  }
  Object.keys(store).forEach(k => delete store[k]);
  Object.assign(store, found);
  refreshSelects();
  setMsg(msgId, `${count} ${label} loaded from your file.`, true);
}

$("studentCsv").addEventListener("change", e => readCsvFile(e.target, text => {
  let added = 0;
  parseCSV(text).forEach(cells => {
    const mark = Number(cells[1]);
    if (cells[0] && cells[1] !== undefined && cells[1] !== "" && Number.isFinite(mark) && mark >= 0 && mark <= 100) {
      students.push({ name: cells[0], mark: mark });
      added++;
      
}
  });
  if (!added) { setMsg("studentCsvMsg", "No valid rows found. Use name,mark with marks from 0 to 100.", false); return; }
  saveStudents();
  refreshAll();
  setMsg("studentCsvMsg", `${added} students added from your file.`, true);
}));
$("rainCsv").addEventListener("change", e => readCsvFile(e.target, text => applySeries(rainfall, text, "rainCsvMsg", "districts")));
$("cropCsv").addEventListener("change", e => readCsvFile(e.target, text => applySeries(cropPrices, text, "cropCsvMsg", "crops")));

/* ---------- Sidebar: highlight current section ---------- */
const navLinks = Array.from(document.querySelectorAll(".sidebar nav a"));
const navSections = navLinks.map(a => document.querySelector(a.getAttribute("href")));

function highlightNav() {
  let current = 0;
  navSections.forEach((section, i) => {
    if (section && section.getBoundingClientRect().top <= 140) current = i;
  });
  navLinks.forEach((a, i) => a.classList.toggle("active", i === current));
}

/* ---------- Event listeners ---------- */
$("addStudentBtn").addEventListener("click", addStudent);

["studentMark", "studentName"].forEach(id => {
  $(id).addEventListener("keydown", function (event) {
    if (event.key === "Enter") addStudent();
  });
});

$("searchStudent").addEventListener("input", searchStudent);
$("statusFilter").addEventListener("change", filterStatus);

$("districtSelect").innerHTML = Object.keys(rainfall).map(d => `<option>${d}</option>`).join("");
$("cropSelect").innerHTML = Object.keys(cropPrices).map(c => `<option>${c}</option>`).join("");
$("districtSelect").addEventListener("change", updateRainChart);
$("cropSelect").addEventListener("change", updateCropChart);

window.addEventListener("scroll", highlightNav, { passive: true });

/* ---------- Start ---------- */
loadStudents();
refreshAll();
updateRainChart();
updateCropChart();
updateForecast();
highlightNav();