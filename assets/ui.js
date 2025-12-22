/* =========================================================
   ui.js — STUDENT DASHBOARD
   PART 1 / 4
   ---------------------------------------------------------
   Contents:
   - Global helpers
   - Auth (login/logout)
   - Section switching (overview)
   - HOME (useful dashboard)
   - TASKS (add/edit/delete)
========================================================= */

/* ===================== GLOBAL HELPERS ===================== */

function escapeHtml(s){
  return String(s || "")
    .replace(/[&<>"']/g, c => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[c]));
}

function todayKey(){
  return new Date().toISOString().slice(0,10);
}

function uid(){
  return "u" + Math.random().toString(36).slice(2,10);
}

function dayLabel(dateKey){
  const today = todayKey();
  const diff = Math.round(
    (new Date(dateKey) - new Date(today)) / 86400000
  );
  if(diff === 0) return "Today";
  if(diff === 1) return "Tomorrow";
  return new Date(dateKey).toLocaleDateString("en", { weekday: "long" });
}

/* ===================== AUTH ===================== */

function login(name){
  localStorage.setItem("user", name);
  location.reload();
}

function logout(){
  localStorage.clear();
  location.reload();
}

/* ===================== SECTION SWITCH ===================== */

function showSection(id){
  const sections = [
    "home",
    "overview",
    "tasks",
    "academics",
    "attendance",
    "timetable",
    "events",
    "exams"
  ];

  sections.forEach(sec=>{
    const el = document.getElementById(sec);
    if(el) el.classList.add("hidden");
  });

  const active = document.getElementById(id);
  if(active) active.classList.remove("hidden");

  if(id==="home") renderHome();
  if(id==="overview") renderOverview();
  if(id==="tasks") renderTasks();
  if(id==="academics") renderAcademics();
  if(id==="attendance") renderAttendance();
  if(id==="timetable") renderTimetable();
  if(id==="events") renderEvents();
  if(id==="exams") renderExams();
}

/* =========================================================
   HOME — USEFUL DASHBOARD
   - Tasks for today
   - Exams (next 7 days)
   - Events (next 7 days)
   - Today's timetable
========================================================= */

async function renderHome(){
  const box = document.getElementById("home");
  if(!box) return;

  const tasks  = await getTasks();
  const prog   = await getProgress();
  const exams  = await getExams();
  const events = await getEvents();
  const tt     = await getTimetable();

  const today  = todayKey();
  const msDay  = 86400000;
  const jsDay  = new Date(today).getDay();
  const idx    = (jsDay + 6) % 7;

  /* -------- TODAY TASKS -------- */
  const todayTasks = tasks.filter(t=>{
    if(t.freq==="daily") return true;
    if(t.freq==="once") return t.date===today;
    if(t.freq==="weekly") return (t.weekdays||[]).includes(idx);
    if(t.freq==="specific") return (t.dates||[]).includes(today);
    return false;
  });

  /* -------- EXAMS NEXT 7 DAYS -------- */
  const nextExams = exams.filter(e=>{
    if(!e.date) return false;
    const d = new Date(e.date+"T00:00:00");
    const diff = Math.round((d - new Date(today)) / msDay);
    return diff>=0 && diff<=7;
  });

  /* -------- EVENTS NEXT 7 DAYS -------- */
  const nextEvents = events.filter(e=>{
    if(!e.date) return false;
    const d = new Date(e.date+"T00:00:00");
    const diff = Math.round((d - new Date(today)) / msDay);
    return diff>=0 && diff<=7;
  });

  /* -------- TODAY TIMETABLE -------- */
  const dayName = new Date().toLocaleDateString("en-US",{weekday:"long"});
  const todayTT = tt[dayName] || [];

  box.innerHTML = `
    <h2>Today</h2>

    <div class="card">
      <h3>Tasks</h3>
      ${todayTasks.length
        ? todayTasks.map(t=>{
            const done = (prog[t.id]||[]).includes(today);
            return `
              <label style="${done?'text-decoration:line-through;opacity:.7':''}">
                <input type="checkbox"
                  ${done?'checked':''}
                  onchange="toggleTaskForDate('${t.id}','${today}',this.checked)">
                ${escapeHtml(t.name)}
              </label><br>`;
          }).join("")
        : "No tasks today"}
    </div>

    <div class="card">
      <h3>Exams (Next 7 Days)</h3>
      ${nextExams.length
        ? nextExams.map(e=>`${e.date} · ${escapeHtml(e.subject)}`).join("<br>")
        : "No upcoming exams"}
    </div>

    <div class="card">
      <h3>Events (Next 7 Days)</h3>
      ${nextEvents.length
        ? nextEvents.map(e=>`${e.date} · ${escapeHtml(e.name)}`).join("<br>")
        : "No upcoming events"}
    </div>

    <div class="card">
      <h3>Today's Timetable</h3>
      ${todayTT.length
        ? todayTT.map(c=>
            `${escapeHtml(c.time)} · ${escapeHtml(c.subject)} · ${escapeHtml(c.room||"")}`
          ).join("<br>")
        : "No classes today"}
    </div>
  `;
}

/* =========================================================
   TASKS — ADD / EDIT / DELETE
   - No completion here
   - No start date
========================================================= */

async function renderTasks(){
  const box = document.getElementById("tasks");
  if(!box) return;

  const tasks = await getTasks();

  box.innerHTML = `
    <h2>Tasks</h2>

    <div class="card">
      <input id="add_name" placeholder="Task name">

      <select id="add_freq">
        <option value="daily">Daily</option>
        <option value="once">Once</option>
        <option value="weekly">Weekly</option>
        <option value="specific">Specific dates</option>
      </select>

      <div id="add_extra"></div>

      <button class="btn small" onclick="saveNewTask()">Add Task</button>
    </div>

    <div class="card">
      ${tasks.length
        ? tasks.map(t=>`
            <div class="list-row">
              <div>
                <b>${escapeHtml(t.name)}</b>
                <span style="opacity:.7">(${t.freq})</span>
              </div>
              <div>
                <button class="btn tiny" onclick="editTask('${t.id}')">Edit</button>
                <button class="btn tiny" onclick="deleteTask('${t.id}')">Del</button>
              </div>
            </div>
          `).join("")
        : "No tasks added yet"}
    </div>
  `;

  document.getElementById("add_freq").onchange = renderAddExtra;
  renderAddExtra();
}

/* ===================== TASK EXTRA INPUTS ===================== */

function renderAddExtra(){
  const extra = document.getElementById("add_extra");
  const freq  = document.getElementById("add_freq").value;
  if(!extra) return;

  extra.innerHTML = "";

  if(freq==="once"){
    extra.innerHTML = `<input type="date" id="once_date">`;
  }
  else if(freq==="weekly"){
    extra.innerHTML =
      ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
        .map((d,i)=>`
          <label>
            <input type="checkbox" class="wk" value="${i}"> ${d}
          </label>
        `).join(" ");
  }
  else if(freq==="specific"){
    window.__spec = [];
    extra.innerHTML = `
      <input type="date" id="spec_date">
      <button class="btn tiny" onclick="addSpec()">Add</button>
      <div id="spec_list"></div>
    `;
  }
}

function addSpec(){
  const inp  = document.getElementById("spec_date");
  const list = document.getElementById("spec_list");
  if(!inp || !list || !inp.value) return;

  if(!window.__spec.includes(inp.value)){
    window.__spec.push(inp.value);
  }
  list.innerText = window.__spec.join(", ");
}

/* ===================== SAVE / EDIT / DELETE ===================== */

async function saveNewTask(){
  const nameEl = document.getElementById("add_name");
  const freqEl = document.getElementById("add_freq");
  if(!nameEl.value.trim()) return;

  const tasks = await getTasks();
  const task = {
    id: uid(),
    name: nameEl.value.trim(),
    freq: freqEl.value
  };

  if(task.freq==="once"){
    task.date = document.getElementById("once_date").value;
  }
  else if(task.freq==="weekly"){
    task.weekdays = [...document.querySelectorAll(".wk:checked")].map(x=>+x.value);
  }
  else if(task.freq==="specific"){
    task.dates = window.__spec || [];
  }

  tasks.push(task);
  await saveTasks(tasks);
  renderTasks();
}

async function editTask(id){
  const tasks = await getTasks();
  const t = tasks.find(x=>x.id===id);
  if(!t) return;

  const n = prompt("Edit task name", t.name);
  if(n!==null){
    t.name = n.trim() || t.name;
    await saveTasks(tasks);
    renderTasks();
  }
}

async function deleteTask(id){
  if(!confirm("Delete task?")) return;
  const tasks = await getTasks();
  await saveTasks(tasks.filter(x=>x.id!==id));
  renderTasks();
}

/* ===================== END OF PART 1 ===================== */

/* =========================================================
   ui.js — STUDENT DASHBOARD
   PART 2 / 4
   ---------------------------------------------------------
   Contents:
   - Overview page (replaces Progress)
   - Today tasks (tick + untick)
   - Upcoming non-daily tasks (7 days, grouped)
   - Consistency graph (daily / weekly / monthly)
========================================================= */

/* =========================================================
   OVERVIEW
========================================================= */

async function renderOverview(){
  const sec = document.getElementById("overview");
  if(!sec) return;

  const tasks = await getTasks();
  const prog  = await getProgress();

  const today = todayKey();
  const jsDay = new Date(today).getDay();
  const idx   = (jsDay + 6) % 7;   // Mon = 0

  /* ---------------- PART 1: TODAY TASKS ---------------- */

  const todayTasks = tasks.filter(t => {
    if(t.freq === "daily") return true;
    if(t.freq === "once") return t.date === today;
    if(t.freq === "weekly") return (t.weekdays || []).includes(idx);
    if(t.freq === "specific") return (t.dates || []).includes(today);
    return false;
  });

  /* ---------------- PART 2: UPCOMING (NON-DAILY) -------- */

  const upcoming = {};   // { dateKey: [taskName, ...] }

  for(let i = 0; i < 7; i++){
    const d = new Date();
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0,10);
    const dayIdx = (d.getDay() + 6) % 7;

    tasks.forEach(t => {
      if(t.freq === "daily") return;

      let applies = false;
      if(t.freq === "once") applies = (t.date === key);
      else if(t.freq === "weekly") applies = (t.weekdays || []).includes(dayIdx);
      else if(t.freq === "specific") applies = (t.dates || []).includes(key);

      if(applies){
        if(!upcoming[key]) upcoming[key] = [];
        upcoming[key].push(t.name);
      }
    });
  }

  /* ---------------- RENDER OVERVIEW ---------------- */

  sec.innerHTML = `
    <h2>Overview</h2>

    <!-- TODAY -->
    <div class="card">
      <h3>Today</h3>
      ${todayTasks.length ? todayTasks.map(t => {
        const done = (prog[t.id] || []).includes(today);
        return `
          <label style="${done ? 'text-decoration:line-through;opacity:.7' : ''}">
            <input type="checkbox"
              ${done ? 'checked' : ''}
              onchange="toggleTaskForDate('${t.id}','${today}',this.checked)">
            ${escapeHtml(t.name)}
          </label><br>
        `;
      }).join("") : "No tasks today"}
    </div>

    <!-- UPCOMING -->
    <div class="card">
      <h3>Upcoming (Next 7 Days)</h3>
      ${Object.keys(upcoming).length
        ? Object.entries(upcoming).map(([d, list]) => `
            <div style="margin-bottom:8px">
              <b>${dayLabel(d)}</b>
              <ul style="margin-top:4px">
                ${list.map(n => `<li>${escapeHtml(n)}</li>`).join("")}
              </ul>
            </div>
          `).join("")
        : "No upcoming non-daily tasks"}
    </div>

    <!-- CONSISTENCY GRAPH -->
    <div class="card">
      <h3>Consistency</h3>
      <canvas id="progressCanvas" width="720" height="320"></canvas>
    </div>
  `;

  drawGraph("daily");
}

/* =========================================================
   TASK TOGGLE (UNDO TICK SUPPORTED)
========================================================= */

async function toggleTaskForDate(taskId, dateKey, checked){
  if(checked){
    await markDoneForDate(taskId, dateKey);
  } else {
    await unmarkDoneForDate(taskId, dateKey);
  }
  renderOverview();
}

/* =========================================================
   CONSISTENCY GRAPH
   - Daily (7 days)
   - Weekly (6 weeks)
   - Monthly (6 months)
========================================================= */

async function drawGraph(mode){
  const canvas = document.getElementById("progressCanvas");
  if(!canvas) return;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const tasks = await getTasks();
  const prog  = await getProgress();

  const labels = [];
  const values = [];

  if(mode === "daily"){
    for(let i = 6; i >= 0; i--){
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0,10);

      let denom = 0, numer = 0;

      tasks.forEach(t => {
        let applies = false;
        if(t.freq === "daily") applies = true;
        else if(t.freq === "once") applies = (t.date === key);
        else if(t.freq === "weekly"){
          const idx = (d.getDay() + 6) % 7;
          applies = (t.weekdays || []).includes(idx);
        }
        else if(t.freq === "specific") applies = (t.dates || []).includes(key);

        if(applies){
          denom++;
          if((prog[t.id] || []).includes(key)) numer++;
        }
      });

      labels.push(key.slice(5));
      values.push(denom ? Math.round((numer / denom) * 100) : 0);
    }
  }

  else if(mode === "weekly"){
    for(let w = 5; w >= 0; w--){
      const ref = new Date();
      ref.setDate(ref.getDate() - w * 7);

      let denom = 0, numer = 0;

      for(let i = 0; i < 7; i++){
        const d = new Date(ref);
        d.setDate(ref.getDate() + i);
        const key = d.toISOString().slice(0,10);

        tasks.forEach(t => {
          let applies = false;
          if(t.freq === "once") applies = (t.date === key);
          else if(t.freq === "weekly"){
            const idx = (d.getDay() + 6) % 7;
            applies = (t.weekdays || []).includes(idx);
          }
          else if(t.freq === "specific") applies = (t.dates || []).includes(key);

          if(applies){
            denom++;
            if((prog[t.id] || []).includes(key)) numer++;
          }
        });
      }

      labels.push("W" + getWeekNumber(ref));
      values.push(denom ? Math.round((numer / denom) * 100) : 0);
    }
  }

  else if(mode === "monthly"){
    for(let m = 5; m >= 0; m--){
      const ref = new Date();
      ref.setMonth(ref.getMonth() - m);

      const y = ref.getFullYear();
      const mo = ref.getMonth();
      const daysInMonth = new Date(y, mo + 1, 0).getDate();

      let denom = 0, numer = 0;

      for(let d = 1; d <= daysInMonth; d++){
        const key = new Date(y, mo, d).toISOString().slice(0,10);

        tasks.forEach(t => {
          let applies = false;
          if(t.freq === "once") applies = (t.date === key);
          else if(t.freq === "weekly"){
            const idx = (new Date(key).getDay() + 6) % 7;
            applies = (t.weekdays || []).includes(idx);
          }
          else if(t.freq === "specific") applies = (t.dates || []).includes(key);

          if(applies){
            denom++;
            if((prog[t.id] || []).includes(key)) numer++;
          }
        });
      }

      labels.push(ref.toLocaleString("en", { month: "short" }));
      values.push(denom ? Math.round((numer / denom) * 100) : 0);
    }
  }

  /* ---------------- DRAW BARS ---------------- */

  const W = canvas.width;
  const H = canvas.height;
  const pad = 40;

  ctx.fillStyle = "#00ff88";
  ctx.font = "12px monospace";

  const barW = (W - pad * 2) / values.length - 8;

  values.forEach((v, i) => {
    const x = pad + i * (barW + 8);
    const barH = Math.round((v / 100) * (H - pad * 2));

    ctx.fillRect(x, H - pad - barH, barW, barH || 2);
    ctx.fillText(v + "%", x, H - pad - barH - 6);
    ctx.fillText(labels[i], x, H - 6);
  });
}

