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
   - Academics (5-Slot Marks + Subject Totals)
   - Attendance (Detailed Stats + Month Navigation)
========================================================= */

window.attViewDate = window.attViewDate || {};

/* ===================== ACADEMICS (MARKS) ===================== */

async function renderAcademics() {
  const sec = document.getElementById("academics");
  if (!sec) return;

  const acad = await getAcademics() || { subjects: [] };
  const subjects = acad.subjects || [];

  sec.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px">
       <h2>Marks</h2>
       <button class="btn small" onclick="toggleAddSubject()">+ Add Subject</button>
    </div>

    <div class="card" style="margin-bottom:20px; display:none" id="add_sub_input">
      <input id="new_sub_name" placeholder="Subject Name" style="width:70%">
      <button class="btn small" onclick="saveSubject()">Save</button>
    </div>

    <div id="subjects_list"></div>
  `;

  const list = document.getElementById("subjects_list");
  
  subjects.forEach((s, idx) => {
    // FIX: Ensure scores structure exists for old or new subjects
    if (!s.scores) {
      s.scores = {
        ut1: { m: 0, t: 0 }, ut2: { m: 0, t: 0 },
        ta1: { m: 0, t: 0 }, ta2: { m: 0, t: 0 },
        end: { m: 0, t: 0 }
      };
    }

    let subObt = 0;
    let subMax = 0;
    const slots = [
      { key: 'ut1', label: 'UT 1' }, 
      { key: 'ut2', label: 'UT 2' }, 
      { key: 'ta1', label: 'TA 1' }, 
      { key: 'ta2', label: 'TA 2' }, 
      { key: 'end', label: 'End Sem' }
    ];

    let slotsHtml = slots.map(slot => {
      const obt = parseFloat(s.scores[slot.key].m) || 0;
      const tot = parseFloat(s.scores[slot.key].t) || 0;
      subObt += obt;
      subMax += tot;
      
      return `
        <div style="display:grid; grid-template-columns: 1fr 1.2fr 1.2fr; gap:8px; align-items:center; margin-bottom:6px">
          <span style="font-size:12px; opacity:0.8">${slot.label}</span>
          <input type="number" placeholder="Obt" value="${obt}" 
            onchange="updateDetailedMarks(${idx}, '${slot.key}', 'm', this.value)">
          <input type="number" placeholder="Total" value="${tot}" 
            onchange="updateDetailedMarks(${idx}, '${slot.key}', 't', this.value)">
        </div>
      `;
    }).join('');

    const subPct = subMax > 0 ? Math.round((subObt / subMax) * 100) : 0;

    list.innerHTML += `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid rgba(0,255,136,0.1); padding-bottom:8px">
          <strong>${escapeHtml(s.name)}</strong>
          <div style="text-align:right">
            <span style="font-weight:bold; color:#00ff88; font-size:18px">${subPct}%</span>
            <button class="btn tiny" onclick="deleteSubject(${idx})" style="margin-left:10px; color:#ff5555">Del</button>
          </div>
        </div>
        
        ${slotsHtml}
        
        <div style="margin-top:10px; padding-top:8px; border-top:1px dashed rgba(255,255,255,0.1); display:flex; justify-content:space-between; align-items:center">
          <span style="font-size:11px; opacity:0.6; text-transform:uppercase">Subject Total</span>
          <span style="font-weight:bold; font-size:14px; color:#00ff88">${subObt} / ${subMax}</span>
        </div>
      </div>
    `;
  });
}

function toggleAddSubject() {
  const div = document.getElementById("add_sub_input");
  div.style.display = div.style.display === "none" ? "block" : "none";
}

async function saveSubject() {
  const inp = document.getElementById("new_sub_name");
  if (!inp || !inp.value.trim()) return;
  const acad = await getAcademics();
  acad.subjects = acad.subjects || [];
  acad.subjects.push({ 
    id: uid(), 
    name: inp.value.trim(), 
    scores: {
      ut1: { m:0, t:0 }, ut2: { m:0, t:0 },
      ta1: { m:0, t:0 }, ta2: { m:0, t:0 },
      end: { m:0, t:0 }
    }
  });
  await saveAcademics(acad);
  renderAcademics();
}

async function updateDetailedMarks(subIdx, slotKey, field, val) {
  const acad = await getAcademics();
  if (acad.subjects[subIdx]) {
    acad.subjects[subIdx].scores[slotKey][field] = parseFloat(val) || 0;
    await saveAcademics(acad);
    renderAcademics();
  }
}

async function deleteSubject(idx) {
  if (!confirm("Delete subject?")) return;
  const acad = await getAcademics();
  acad.subjects.splice(idx, 1);
  await saveAcademics(acad);
  renderAcademics();
}

/* ===================== ATTENDANCE ===================== */

async function renderAttendance() {
  const sec = document.getElementById("attendance");
  if (!sec) return;

  try {
    const acad = await getAcademics() || { subjects: [] };
    const att = await getAttendance() || {};
    const subjects = acad.subjects || [];

    let overallP = 0, overallT = 0;
    subjects.forEach(s => {
      const hist = att[s.id] || {};
      Object.values(hist).forEach(entries => {
        if (Array.isArray(entries)) {
          entries.forEach(e => {
            if (e.status === "present") { overallP++; overallT++; }
            if (e.status === "absent") { overallT++; }
          });
        }
      });
    });

    const overallPct = overallT > 0 ? Math.round((overallP / overallT) * 100) : 0;

    let html = `
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:15px">
        <h2 style="margin:0">Attendance</h2>
        <div style="text-align:right">
          <div style="font-size:18px; font-weight:bold; color:#00ff88">${overallPct}%</div>
          <div style="font-size:11px; opacity:0.6">Total: ${overallP}/${overallT}</div>
        </div>
      </div>
    `;

    if (subjects.length === 0) {
      html += `<div class="card">Add subjects in Marks tab first.</div>`;
    } else {
      subjects.forEach(s => {
        const hist = att[s.id] || {};
        let p = 0, t = 0;
        Object.values(hist).forEach(arr => {
          if (Array.isArray(arr)) {
            arr.forEach(v => {
              if (v.status === "present") { p++; t++; }
              if (v.status === "absent") { t++; }
            });
          }
        });
        const pct = t ? Math.round((p / t) * 100) : 0;

        html += `
          <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div style="font-weight:bold">${escapeHtml(s.name)}</div>
                <div style="font-size:11px; opacity:0.7">${p}/${t} Classes</div>
              </div>
              <div style="display:flex; align-items:center; gap:12px">
                <span style="font-weight:bold; font-size:18px; color:${pct>=75?'#00ff88':'#ff5555'}">${pct}%</span>
                <button class="btn tiny" onclick="toggleAttendanceAdder('${s.id}')">+</button>
                <button class="btn tiny" onclick="toggleAttendanceCalendar('${s.id}')">📅</button>
              </div>
            </div>

            <div id="add_area_${s.id}" style="display:none; margin-top:12px; border-top:1px solid rgba(255,255,255,0.1); padding-top:10px;">
               <input type="date" id="date_inp_${s.id}" value="${todayKey()}" style="width:100%; margin-bottom:8px">
               <div style="display:flex; gap:5px;">
                  <button class="btn tiny" style="flex:1; background:#004422" onclick="quickAdd('${s.id}','present')">Present</button>
                  <button class="btn tiny" style="flex:1; background:#441111" onclick="quickAdd('${s.id}','absent')">Absent</button>
                  <button class="btn tiny" style="flex:1; background:#444411" onclick="quickAdd('${s.id}','noclass')">No Class</button>
               </div>
            </div>

            <div id="cal_wrap_${s.id}" style="display:none; margin-top:12px;"></div>
          </div>
        `;
      });
    }
    sec.innerHTML = html;
  } catch (err) {
    sec.innerHTML = `<h2>Attendance</h2><div class="card">Error: ${err.message}</div>`;
  }
}

/* ===================== LOGIC HELPERS ===================== */

function toggleAttendanceAdder(subjectId) {
  const el = document.getElementById("add_area_" + subjectId);
  if (el) el.style.display = (el.style.display === "none") ? "block" : "none";
}

async function quickAdd(subjectId, status) {
  const dateVal = document.getElementById("date_inp_" + subjectId).value || todayKey();
  const att = await getAttendance();
  att[subjectId] = att[subjectId] || {};
  att[subjectId][dateVal] = att[subjectId][dateVal] || [];
  att[subjectId][dateVal].push({ status });
  await saveAttendance(att);
  renderAttendance();
}

async function toggleAttendanceCalendar(subjectId) {
  const wrap = document.getElementById("cal_wrap_" + subjectId);
  if (!wrap) return;
  if (wrap.style.display === "none") {
    if (!window.attViewDate[subjectId]) window.attViewDate[subjectId] = new Date();
    wrap.style.display = "block";
    await refreshCalendarView(subjectId);
  } else { wrap.style.display = "none"; }
}

async function changeMonth(subjectId, offset) {
  const d = window.attViewDate[subjectId];
  d.setMonth(d.getMonth() + offset);
  await refreshCalendarView(subjectId);
}

async function refreshCalendarView(subjectId) {
  const wrap = document.getElementById("cal_wrap_" + subjectId);
  const att = await getAttendance();
  const hist = att[subjectId] || {};
  const viewDate = window.attViewDate[subjectId];
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let html = `
    <div style="background:rgba(0,0,0,0.3); padding:10px; border-radius:8px">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
        <button class="btn tiny" onclick="changeMonth('${subjectId}', -1)">◀</button>
        <strong style="font-size:13px">${viewDate.toLocaleString('default', { month: 'short' })} ${year}</strong>
        <button class="btn tiny" onclick="changeMonth('${subjectId}', 1)">▶</button>
      </div>
      <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:3px; text-align:center">
        ${['S','M','T','W','T','F','S'].map(d => `<div style="font-size:9px; opacity:0.4">${d}</div>`).join('')}
        ${Array(firstDay).fill(0).map(() => `<div></div>`).join('')}
        ${Array.from({length: daysInMonth}, (_, i) => {
          const day = i + 1;
          const key = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const dots = (hist[key] || []).map((v, idx) => {
            const col = v.status === "present" ? "#00ff88" : v.status === "absent" ? "#ff4444" : "#ffcc00";
            return `<span style="color:${col}; cursor:pointer" onclick="editAttendanceEntry('${subjectId}','${key}',${idx})">●</span>`;
          }).join("");
          return `<div style="font-size:10px; padding:4px; border:1px solid rgba(255,255,255,0.05)">${day}<br>${dots || '·'}</div>`;
        }).join('')}
      </div>
    </div>
  `;
  wrap.innerHTML = html;
}

function editAttendanceEntry(subjectId, date, index) {
  const choice = prompt("Action: present / absent / noclass / delete");
  if (!choice) return;
  const c = choice.toLowerCase();
  if (c === "delete") deleteAttendanceEntry(subjectId, date, index);
  else if (["present", "absent", "noclass"].includes(c)) updateAttendanceEntry(subjectId, date, index, c);
}

async function updateAttendanceEntry(subjectId, date, index, status) {
  const att = await getAttendance();
  if (att[subjectId]?.[date]?.[index]) {
    att[subjectId][date][index].status = status;
    await saveAttendance(att);
    await refreshCalendarView(subjectId);
    renderAttendance();
  }
}

async function deleteAttendanceEntry(subjectId, date, index) {
  const att = await getAttendance();
  if (att[subjectId]?.[date]) {
    att[subjectId][date].splice(index, 1);
    if (att[subjectId][date].length === 0) delete att[subjectId][date];
    await saveAttendance(att);
    await refreshCalendarView(subjectId);
    renderAttendance();
  }
}
/* =========================================================
   ui.js — STUDENT DASHBOARD
   PART 4 / 4
   ---------------------------------------------------------
   Updates:
   - Fixed Timetable to work with 5-slot Marks structure
   - Simplified Init script
========================================================= */

/* ===================== TIMETABLE ===================== */

async function renderTimetable() {
  const sec = document.getElementById("timetable");
  if (!sec) return;

  const acad = await getAcademics() || { subjects: [] };
  const tt = await getTimetable() || {};
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  let html = `<h2>Weekly Timetable</h2>`;

  days.forEach(day => {
    const classes = tt[day] || [];
    // Corrected to pull names from the updated academics structure
    const subOptions = acad.subjects.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join("");

    html += `
      <div class="card">
        <strong style="color:#00ff88">${day}</strong>
        <div style="margin-top:10px; display:flex; gap:5px; flex-wrap:wrap">
          <input id="${day}_time" placeholder="Time" style="width:80px">
          <select id="${day}_sub" style="flex:1">
            ${subOptions || '<option disabled>Add Subjects in Marks first</option>'}
          </select>
          <input id="${day}_room" placeholder="Room" style="width:70px">
          <button class="btn tiny" onclick="addClass('${day}')">Add</button>
        </div>
        <div style="margin-top:10px">
          ${classes.map((c, i) => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid rgba(255,255,255,0.05)">
              <span><b>${c.time}</b> | ${c.subject} <small style="opacity:0.6">(${c.room || 'N/A'})</small></span>
              <button class="btn tiny" onclick="removeClass('${day}', ${i})" style="color:#ff4444; border:none; background:none">✕</button>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  });
  sec.innerHTML = html;
}

