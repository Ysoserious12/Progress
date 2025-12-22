const JSONBIN_ID="69464986ae596e708fa661f4";
const JSONBIN_KEY="$2a$10$nMhvA7mYfVFSa8bpXrtCdOId920LmUbsmiw4BgcC1tVtTFoNLuA2K";
const JSONBIN_URL=`https://api.jsonbin.io/v3/b/${JSONBIN_ID}`;

let _cache=null;
function currentUser(){return localStorage.getItem("user");}

async function fetchBin(){
  if(_cache) return _cache;
  const r=await fetch(JSONBIN_URL,{headers:{"X-Master-Key":JSONBIN_KEY}});
  const j=await r.json(); _cache=j.record; return _cache;
}
async function saveBin(d){
  _cache=d;
  await fetch(JSONBIN_URL,{method:"PUT",headers:{
    "Content-Type":"application/json","X-Master-Key":JSONBIN_KEY},
    body:JSON.stringify(d)});
}

async function ensureUserStructure(){
  const d=await fetchBin();
  if(!d[currentUser()]){
    d[currentUser()]={tasks:[],progress:{},streaks:[],timetable:{},events:[],exams:[],
      academics:{subjects:[]},attendance:{}};
    await saveBin(d);
  }
  return d;
}

async function getTasks(){return (await ensureUserStructure())[currentUser()].tasks;}
async function saveTasks(t){const d=await ensureUserStructure();d[currentUser()].tasks=t;await saveBin(d);}
async function getProgress(){return (await ensureUserStructure())[currentUser()].progress;}
async function saveProgress(p){const d=await ensureUserStructure();d[currentUser()].progress=p;await saveBin(d);}
async function markDoneForDate(id,d){const p=await getProgress();p[id]=p[id]||[];if(!p[id].includes(d))p[id].push(d);await saveProgress(p);}
async function unmarkDoneForDate(id,d){const p=await getProgress();if(p[id])p[id]=p[id].filter(x=>x!==d);await saveProgress(p);}
async function getTimetable(){return (await ensureUserStructure())[currentUser()].timetable;}
async function saveTimetable(t){const d=await ensureUserStructure();d[currentUser()].timetable=t;await saveBin(d);}
async function getEvents(){return (await ensureUserStructure())[currentUser()].events;}
async function saveEvents(e){const d=await ensureUserStructure();d[currentUser()].events=e;await saveBin(d);}
async function getExams(){return (await ensureUserStructure())[currentUser()].exams;}
async function saveExams(e){const d=await ensureUserStructure();d[currentUser()].exams=e;await saveBin(d);}

async function getAcademics(){return (await ensureUserStructure())[currentUser()].academics;}
async function saveAcademics(a){const d=await ensureUserStructure();d[currentUser()].academics=a;await saveBin(d);}
async function getAttendance(){return (await ensureUserStructure())[currentUser()].attendance;}
async function saveAttendance(a){const d=await ensureUserStructure();d[currentUser()].attendance=a;await saveBin(d);}

function todayKey(){return new Date().toISOString().slice(0,10);}
function uid(){return "x"+Math.random().toString(36).slice(2,9);}
