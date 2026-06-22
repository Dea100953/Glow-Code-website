// main.js - Frontend-only prototype logic for HerVoice (with optional Supabase integration).
// Added features: localStorage-only auto-expire for chat and reports, improved "Report" flow that saves reports to localStorage.

(async function(){
  document.addEventListener('DOMContentLoaded', init);

  async function init(){
    // Retention policy (days)
    const CHAT_RETENTION_DAYS = 90; // chat messages older than this will be removed
    const REPORT_RETENTION_DAYS = 365; // reports older than this will be removed

    // Keys in localStorage
    const CHAT_KEY = 'hervoice_chat_messages_v1';
    const REPORT_KEY = 'hervoice_reports_v1';

    // purge old data on startup
    purgeOldData();

    document.getElementById('year').textContent = new Date().getFullYear();

    // SAMPLE emergency dataset (small sample)
    const emergencyData = {
      "Afghanistan": [
        {type:"Police", number:"+93 020 210-0000"},
        {type:"Emergency", number:"112"}
      ],
      "United States": [
        {type:"Police / Ambulance", number:"911"},
        {type:"Domestic violence helpline", number:"1-800-799-7233 (SAFELINE)"}
      ],
      "United Kingdom": [
        {type:"Police / Ambulance", number:"999"},
        {type:"Domestic abuse helpline", number:"0808 2000 247 (National DV Helpline)"}
      ],
      "India": [
        {type:"Police / Ambulance", number:"112"},
        {type:"Women helpline", number:"181"}
      ]
    };

    // Utility escape
    function escapeHtml(s){ return String(s).replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; }); }

    // populate countries
    const countrySelect = document.getElementById('countrySelect');
    Object.keys(emergencyData).forEach(c => {
      const opt = document.createElement('option'); opt.value = c; opt.textContent = c; countrySelect.appendChild(opt);
    });
    const contactList = document.getElementById('contactList');
    function renderContacts(country){
      contactList.innerHTML = '';
      const list = emergencyData[country];
      if(!list){ contactList.innerHTML = '<p class="muted">No data available for this country (sample dataset).</p>'; return; }
      list.forEach(item=>{
        const div = document.createElement('div'); div.className = 'contact-item';
        // tel: link for click-to-call
        const tel = document.createElement('a'); tel.href = `tel:${item.number.replace(/\s+/g,'')}`; tel.textContent = item.number;
        div.innerHTML = `<strong>${escapeHtml(item.type)}</strong>`;
        div.appendChild(tel);
        contactList.appendChild(div);
      });
      const callNote = document.createElement('p'); callNote.style.fontSize='0.9rem'; callNote.style.color='#444';
      callNote.textContent = 'If you are in immediate danger, call local emergency services first.';
      contactList.appendChild(callNote);
    }
    countrySelect.addEventListener('change', e=> renderContacts(e.target.value));
    if (countrySelect.options.length) { countrySelect.selectedIndex = 0; renderContacts(countrySelect.options[0].value); }

    // SAMPLE news (would come from AI ingestion in production)
    const sampleNews = [
      {
        id: 'n1',
        title: 'Girls barred from secondary education in region X, officials tighten rules',
        excerpt: 'Authorities have implemented strict restrictions preventing girls from attending secondary schools.',
        content: '<p>Verified reports from local NGOs indicate that girls in several districts are being denied access to secondary education. Sources: <a href="https://example.com/article1" target="_blank" rel="noopener">Example News</a></p>',
        country: 'Afghanistan',
        tags: ['education','freedom','rights'],
        date: '2026-06-20',
        image: 'assets/news-afg.jpg',
        source: 'Example News',
        url: 'https://example.com/article1'
      },
      {
        id: 'n2',
        title: 'Workers face discrimination in hiring; pay gaps persist',
        excerpt: 'Reports show persistent pay inequality in multiple sectors affecting women’s economic independence.',
        content: '<p>Investigations reveal wage gaps and barriers to promotions in industries of Region Y. Sources: <a href="https://example.com/article2" target="_blank" rel="noopener">Example Investigative</a></p>',
        country: 'United States',
        tags: ['economy','paygap'],
        date: '2026-06-18',
        image: 'assets/news-paygap.jpg',
        source: 'Example Investigative',
        url: 'https://example.com/article2'
      }
    ];

    // featured
    const featuredImage = document.getElementById('heroImage');
    if (sampleNews[0] && featuredImage) {
      featuredImage.src = sampleNews[0].image;
      document.getElementById('featuredTitle').textContent = sampleNews[0].title;
      document.getElementById('featuredExcerpt').textContent = sampleNews[0].excerpt;
      document.getElementById('featuredLink').href = sampleNews[0].url || 'news.html';
    }

    // news rendering
    const newsListEl = document.getElementById('newsList');
    const searchInput = document.getElementById('newsSearch');
    function renderNews(items){
      newsListEl.innerHTML = '';
      if (!items.length) { newsListEl.innerHTML = '<p>No news found.</p>'; return; }
      items.forEach(item=>{
        const card = document.createElement('article'); card.className = 'news-card';
        card.innerHTML = `\n        <img src="${item.image}" alt="${escapeHtml(item.title)}" />\n        <h3>${escapeHtml(item.title)}</h3>\n        <div class="news-meta">\n          <span class="badge">${escapeHtml(item.country)}</span>\n          <span>${item.date} • ${escapeHtml(item.source)}</span>\n        </div>\n        <p>${escapeHtml(item.excerpt)}</p>\n        <div style="margin-top:auto"><button class="btn small open-article" data-id="${item.id}">Read</button> <a class="btn small" href="${item.url}" target="_blank" rel="noopener">Source</a></div>\n      `;
        newsListEl.appendChild(card);
      });
      document.querySelectorAll('.open-article').forEach(btn=> btn.addEventListener('click', e=> openArticleModal(e.currentTarget.dataset.id)));
    }

    function openArticleModal(id){
      const item = sampleNews.find(n=>n.id===id);
      if(!item) return;
      const modal = document.getElementById('modal');
      const body = document.getElementById('modalBody');
      body.innerHTML = `<h2>${escapeHtml(item.title)}</h2><p class="news-meta"><strong>${escapeHtml(item.country)}</strong> • ${item.date} • Source: <a href="${item.url}" target="_blank" rel="noopener">${escapeHtml(item.source)}</a></p><img src="${item.image}" alt="" style="width:100%;max-height:280px;object-fit:cover;border-radius:8px;margin:0.5rem 0" />${item.content}<p><a href="${item.url}" target="_blank" rel="noopener">Original source</a></p>`;
      modal.setAttribute('aria-hidden','false'); modal.style.display='flex';
    }
    document.getElementById('modalClose').addEventListener('click', ()=>{ const modal = document.getElementById('modal'); modal.setAttribute('aria-hidden','true'); modal.style.display='none'; });
    searchInput && searchInput.addEventListener('input', (e)=>{ const q = e.target.value.toLowerCase().trim(); if(!q) renderNews(sampleNews); else { const filtered = sampleNews.filter(n => (n.title + ' ' + n.excerpt + ' ' + n.country + ' ' + n.tags.join(' ')).toLowerCase().includes(q)); renderNews(filtered); } });
    renderNews(sampleNews);

    // --- Chat: localStorage with optional SUPABASE integration (no backend required) ---
    const SUPABASE_URL = window.SUPABASE_URL || null;
    const SUPABASE_KEY = window.SUPABASE_KEY || null;
    let supabase = null;
    if(SUPABASE_URL && SUPABASE_KEY){
      try{ 
        // dynamically load supabase client
        await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/dist/umd/supabase.min.js');
        // @ts-ignore
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('Supabase client initialized');
      }catch(err){ console.warn('Failed to load Supabase client, falling back to localStorage', err); supabase = null; }
    }

    if (location.pathname.endsWith('chat.html') || location.pathname.endsWith('/chat')) initChatUI();
    if (location.pathname.endsWith('report.html') || location.pathname.endsWith('/report')) initReportForm();

    // loadScript helper
    function loadScript(src){ return new Promise((resolve,reject)=>{ const s=document.createElement('script'); s.src=src; s.onload=()=>resolve(); s.onerror=(e)=>reject(e); document.head.appendChild(s); }); }

    // Purge old data according to retention policy
    function purgeOldData(){
      try{
        // Purge chat
        const rawChat = localStorage.getItem(CHAT_KEY);
        if(rawChat){
          const msgs = JSON.parse(rawChat);
          const cutoff = Date.now() - CHAT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
          const kept = msgs.filter(m => { const t = new Date(m.created_at || m.time || 0).getTime(); return !isNaN(t) && t >= cutoff; });
          if(kept.length !== msgs.length) localStorage.setItem(CHAT_KEY, JSON.stringify(kept));
        }
        // Purge reports
        const rawReports = localStorage.getItem(REPORT_KEY);
        if(rawReports){
          const rpts = JSON.parse(rawReports);
          const cutoffR = Date.now() - REPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
          const keptR = rpts.filter(r => { const t = new Date(r.createdAt || r.created_at || 0).getTime(); return !isNaN(t) && t >= cutoffR; });
          if(keptR.length !== rpts.length) localStorage.setItem(REPORT_KEY, JSON.stringify(keptR));
        }
      }catch(err){ console.warn('purgeOldData failed', err); }
    }

    async function initChatUI(){
      const main = document.querySelector('main') || document.body;
      const container = document.createElement('section'); container.className='card';
      container.innerHTML = `
        <h2>Community Chat (Anonymous)</h2>
        <div id="messages" class="chat-messages" aria-live="polite" style="max-height:50vh;overflow:auto;margin-bottom:0.5rem"></div>
        <form id="chatForm" class="chat-form" style="display:flex;gap:0.5rem;margin-top:0.5rem">
          <input id="chatInput" placeholder="Share a message or story (be respectful). You may remain anonymous." required style="flex:1;padding:0.6rem;border-radius:8px;border:1px solid #eee" />
          <button class="btn primary" style="flex:0 0 120px">Send</button>
        </form>
        <p style="font-size:0.9rem;color:var(--muted)">Messages are stored locally in your browser in this prototype unless Supabase is configured. For production we will use a secure backend with moderation and report features.</p>
      `;
      main.appendChild(container);
      const messagesEl = document.getElementById('messages');
      const chatForm = document.getElementById('chatForm');
      const chatInput = document.getElementById('chatInput');

      if(supabase){
        await loadSupabaseMessages();
        subscribeToMessages();
      } else {
        renderLocalMessages();
      }

      chatForm.addEventListener('submit', async (e)=>{
        e.preventDefault();
        const text = chatInput.value.trim(); if(!text) return;
        const entry = { id: Date.now().toString(36), name: 'Anonymous', text, created_at: new Date().toISOString() };
        if(supabase){
          try{
            await supabase.from('messages').insert([{name:entry.name,text:entry.text}]);
            chatInput.value='';
          }catch(err){ console.error('Supabase insert failed', err); alert('Failed to send message (Supabase). Falling back to local storage.'); saveLocal(entry); renderLocalMessages(); chatInput.value=''; }
        } else {
          saveLocal(entry); renderLocalMessages(); chatInput.value='';
        }
      });

      // localStorage helpers
      function saveLocal(entry){ const raw = localStorage.getItem(CHAT_KEY); const list = raw?JSON.parse(raw):[]; list.push(entry); localStorage.setItem(CHAT_KEY, JSON.stringify(list)); }

      function renderLocalMessages(){ const raw = localStorage.getItem(CHAT_KEY); const list = raw?JSON.parse(raw):[]; messagesEl.innerHTML=''; list.slice(-500).forEach(m=>{ const el = document.createElement('div'); el.style.padding='0.6rem'; el.style.borderBottom='1px solid #f1e7ee'; el.innerHTML = `<div style="display:flex;justify-content:space-between"><strong>${escapeHtml(m.name||'Anonymous')}</strong><small style="color:var(--muted)">${new Date(m.created_at||m.time).toLocaleString()}</small></div><div style="margin-top:0.3rem">${escapeHtml(m.text)}</div><div style="margin-top:0.4rem"><button class="btn small report-btn" data-id="${m.id}">Report</button></div>`; messagesEl.appendChild(el); }); attachReportHandlers(); messagesEl.scrollTop = messagesEl.scrollHeight; }

      // Supabase helpers
      async function loadSupabaseMessages(){ try{ const { data, error } = await supabase.from('messages').select('*').order('created_at', {ascending:true}).limit(500); if(error) throw error; messagesEl.innerHTML=''; (data||[]).forEach(m=>{ const el = document.createElement('div'); el.style.padding='0.6rem'; el.style.borderBottom='1px solid #f1e7ee'; el.innerHTML = `<div style="display:flex;justify-content:space-between"><strong>${escapeHtml(m.name||'Anonymous')}</strong><small style="color:var(--muted)">${new Date(m.created_at).toLocaleString()}</small></div><div style="margin-top:0.3rem">${escapeHtml(m.text)}</div><div style="margin-top:0.4rem"><button class="btn small report-btn" data-id="${m.id}">Report</button></div>`; messagesEl.appendChild(el); }); attachReportHandlers(); messagesEl.scrollTop = messagesEl.scrollHeight; }catch(err){ console.error('loadSupabaseMessages', err); }
      }
      function subscribeToMessages(){ try{ const channel = supabase.channel('public:messages'); channel.on('postgres_changes', {event:'INSERT',schema:'public',table:'messages'}, payload=>{ const m = payload.new; const el = document.createElement('div'); el.style.padding='0.6rem'; el.style.borderBottom='1px solid #f1e7ee'; el.innerHTML = `<div style="display:flex;justify-content:space-between"><strong>${escapeHtml(m.name||'Anonymous')}</strong><small style="color:var(--muted)">${new Date(m.created_at).toLocaleString()}</small></div><div style="margin-top:0.3rem">${escapeHtml(m.text)}</div><div style="margin-top:0.4rem"><button class="btn small report-btn" data-id="${m.id}">Report</button></div>`; messagesEl.appendChild(el); messagesEl.scrollTop = messagesEl.scrollHeight; attachReportHandlers(); }).subscribe(); }catch(err){ console.warn('subscribe failed', err); }
      }

      function attachReportHandlers(){ document.querySelectorAll('.report-btn').forEach(b=> b.addEventListener('click', async e=>{ const id = e.currentTarget.getAttribute('data-id'); // improved report flow: ask for reason and save locally
            const reason = prompt('Why are you reporting this message? (optional)');
            if(reason === null) return; // user cancelled
            // find message text to include
            const raw = localStorage.getItem(CHAT_KEY); const list = raw?JSON.parse(raw):[]; const msg = list.find(m=>m.id === id) || {};
            const report = { id: Date.now().toString(36), type: 'message_report', messageId: id, messageText: msg.text || '', reason: reason || '', createdAt: new Date().toISOString() };
            saveReportLocal(report);
            // mark message as reported in local copy
            if(msg){ msg.reported = true; localStorage.setItem(CHAT_KEY, JSON.stringify(list)); }
            // update UI
            e.currentTarget.textContent = 'Reported'; e.currentTarget.disabled = true; alert('Message reported — moderators will review (local prototype).'); })) }
    }

    // --- Report form ---
    async function initReportForm(){
      const main = document.querySelector('main') || document.body;
      main.innerHTML = `
        <section class="container">
          <h2>Report an incident (anonymous)</h2>
          <form id="reportForm" class="card">
            <label>Country<input name="country" required placeholder="Country" /></label>
            <label>Date<input name="date" type="date" /></label>
            <label>Description<textarea name="desc" rows="6" placeholder="Describe the incident (keep details relevant, avoid identifying personal info if anonymous)"></textarea></label>
            <label><input type="checkbox" name="anon" checked /> Submit anonymously</label>
            <div style="display:flex;gap:0.5rem;margin-top:0.5rem">
              <button class="btn primary" type="submit">Submit Report</button>
              <button class="btn" type="button" id="downloadReport">Download as JSON</button>
            </div>
          </form>
          <div id="reportStatus" style="margin-top:0.8rem"></div>
        </section>
      `;
      const form = document.getElementById('reportForm');
      const status = document.getElementById('reportStatus');

      form.addEventListener('submit', async e=>{
        e.preventDefault();
        const fd = new FormData(form);
        const obj = { id: Date.now().toString(36), country: fd.get('country'), date: fd.get('date') || new Date().toISOString().split('T')[0], anon: fd.get('anon') === 'on' || fd.get('anon') === 'true', desc: fd.get('desc'), createdAt: new Date().toISOString() };
        // save locally (prototype)
        saveReportLocal(obj);
        status.innerHTML = '<p style="color:green">Report saved locally (prototype). Admins can integrate backend to receive reports securely.</p>';
        form.reset();
      });

      document.getElementById('downloadReport').addEventListener('click', ()=>{ const raw = localStorage.getItem(REPORT_KEY) || '[]'; const blob = new Blob([raw], {type:'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download='hervoice_reports.json'; a.click(); URL.revokeObjectURL(url); });
    }

    // save report locally helper
    function saveReportLocal(report){ try{ const raw = localStorage.getItem(REPORT_KEY); const list = raw?JSON.parse(raw):[]; list.push(report); localStorage.setItem(REPORT_KEY, JSON.stringify(list)); }catch(err){ console.error('saveReportLocal failed', err); } }

    // accessibility: close modal on Esc
    document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape'){ const modal = document.getElementById('modal'); if(modal && modal.getAttribute('aria-hidden') === 'false'){ modal.setAttribute('aria-hidden','true'); modal.style.display='none'; } } });

    // placeholder functions for future integrations
    window.HerVoice = window.HerVoice || {};
    window.HerVoice._sampleNews = sampleNews;
    window.HerVoice._emergencyData = emergencyData;

    // run a purge periodically while the page is open (every 6 hours)
    setInterval(purgeOldData, 1000 * 60 * 60 * 6);
  }
})();