/* =========================================================
   WEEK NUMBER HELPER (ISO)
========================================================= */

function getWeekNumber(d){
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  dt.setUTCDate(dt.getUTCDate() + 4 - (dt.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return Math.ceil((((dt - yearStart) / 86400000) + 1) / 7);
}

/* ===================== END OF PART 2 ===================== */
/* =========================================================
   ui.js — STUDENT DASHBOARD
   PART 3 / 4
   ---------------------------------------------------------
   Contents:
   - Academics / Marks
   - Attendance (date-based, multi-class support)
========================================================= */

/* =========================================================
   ACADEMICS / MARKS
========================================================= */

async function renderAcademics(){
  const sec = document.getElementById("academics");
  if(!sec) return;

  const acad = await getAcademics();

  sec.innerHTML = `
    <h2>Marks</h2>

    <div class="card">
      <input id="sub_name" placeholder="Subject name">
      <input id="sub_credit" type="number" placeholder="Credits">
      <button class="btn small" onclick="addSubject()">Add Subject</button>
    </div>

    ${acad.subjects.length
      ? acad.subjects.map(s => renderSubjectCard(s)).join("")
      : `<div class="card">No subjects added yet</div>`
    }
  `;
}

/* ---------- SUBJECT CARD ---------- */

function renderSubjectCard(subject){
  const parts = ["ut1","ut2","ta1","ta2","end"];
  const rows = parts.map(p=>{
    const m = subject.marks?.[p] || {};
    return `
      <div style="margin-bottom:6px">
        <b>${p.toUpperCase()}</b> :
        <input size="3" value="${m.scored ?? ""}"
          onchange="setMark('${subject.id}','${p}',this.value,true)">
        /
        <input size="3" value="${m.outOf ?? ""}"
          onchange="setMark('${subject.id}','${p}',this.value,false)">
      </div>
    `;
  }).join("");

  const total = sumSubject(subject);

  return `
    <div class="card">
      <div style="display:flex;justify-content:space-between">
        <b>${escapeHtml(subject.name)}</b>
        <button class="btn tiny" onclick="deleteSubject('${subject.id}')">
          Delete
        </button>
      </div>

      <div style="opacity:.7">${subject.credits} credits</div>

      <div style="margin-top:8px">${rows}</div>

      <div style="margin-top:8px">
        <b>Total:</b> ${total.scored} / ${total.outOf}
      </div>
    </div>
  `;
}

/* ---------- ADD / DELETE SUBJECT ---------- */

async function addSubject(){
  const n = document.getElementById("sub_name");
  const c = document.getElementById("sub_credit");
  if(!n.value.trim() || !c.value) return;

  const acad = await getAcademics();
  acad.subjects.push({
    id: uid(),
    name: n.value.trim(),
    credits: Number(c.value),
    marks: {}
  });

  await saveAcademics(acad);
  renderAcademics();
}

async function deleteSubject(id){
  if(!confirm("Delete subject permanently?")) return;

  const acad = await getAcademics();
  acad.subjects = acad.subjects.filter(s=>s.id!==id);
  await saveAcademics(acad);

  const att = await getAttendance();
  delete att[id];
  await saveAttendance(att);

  renderAcademics();
}

/* ---------- MARKS HELPERS ---------- */

async function setMark(id, part, val, isScored){
  const acad = await getAcademics();
  const s = acad.subjects.find(x=>x.id===id);
  if(!s) return;

  s.marks[part] ??= {};
  if(isScored) s.marks[part].scored = Number(val)||0;
  else s.marks[part].outOf = Number(val)||0;

  await saveAcademics(acad);
}

function sumSubject(s){
  let scored=0,outOf=0;
  Object.values(s.marks||{}).forEach(m=>{
    scored += Number(m.scored)||0;
    outOf  += Number(m.outOf)||0;
  });
  return {scored,outOf};
}

/* =========================================================
   ATTENDANCE
   - Date selectable
   - Multiple classes per day supported
========================================================= */

async function renderAttendance(){
  const sec = document.getElementById("attendance");
  if(!sec) return;

  const acad = await getAcademics();
  const att  = await getAttendance();

  let overallP = 0, overallT = 0;

  sec.innerHTML = `
    <h2>Attendance</h2>
    <div class="card">
      <label>Select Date:</label>
      <input type="date" id="att_date" value="${todayKey()}">
    </div>
  `;

  acad.subjects.forEach(s=>{
    const hist = att[s.id] || {};
    let p=0,t=0;

    Object.values(hist).forEach(v=>{
      p += v.present || 0;
      t += (v.present||0) + (v.absent||0);
    });

    overallP += p;
    overallT += t;

    const pct = t ? Math.round(p/t*100) : 0;
    const col = pct>=75 ? "#00ff88" : "#ff5555";

    sec.innerHTML += `
      <div class="card">
        <div style="display:flex;justify-content:space-between">
          <b>${escapeHtml(s.name)}</b>
          <span style="color:${col}">${pct}%</span>
        </div>

        <div style="margin-top:6px">
          <button class="btn tiny"
            onclick="markAttendance('${s.id}','present')">
            + Present
          </button>
          <button class="btn tiny"
            onclick="markAttendance('${s.id}','absent')">
            + Absent
          </button>
        </div>

        <div style="margin-top:6px;opacity:.8">
          ${renderAttendanceHistory(s.id, hist)}
        </div>
      </div>
    `;
  });

  const op = overallT ? Math.round(overallP/overallT*100) : 0;
  sec.innerHTML += `
    <div class="card">
      <b>Overall Attendance:</b>
      <span style="color:${op>=75?'#00ff88':'#ff5555'}">${op}%</span>
    </div>
  `;
}

/* ---------- MARK ATTENDANCE ---------- */

async function markAttendance(subjectId, type){
  const att = await getAttendance();
  const date =
    document.getElementById("att_date")?.value || todayKey();

  att[subjectId] ??= {};
  att[subjectId][date] ??= { present:0, absent:0 };

  if(type==="present") att[subjectId][date].present++;
  if(type==="absent")  att[subjectId][date].absent++;

  await saveAttendance(att);
  renderAttendance();
}

/* ---------- ATTENDANCE HISTORY ---------- */

function renderAttendanceHistory(subjectId, history){
  const entries = Object.entries(history);
  if(!entries.length) return "No records";

  return entries
    .sort((a,b)=>a[0].localeCompare(b[0]))
    .map(([d,v])=>{
      const total = (v.present||0)+(v.absent||0);
      return `
        <div>
          ${d} → ${v.present||0}/${total}
        </div>
      `;
    }).join("");
}

/* ===================== END OF PART 3 ===================== */
/* =========================================================
   ui.js — STUDENT DASHBOARD
   PART 4 / 4
   ---------------------------------------------------------
   Contents:
   - Timetable (subjects from Academics)
   - Events
   - Exams
   - PDF Viewer
   - Init / Bootstrapping
========================================================= */

/* =========================================================
   TIMETABLE
   - Subject dropdown fixed from Academics
   - Add / remove classes
========================================================= */

async function renderTimetable(){
  const sec = document.getElementById("timetable");
  if(!sec) return;

  const acad = await getAcademics();
  const tt   = await getTimetable();

  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ];

  sec.innerHTML = `<h2>Timetable</h2>`;

  days.forEach(day => {
    const list = tt[day] || [];

    const subjectOptions = acad.subjects.length
      ? acad.subjects.map(s =>
          `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`
        ).join("")
      : `<option disabled>No subjects</option>`;

    sec.innerHTML += `
      <div class="card">
        <strong>${day}</strong>

        <div style="margin-top:8px">
          <input id="${day}_time" placeholder="Time (9-10)">
          <select id="${day}_sub">
            ${subjectOptions}
          </select>
          <input id="${day}_room" placeholder="Room">
          <button class="btn small" onclick="addClass('${day}')">Add</button>
        </div>

        <div style="margin-top:10px">
          ${list.length
            ? list.map((c, i) => `
                <div class="list-row">
                  <span>
                    ${escapeHtml(c.time)} ·
                    ${escapeHtml(c.subject)} ·
                    ${escapeHtml(c.room || "")}
                  </span>
                  <button class="btn tiny"
                    onclick="removeClass('${day}', ${i})">
                    Del
                  </button>
                </div>
              `).join("")
            : `<div style="opacity:.7">No classes</div>`
          }
        </div>
      </div>
    `;
  });
}

async function addClass(day){
  const timeEl = document.getElementById(day + "_time");
  const subEl  = document.getElementById(day + "_sub");
  const roomEl = document.getElementById(day + "_room");

  if(!timeEl || !subEl) return;
  if(!timeEl.value || !subEl.value) return;

  const tt = await getTimetable();
  tt[day] ??= [];

  tt[day].push({
    time: timeEl.value,
    subject: subEl.value,
    room: roomEl ? roomEl.value : ""
  });

  await saveTimetable(tt);
  renderTimetable();
}

async function removeClass(day, index){
  const tt = await getTimetable();
  if(!tt[day]) return;

  tt[day].splice(index, 1);
  await saveTimetable(tt);
  renderTimetable();
}

/* =========================================================
   EVENTS
========================================================= */

async function renderEvents(){
  const sec = document.getElementById("events");
  if(!sec) return;

  const events = await getEvents();

  sec.innerHTML = `
    <h2>Events</h2>

    <div class="card">
      <input id="ev_name" placeholder="Event name">
      <input id="ev_date" type="date">
      <button class="btn small" onclick="addEvent()">Add Event</button>
    </div>

    <div class="card">
      ${events.length
        ? events.map((e, i) => `
            <div class="list-row">
              <span>
                ${escapeHtml(e.date)} · ${escapeHtml(e.name)}
              </span>
              <button class="btn tiny"
                onclick="removeEvent(${i})">
                Del
              </button>
            </div>
          `).join("")
        : "No events added"
      }
    </div>
  `;
}

async function addEvent(){
  const nameEl = document.getElementById("ev_name");
  const dateEl = document.getElementById("ev_date");

  if(!nameEl || !dateEl) return;
  if(!nameEl.value.trim() || !dateEl.value) return;

  const events = await getEvents();
  events.push({
    name: nameEl.value.trim(),
    date: dateEl.value
  });

  await saveEvents(events);
  renderEvents();
}

async function removeEvent(index){
  const events = await getEvents();
  events.splice(index, 1);
  await saveEvents(events);
  renderEvents();
}

/* =========================================================
   EXAMS
========================================================= */

async function renderExams(){
  const sec = document.getElementById("exams");
  if(!sec) return;

  const exams = await getExams();

  sec.innerHTML = `
    <h2>Exams</h2>

    <div class="card">
      <input id="ex_sub" placeholder="Subject">
      <input id="ex_date" type="date">
      <input id="ex_time" placeholder="Time">
      <input id="ex_venue" placeholder="Venue">
      <button class="btn small" onclick="addExam()">Add Exam</button>
    </div>

    <div class="card">
      ${exams.length
        ? exams.map((x, i) => `
            <div class="list-row">
              <span>
                ${escapeHtml(x.date)} ·
                ${escapeHtml(x.subject)} ·
                ${escapeHtml(x.time || "")} ·
                ${escapeHtml(x.venue || "")}
              </span>
              <button class="btn tiny"
                onclick="removeExam(${i})">
                Del
              </button>
            </div>
          `).join("")
        : "No exams added"
      }
    </div>
  `;
}

async function addExam(){
  const subEl   = document.getElementById("ex_sub");
  const dateEl  = document.getElementById("ex_date");
  const timeEl  = document.getElementById("ex_time");
  const venueEl = document.getElementById("ex_venue");

  if(!subEl || !dateEl) return;
  if(!subEl.value.trim() || !dateEl.value) return;

  const exams = await getExams();

  exams.push({
    subject: subEl.value.trim(),
    date: dateEl.value,
    time: timeEl ? timeEl.value : "",
    venue: venueEl ? venueEl.value : ""
  });

  await saveExams(exams);
  renderExams();
}

async function removeExam(index){
  const exams = await getExams();
  exams.splice(index, 1);
  await saveExams(exams);
  renderExams();
}

/* =========================================================
   PDF VIEWER
========================================================= */

function openPdfViewer(){
  const frame = document.getElementById("pdfFrame");
  const modal = document.getElementById("pdfModal");
  if(!frame || !modal) return;

  frame.src = "assets/4th-sem-calendar.pdf";
  modal.classList.remove("hidden");
}

function closePdfViewer(){
  const frame = document.getElementById("pdfFrame");
  const modal = document.getElementById("pdfModal");
  if(!frame || !modal) return;

  frame.src = "";
  modal.classList.add("hidden");
}

/* =========================================================
   INIT / BOOTSTRAP
========================================================= */

(async function init(){
  const u = localStorage.getItem("user");

  if(u){
    const auth = document.getElementById("auth-screen");
    const dash = document.getElementById("dashboard");
    const top  = document.getElementById("topbar");
    const name = document.getElementById("user-name");

    if(auth) auth.classList.add("hidden");
    if(dash) dash.classList.remove("hidden");
    if(top)  top.classList.remove("hidden");
    if(name) name.innerText = u;

    /* default landing */
    renderHome();
  }
})();

/* ===================== END OF PART 4 ===================== */
