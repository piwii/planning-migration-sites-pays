const DATA = window.PLANNING;
const STEPS = ["BDD → préprod","Migration IA + contrôle","Correction des pages","Contrôle SEO","BDD → prod"];
const PEOPLE = {
  "Pierre-Yves":"--p-py","Inès":"--p-ines","Sophia":"--p-sophia","Denice":"--p-denice",
  "Chmouel":"--p-chmouel","Galadrièle":"--p-gala","Eva":"--p-eva"
};
const owner = (site, i) => i===0||i===4 ? "Pierre-Yves" : i===1 ? "Inès" : i===3 ? "Chmouel" : site.c;
const fmt = iso => { const [y,m,d] = iso.split("-"); return d+"/"+m; };
const fmtLong = iso => new Date(iso+"T12:00:00").toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});
const pad = n => String(n).padStart(2,"0");
const now = new Date();
const TODAY = now.getFullYear()+"-"+pad(now.getMonth()+1)+"-"+pad(now.getDate());
const jiraUrl = s => "https://bynativ.atlassian.net/issues?jql=" + encodeURIComponent('project = MGDSP AND labels = "'+s.l+'" ORDER BY key ASC');
const esc = t => t.replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

// Releases
const FIRST4 = DATA.slice(0,4);
const releases = {};
DATA.slice(4).forEach(s => { (releases[s.d[4]] ||= []).push(s); });
const relDates = Object.keys(releases).sort();

// Faits clés
const lastDate = DATA.map(s=>s.d[4]).sort().pop();
document.getElementById("facts").innerHTML = [
  [DATA.length,"sites à migrer"],
  [DATA.length*5,"tickets Jira"],
  [relDates.length,"mises en prod groupées"],
  [fmt(DATA[0].d[0])+" → "+fmt(lastDate),"durée du projet"]
].map(([b,s])=>`<div><b>${b}</b><span>${s}</span></div>`).join("");

// Aujourd'hui (ou prochain jour avec des tâches)
const allDays = [...new Set(DATA.flatMap(s=>s.d))].sort();
const focus = allDays.find(d => d >= TODAY);
const todayEl = document.getElementById("today");
if (!focus) {
  document.getElementById("today-label").textContent = "Planning terminé";
  todayEl.innerHTML = '<p class="empty">Toutes les étapes du planning sont passées.</p>';
} else {
  document.getElementById("today-label").textContent = (focus===TODAY ? "" : "Prochaine journée de travail : ") + fmtLong(focus);
  const tasks = [];
  DATA.forEach(s => s.d.forEach((d,i) => { if (d===focus) tasks.push({who:owner(s,i), what:STEPS[i], site:s.s}); }));
  const byWho = {};
  tasks.forEach(t => (byWho[t.who] ||= []).push(t));
  todayEl.innerHTML = Object.entries(byWho).map(([who,ts]) => `
    <div class="task"><span class="who"><i class="dot" style="--c:var(${PEOPLE[who]})"></i>${who}</span>
    ${ts.map(t=>`<span class="what">${esc(t.site)} · ${t.what}</span>`).join("")}</div>`).join("");
}

// Frise des releases
let relFilter = null;
const rail = document.getElementById("rail");
function relCard(key, label, date, sites, extra){
  const done = (date || FIRST4[3].d[4]) < TODAY;
  return `<button class="rel${done?" done":""}" data-rel="${key}" aria-pressed="false">
    <span class="k">${label}</span>
    <span class="d">${date ? fmt(date) : fmt(FIRST4[0].d[4])+" → "+fmt(FIRST4[3].d[4])}</span>
    <span class="n">${sites.length} site${sites.length>1?"s":""}${done?" · passée":""}</span>
    ${extra||""}
    <span class="sites">${sites.map(s=>esc(s.s)).join(", ")}</span>
  </button>`;
}
rail.innerHTML = relCard("first","Prods individuelles",null,FIRST4) +
  relDates.map((d,i)=>relCard(d,"Release "+(i+1),d,releases[d], d==="2026-12-31" ? '<span class="tag">Veille du jour de l\'an</span>' : "")).join("");
rail.addEventListener("click", e => {
  const b = e.target.closest(".rel"); if (!b) return;
  relFilter = relFilter===b.dataset.rel ? null : b.dataset.rel;
  rail.querySelectorAll(".rel").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.rel===relFilter)));
  render();
});

// Filtre personne
let who = null;
const peopleEl = document.getElementById("people");
peopleEl.innerHTML = `<button class="chip" data-who="" aria-pressed="true">Toute l'équipe</button>` +
  Object.entries(PEOPLE).map(([n,v])=>`<button class="chip" data-who="${n}" aria-pressed="false"><i class="dot" style="--c:var(${v})"></i>${n}</button>`).join("");
peopleEl.addEventListener("click", e => {
  const b = e.target.closest(".chip"); if (!b) return;
  who = b.dataset.who || null;
  peopleEl.querySelectorAll(".chip").forEach(x => x.setAttribute("aria-pressed", String((x.dataset.who||null)===who)));
  render();
});
const q = document.getElementById("q");
q.addEventListener("input", render);

function render(){
  const term = q.value.trim().toLowerCase();
  const rows = DATA.filter((s,idx) => {
    if (term && !s.s.toLowerCase().includes(term)) return false;
    if (relFilter === "first" && idx >= 4) return false;
    if (relFilter && relFilter !== "first" && (idx < 4 || s.d[4] !== relFilter)) return false;
    if (who && ![0,1,2,3,4].some(i => owner(s,i)===who)) return false;
    return true;
  });
  let html = "", lastGroup = null;
  rows.forEach(s => {
    const idx = DATA.indexOf(s);
    const group = idx < 4 ? "Prods individuelles" : "Release du " + fmt(s.d[4]);
    if (group !== lastGroup) { html += `<tr class="group"><td colspan="7">${group}</td></tr>`; lastGroup = group; }
    const cells = s.d.map((d,i) => {
      const o = owner(s,i);
      const cls = ["cell"];
      if (d < TODAY) cls.push("past");
      if (d === TODAY) cls.push("today");
      if (i===4) cls.push("prod");
      if (who) cls.push(o===who ? "mine" : "dim");
      const person = i===2 ? `<span class="p"><i class="dot" style="--c:var(${PEOPLE[o]})"></i>${o}</span>` : "";
      return `<td class="${cls.join(" ")}">${fmt(d)}${person}</td>`;
    }).join("");
    html += `<tr><td class="site">${esc(s.s)}</td>${cells}<td><a class="jira" href="${jiraUrl(s)}" target="_blank" rel="noopener">MGDSP-${s.k}…${s.k+4}</a></td></tr>`;
  });
  document.getElementById("rows").innerHTML = html || `<tr><td colspan="7" class="empty">Aucun site ne correspond à ces filtres.</td></tr>`;
  document.getElementById("count").textContent = rows.length + " site" + (rows.length>1?"s":"") + " affiché" + (rows.length>1?"s":"");
}
render();
