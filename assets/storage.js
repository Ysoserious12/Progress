/* =========================================================
   storage.js — JSONBin Backend
   ---------------------------------------------------------
   Supports:
   - Tasks
   - Progress
   - Streaks
   - Timetable
   - Events
   - Exams
   - Academics (subjects + marks)
   - Attendance (multi-class/day)
========================================================= */

const JSONBIN_ID  = "69464986ae596e708fa661f4";
const JSONBIN_KEY = "$2a$10$nMhvA7mYfVFSa8bpXrtCdOId920LmUbsmiw4BgcC1tVtTFoNLuA2K";
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_ID}`;

let _cache = null;

/* ===================== CORE ===================== */

function currentUser(){
  return localStorage.getItem("user");
}

async function fetchBin(){
  if(_cache) return _cache;
  const res = await fetch(JSONBIN_URL,{
    headers:{ "X-Master-Key": JSONBIN_KEY }
  });
  const j = await res.json();
  _cache = j.record || {};
  return _cache;
}

async function saveBin(data){
  _cache = data;
  await fetch(JSONBIN_URL,{
    method:"PUT",
    headers:{
      "Content-Type":"application/json",
      "X-Master-Key":JSONBIN_KEY
    },
    body:JSON.stringify(data)
  });
}

/* ===================== USER STRUCTURE ===================== */

async function ensureUserStructure(){
  const data = await fetchBin();
  const u = currentUser();
  if(!u) return data;

  if(!data[u]){
    data[u] = {
      tasks: [],
      progress: {},
      streaks: [],
      timetable: {},
      events: [],
      exams: [],
      attendance: {},
      academics: { subjects: [] }
    };
    await saveBin(data);
  }

  /* backward compatibility */
  data[u].tasks      ??= [];
  data[u].progress   ??= {};
  data[u].streaks    ??= [];
  data[u].timetable  ??= {};
  data[u].events     ??= [];
  data[u].exams      ??= [];
  data[u].attendance ??= {};
  data[u].academics  ??= { subjects: [] };

  await saveBin(data);
  return data;
}

/* ===================== TASKS ===================== */

async function getTasks(){
  const d = await ensureUserStructure();
  return d[currentUser()].tasks;
}

async function saveTasks(t){
  const d = await ensureUserStructure();
  d[currentUser()].tasks = t;
  await saveBin(d);
}

/* ===================== PROGRESS ===================== */

async function getProgress(){
  const d = await ensureUserStructure();
  return d[currentUser()].progress;
}

async function saveProgress(p){
  const d = await ensureUserStructure();
  d[currentUser()].progress = p;
  await saveBin(d);
}

async function markDoneForDate(taskId, date){
  const p = await getProgress();
  p[taskId] ??= [];
  if(!p[taskId].includes(date)) p[taskId].push(date);
  await saveProgress(p);
}

async function unmarkDoneForDate(taskId, date){
  const p = await getProgress();
  if(!p[taskId]) return;
  p[taskId] = p[taskId].filter(d=>d!==date);
  await saveProgress(p);
}

/* ===================== STREAKS ===================== */

async function getStreaks(){
  const d = await ensureUserStructure();
  return d[currentUser()].streaks;
}

async function saveStreaks(s){
  const d = await ensureUserStructure();
  d[currentUser()].streaks = s;
  await saveBin(d);
}

/* ===================== TIMETABLE ===================== */

async function getTimetable(){
  const d = await ensureUserStructure();
  return d[currentUser()].timetable;
}

async function saveTimetable(t){
  const d = await ensureUserStructure();
  d[currentUser()].timetable = t;
  await saveBin(d);
}

/* ===================== EVENTS ===================== */

async function getEvents(){
  const d = await ensureUserStructure();
  return d[currentUser()].events;
}

async function saveEvents(e){
  const d = await ensureUserStructure();
  d[currentUser()].events = e;
  await saveBin(d);
}

/* ===================== EXAMS ===================== */

async function getExams(){
  const d = await ensureUserStructure();
  return d[currentUser()].exams;
}

async function saveExams(e){
  const d = await ensureUserStructure();
  d[currentUser()].exams = e;
  await saveBin(d);
}

/* ===================== ACADEMICS ===================== */

async function getAcademics(){
  const d = await ensureUserStructure();
  return d[currentUser()].academics;
}

async function saveAcademics(a){
  const d = await ensureUserStructure();
  d[currentUser()].academics = a;
  await saveBin(d);
}

/* ===================== ATTENDANCE ===================== */
/*
attendance = {
  subjectId: {
    "YYYY-MM-DD": [
      { status: "present" },
      { status: "absent" },
      { status: "noclass" }
    ]
  }
}
*/

async function getAttendance(){
  const d = await ensureUserStructure();
  return d[currentUser()].attendance;
}

async function saveAttendance(a){
  const d = await ensureUserStructure();
  d[currentUser()].attendance = a;
  await saveBin(d);
}

/* ===================== UTIL ===================== */

function todayKey(){
  return new Date().toISOString().slice(0,10);
}

function uid(){
  return "u" + Math.random().toString(36).slice(2,9);
}