async function addClass(day) {
  const timeInp = document.getElementById(day + "_time");
  const subInp = document.getElementById(day + "_sub");
  const roomInp = document.getElementById(day + "_room");

  if (!timeInp.value || !subInp.value) return;

  const tt = await getTimetable();
  tt[day] = tt[day] || [];
  tt[day].push({ 
    time: timeInp.value, 
    subject: subInp.value, 
    room: roomInp.value || "" 
  });
  
  await saveTimetable(tt);
  renderTimetable();
}

async function removeClass(day, index) {
  const tt = await getTimetable();
  if (tt[day]) {
    tt[day].splice(index, 1);
    await saveTimetable(tt);
    renderTimetable();
  }
}

/* ===================== EVENTS & EXAMS ===================== */

async function renderEvents() {
  const sec = document.getElementById("events");
  const events = await getEvents() || [];
  sec.innerHTML = `
    <h2>Events</h2>
    <div class="card">
      <input id="ev_name" placeholder="Event Name">
      <input id="ev_date" type="date">
      <button class="btn small" onclick="addEvent()">Add Event</button>
    </div>
    ${events.map((e, i) => `
      <div class="card" style="display:flex; justify-content:space-between">
        <span>${e.date} — <b>${escapeHtml(e.name)}</b></span>
        <button class="btn tiny" onclick="deleteEvent(${i})">✕</button>
      </div>
    `).join("")}
  `;
}

