function formatDate(d){return d.toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
function calcDueDate(lmpStr,cycleLen){const lmp=new Date(lmpStr+'T00:00:00');const cycle=isNaN(cycleLen)?28:Number(cycleLen);const adj=cycle-28;lmp.setDate(lmp.getDate()+adj);const due=new Date(lmp);due.setDate(due.getDate()+7);due.setMonth(due.getMonth()-3);due.setFullYear(due.getFullYear()+1);return{lmp,due}}
function gestationWeeks(lmp){const now=new Date();const days=Math.floor((now-lmp)/(1000*60*60*24));return Math.max(0,Math.floor(days/7))}
const urgentQs=["Severe or persistent headache that won’t go away","Severe dizziness or fainting","Sudden swelling of face or hands","Shortness of breath, chest pain, or very fast heartbeat","Severe nausea/vomiting such that you can’t keep fluids down","Severe abdominal pain","Baby’s movements have stopped or slowed (after 28 weeks)","Vaginal bleeding or water breaking early"];
const routineQs=["I’ve had a prenatal visit (or have one scheduled)","I have done malaria test and received treatment if positive","I have done HIV test and know my status","I have done hepatitis B test","I have done syphilis test","I have checked my blood group and genotype","I take a daily prenatal vitamin (with folate/folic acid)","I stay active with pregnancy-safe exercise","I have access to enough nutritious food","I feel safe and supported at home"];
function renderQuestions(){const urgentEl=document.getElementById('urgentList');urgentEl.innerHTML='';urgentQs.forEach((q,i)=>{const idYes=`u${i}-yes`,idNo=`u${i}-no`;const row=document.createElement('div');row.className="bg-rose-50 border border-rose-200 rounded-lg p-3";row.innerHTML=`<p class='text-sm font-medium'>${i+1}. ${q}</p><div class='mt-2 flex gap-4 text-sm'><label class='inline-flex items-center gap-1'><input type='radio' name='u${i}' id='${idYes}' value='yes'> Yes</label><label class='inline-flex items-center gap-1'><input type='radio' name='u${i}' id='${idNo}' value='no' checked> No</label></div>`;urgentEl.appendChild(row)});const routineEl=document.getElementById('routineList');routineEl.innerHTML='';routineQs.forEach((q,i)=>{const id=`r${i}`;const row=document.createElement('label');row.className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3";row.innerHTML=`<input type='checkbox' id='${id}' class='mt-1'> <span class='text-sm'>${q}</span>`;routineEl.appendChild(row)})}
function explainRoutine(item){switch(item){case'I have done malaria test and received treatment if positive':return"Malaria during pregnancy can cause miscarriage, anemia, and low birth weight. Test and treat early at a government‑approved clinic.";case'I have done HIV test and know my status':return"Knowing your status allows timely treatment to protect you and your baby from infection.";case'I have done hepatitis B test':return"Hepatitis B can pass to your baby during delivery; early detection allows preventive measures for your newborn.";case'I have done syphilis test':return"Untreated syphilis can cause stillbirth or birth defects; treatment is simple and effective when done early.";case'I have checked my blood group and genotype':return"Essential to prevent problems like rhesus incompatibility and to understand sickle cell disease risk.";case'I take a daily prenatal vitamin (with folate/folic acid)':return"Folic acid helps prevent birth defects; iron supports you against anemia.";case'I stay active with pregnancy-safe exercise':return"Moderate activity improves circulation, mood, and sleep if your clinician says it’s safe.";case'I have access to enough nutritious food':return"Good nutrition supports your health and your baby’s growth; ask your clinic about local support if needed.";case'I feel safe and supported at home':return"A safe, supportive environment reduces stress and risk of harm. Seek help if you feel unsafe.";case'I’ve had a prenatal visit (or have one scheduled)':return"Early and regular antenatal visits help catch issues early and support a healthy pregnancy.";default:return"Discuss this item with your healthcare provider for personalised advice."}}
function buildEmailLong(dueInfo){const urgentList=[];urgentQs.forEach((q,i)=>{const yes=document.querySelector(`input[name="u${i}"]:checked`)?.value==='yes';if(yes)urgentList.push(q)});const gaps=[];routineQs.forEach((q,i)=>{const checked=document.getElementById(`r${i}`).checked;if(!checked)gaps.push(q)});const phq=Number(document.getElementById('phq1').value)+Number(document.getElementById('phq2').value);const phqFlag=phq>=3;const lines=[];lines.push("Hello,");lines.push("");lines.push("Here is your Healthy With Happiness pregnancy check summary:");lines.push("");lines.push(`Estimated Due Date: ${formatDate(dueInfo.due)}`);lines.push("");if(urgentList.length>0){lines.push("⚠ Urgent Concerns:");lines.push("If you have any of the following symptoms, please seek immediate medical care at the nearest qualified health facility:");urgentList.forEach(symp=>{let why="This could indicate a serious pregnancy complication and needs urgent care.";if(symp.includes("headache"))why="May indicate preeclampsia, very high blood pressure, or other dangerous conditions.";if(symp.includes("dizziness"))why="Could be due to anemia, low blood pressure, or dehydration.";if(symp.includes("swelling"))why="Possible sign of preeclampsia—this can be dangerous if untreated.";if(symp.includes("Shortness of breath")||symp.includes("chest pain"))why="May indicate a heart or lung problem—get urgent assessment.";if(symp.includes("nausea/vomiting"))why="Can cause dehydration and harm your baby if untreated.";if(symp.includes("abdominal"))why="Could be preterm labour or placental problems—needs evaluation.";if(symp.includes("movements"))why="Could mean baby is in distress—seek urgent care.";if(symp.includes("Vaginal bleeding")||symp.includes("water"))why="Could mean labour or other complications—get seen immediately.";lines.push(`- ${symp}: ${why}`)});lines.push("")}if(gaps.length>0){lines.push("🔍 Routine Checks to Complete:");lines.push("These tests and steps are especially important in Nigeria and across Africa:");gaps.forEach(item=>{const label=item.startsWith("I ")?item.replace(/^I /,""):item;lines.push(`- ${label}: ${explainRoutine(item)}`)});lines.push("")}if(phqFlag){lines.push("🧠 Mood Check:");lines.push("Your mood responses suggest checking in with a clinician or counsellor could be helpful. If you have thoughts of harming yourself, seek urgent care immediately.");lines.push("")}lines.push("This guidance is educational and not a substitute for medical advice. Always consult a qualified health professional.");lines.push("");lines.push("— Healthy With Happiness Team");return lines.join("\n")}
function buildPlan(dueInfo){
  let urgent=false;
  urgentQs.forEach((q,i)=>{
    const yes=document.querySelector(`input[name="u${i}"]:checked`)?.value==='yes';
    if(yes) urgent=true
  });
  let gaps=[];
  routineQs.forEach((q,i)=>{
    const checked=document.getElementById(`r${i}`).checked;
    if(!checked) gaps.push(q)
  });
  const phq=Number(document.getElementById('phq1').value)+Number(document.getElementById('phq2').value);
  const phqFlag=phq>=3;
  let risk='On track';
  if(urgent) risk='URGENT';
  else if(phqFlag||gaps.length>=2) risk='Needs attention';
  const badge=document.getElementById('riskBadge');
  badge.className='badge '+(risk==='URGENT'?'badge-danger':risk==='Needs attention'?'badge-warn':'badge-emerald');
  badge.textContent=risk;
  const weeks=gestationWeeks(dueInfo.lmp);
  const out=[];
  out.push(`<p><strong>Due date:</strong> ${formatDate(dueInfo.due)} (about ${weeks} weeks along)</p>`);
  out.push("<h4 class='mt-4 font-semibold'>Your action plan</h4>");
  const actions=[];
  if(urgent){actions.push("Call your maternity unit, obstetric provider, or emergency services now. Do not wait.")}
  if(phqFlag){actions.push("Your mood check suggests you may benefit from mental‑health support. If you have thoughts of self‑harm, seek urgent care immediately.")}
  if(gaps.includes("I’ve had a prenatal visit (or have one scheduled)")){actions.push("Book a prenatal appointment as soon as possible—early care improves outcomes.")}
  if(gaps.includes("I have done malaria test and received treatment if positive")){actions.push("Do a malaria test and get treatment if positive to avoid anemia, miscarriage, and low birth weight.")}
  if(gaps.includes("I have done HIV test and know my status")){actions.push("Do an HIV test; treatment protects you and your baby.")}
  if(gaps.includes("I have done hepatitis B test")){actions.push("Screen for hepatitis B; early detection protects your newborn at delivery.")}
  if(gaps.includes("I have done syphilis test")){actions.push("Screen for syphilis; early treatment prevents stillbirth and birth defects.")}
  if(gaps.includes("I have checked my blood group and genotype")){actions.push("Know your blood group & genotype to manage Rh issues and sickle cell risk.")}
  if(gaps.includes("I take a daily prenatal vitamin (with folate/folic acid)")){actions.push("Start a daily prenatal vitamin (folate/folic acid + iron).")}
  if(gaps.includes("I stay active with pregnancy-safe exercise")){actions.push("Aim for ~150 minutes/week of moderate activity if your clinician says it’s safe.")}
  if(gaps.includes("I have access to enough nutritious food")){actions.push("Ask your clinic about nutrition support if food access is a challenge.")}
  if(gaps.includes("I feel safe and supported at home")){actions.push("If you do not feel safe at home, contact a trusted provider or local support organisation.")}
  if(actions.length===0){
    out.push("<p>You're on track. Keep up healthy habits and regular prenatal care.</p>")
  }else{
    out.push("<ul class='list-disc pl-5'>"+actions.map(a=>`<li>${a}</li>`).join("")+"</ul>")
  }
  out.push("<p class='text-xs text-slate-500 mt-3'>This is educational information and not a diagnosis. Always follow your clinician’s advice.</p>");
  document.getElementById('planOut').innerHTML=out.join("\n");
}
async function subscribe(email,meta){try{const res=await fetch('/.netlify/functions/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,meta})});return res.json()}catch(e){return {message:'Error'}}}
function updateStepper(currentStep) {
  const steps = [
    document.getElementById('step1-ind'),
    document.getElementById('step2-ind'),
    document.getElementById('step3-ind')
  ];
  steps.forEach((el, idx) => {
    if (idx === currentStep) {
      el.className = 'badge badge-emerald';
      el.style.background = '#059669';
      el.style.color = '#fff';
    } else {
      el.className = 'badge badge-muted';
      el.style.background = '';
      el.style.color = '';
    }
  });
}
document.addEventListener('DOMContentLoaded',()=>{renderQuestions();const step1=document.getElementById('step1');const step2=document.getElementById('step2');const step3=document.getElementById('step3');let dueInfo=null;updateStepper(0);document.getElementById('calcBtn').addEventListener('click',()=>{const lmp=document.getElementById('lmp').value;const cycle=document.getElementById('cycle').value;const dueOut=document.getElementById('dueOut');if(!lmp){dueOut.innerHTML="<span class='text-rose-600'>Please enter your LMP date.</span>";return}dueInfo=calcDueDate(lmp,cycle);const weeks=gestationWeeks(dueInfo.lmp);dueOut.innerHTML=`<div class="bg-slate-50 border border-slate-200 rounded-lg p-3"><p><strong>Estimated due date:</strong> ${formatDate(dueInfo.due)} • <strong>~${weeks} weeks</strong></p></div>`;step1.classList.add('hidden');step2.classList.remove('hidden');updateStepper(1)});document.getElementById('back1').addEventListener('click',()=>{step2.classList.add('hidden');step1.classList.remove('hidden');updateStepper(0)});document.getElementById('toResults').addEventListener('click',()=>{if(!dueInfo){document.getElementById('dueOut').innerHTML="<span class='text-rose-600'>Please calculate your due date first.</span>";step1.classList.remove('hidden');step2.classList.add('hidden');updateStepper(0);return}buildPlan(dueInfo);step2.classList.add('hidden');step3.classList.remove('hidden');updateStepper(2)});document.getElementById('restart').addEventListener('click',()=>{window.location.reload()});document.getElementById('subscribeBtn').addEventListener('click', async () => {
  const email = document.getElementById('emailInput').value.trim();
  const msg = document.getElementById('emailMsg');
  msg.textContent = "";
  msg.className = "text-sm mt-2";

  // Validate email
  if (!email || !email.includes('@')) {
    msg.textContent = "Please enter a valid email address.";
    msg.classList.add("text-rose-600");
    return;
  }

  // Ensure dueInfo is available (steps completed)
  if (!dueInfo) {
    msg.textContent = "Please complete the steps first.";
    msg.classList.add("text-rose-600");
    return;
  }

  // Build long email report using your existing helper functions
  const long_email = buildEmailLong(dueInfo);
  const gestational_weeks = String(gestationWeeks(dueInfo.lmp));
  const due_date = dueInfo.due.toISOString().slice(0, 10);
  const risk_level = (document.getElementById('riskBadge')?.textContent || 'Unknown').trim();
  const missing_checks = routineQs
    .map((q, i) => ({ q, ok: document.getElementById(`r${i}`).checked }))
    .filter(x => !x.ok)
    .map(x => x.q)
    .join('; ');

  const meta = { long_email, due_date, gestational_weeks, risk_level, missing_checks };

  // Indicate sending status to user
  msg.textContent = "Sending your full report to your email…";
  msg.classList.remove("text-rose-600", "text-emerald-600");
  msg.classList.add("text-slate-600");

  // Send data to your serverless function (Systeme API)
  try {
    const res = await subscribe(email, meta);
    if (res?.message === 'Success') {
      msg.textContent = "✅ Done! The detailed report is in your inbox.";
      msg.classList.remove("text-slate-600", "text-rose-600");
      msg.classList.add("text-emerald-600");
    } else {
      msg.textContent = "⚠ Couldn’t send the email right now. Please try again.";
      msg.classList.remove("text-slate-600", "text-emerald-600");
      msg.classList.add("text-rose-600");
    }
  } catch (e) {
    msg.textContent = "⚠ Network issue. Please try again.";
    msg.classList.remove("text-slate-600", "text-emerald-600");
    msg.classList.add("text-rose-600");
  }
});
    return; // keep this
  }

  // 3) Build the LONG email report (more detailed than on-page plan)
  const long_email = buildEmailLong(dueInfo); // uses all current answers

  // 4) Build the fields we’ll send to the backend (Systeme)
  const gestational_weeks = String(gestationWeeks(dueInfo.lmp));
  const due_date = dueInfo.due.toISOString().slice(0,10); // YYYY-MM-DD
  const risk_level = (document.getElementById('riskBadge')?.textContent || 'Unknown').trim();
  const missing_checks = routineQs
    .map((q,i) => ({ q, ok: document.getElementById(`r${i}`).checked }))
    .filter(x => !x.ok)
    .map(x => x.q)
    .join('; ');

  const meta = { long_email, due_date, gestational_weeks, risk_level, missing_checks };

  // 5) Send to your Netlify function -> Systeme (this triggers the email)
  msg.textContent = "Sending your full report to your email...";
  msg.classList.remove("text-rose-600", "text-emerald-600");
  msg.classList.add("text-slate-600");

  try {
    const res = await subscribe(email, meta); // IMPORTANT: send meta, not {}
    if (res?.message === 'Success') {
      msg.textContent = "✅ Done! The detailed report is in your inbox.";
      msg.classList.remove("text-slate-600", "text-rose-600");
      msg.classList.add("text-emerald-600");
    } else {
      console.error("Subscription error:", res?.error || res);
      msg.textContent = "⚠ Couldn’t send the email right now. Please try again.";
      msg.classList.remove("text-slate-600", "text-emerald-600");
      msg.classList.add("text-rose-600");
    }
  } catch (e) {
    console.error("Subscription exception:", e);
    msg.textContent = "⚠ Network issue. Please try again.";
    msg.classList.remove("text-slate-600", "text-emerald-600");
    msg.classList.add("text-rose-600");
  }
});
;
    return;
  }
  msg.textContent = "Sending...";
  msg.classList.remove("text-rose-600", "text-emerald-600");
  msg.classList.add("text-slate-600");
  try {
    const res = await subscribe(email, {});
    if (res?.message === 'Success') {
      msg.textContent = "Thank you! Your plan is on its way to your inbox.";
      msg.classList.remove("text-slate-600", "text-rose-600");
      msg.classList.add("text-emerald-600");
    } else {
      console.error("Subscription error:", res?.error || res);
      msg.textContent = "Sorry, we couldn't subscribe you right now. Please try again later.";
      msg.classList.remove("text-slate-600", "text-emerald-600");
      msg.classList.add("text-rose-600");
    }
  } catch (e) {
    console.error("Subscription exception:", e);
    msg.textContent = "Sorry, something went wrong. Please try again later.";
    msg.classList.remove("text-slate-600", "text-emerald-600");
    msg.classList.add("text-rose-600");
  }
});})