async function renderExams() {
  const sec = document.getElementById("exams");
  const exams = await getExams() || [];
  sec.innerHTML = `
    <h2>Exams</h2>
    <div class="card">
      <input id="ex_sub" placeholder="Subject">
      <input id="ex_date" type="date">
      <button class="btn small" onclick="addExam()">Add Exam</button>
    </div>
    ${exams.map((e, i) => `
      <div class="card" style="display:flex; justify-content:space-between">
        <span>${e.date} — <b>${escapeHtml(e.subject)}</b></span>
        <button class="btn tiny" onclick="deleteExam(${i})">✕</button>
      </div>
    `).join("")}
  `;
}

/* ===================== PDF & INIT ===================== */

function openPdfViewer() {
  const modal = document.getElementById("pdfModal");
  const frame = document.getElementById("pdfFrame");
  frame.src = "assets/4th-sem-calendar.pdf";
  modal.classList.remove("hidden");
}

function closePdfViewer() {
  document.getElementById("pdfModal").classList.add("hidden");
}

// BOOTSTRAP: Start the App
(async function init() {
  const user = localStorage.getItem("user");
  if (user) {
    document.getElementById("auth-screen").classList.add("hidden");
    document.getElementById("topbar").classList.remove("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
    document.getElementById("user-name").innerText = user;
    renderHome(); 
  }
})();
