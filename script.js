// script.js — تفاعلات الموقع: جلب السور، عرض السورة، مقالات، وتعليقات محلية
const API_BASE = 'https://api.alquran.cloud/v1';

// ----- index.html: populate latest sample items -----
document.addEventListener('DOMContentLoaded', ()=>{
  // إذا على صفحة index
  if(document.getElementById('latest-list')){
    const latestList = document.getElementById('latest-list');
    const samples = [
      {title: 'تأملات في سورة الفاتحة', href:'articles2.html#'},
      {title: 'حديث عن الصدق', href:'articles2.html#'},
      {title: 'موقف نبوي: العفو عند المقدرة', href:'articles2.html#'}
    ];
    samples.forEach(s=>{
      const li = document.createElement('li');
      li.innerHTML = `<a href="${s.href}">${s.title}</a>`;
      latestList.appendChild(li);
    });
  }

  // ----- quran.html logic -----
  if(document.getElementById('surah-list')){
    initQuranPage();
  }

  // ----- articles page logic -----
  if(document.getElementById('articles-list')){
    initArticlesPage();
  }
});

// ---------- Quran page functions ----------
async function initQuranPage(){
  const listEl = document.getElementById('surah-list');
  const contentEl = document.getElementById('surah-content');
  const searchInput = document.getElementById('surah-search');

  try{
    const res = await fetch(`${API_BASE}/surah`);
    const data = await res.json();
    // data.data should be array of surahs
    const surahs = data.data || [];
    listEl.innerHTML = '';
    surahs.forEach(s => {
      const btn = document.createElement('div');
      btn.className = 'surah-item';
      btn.textContent = `${s.number}. ${s.name} — ${s.englishName}`;
      btn.dataset.number = s.number;
      btn.addEventListener('click', ()=> loadSurah(s.number, btn));
      listEl.appendChild(btn);
    });

    // search filter
    searchInput.addEventListener('input', (e)=>{
      const q = e.target.value.trim();
      Array.from(listEl.children).forEach(it=>{
        if(it.textContent.includes(q) || it.textContent.toLowerCase().includes(q.toLowerCase())){
          it.style.display = '';
        } else it.style.display = 'none';
      });
    });

  }catch(err){
    listEl.innerHTML = `<p class="muted">تعذر جلب السور من الخادم. تأكد من اتصال الإنترنت أو استخدم النسخة الأوفلاين.</p>`;
    console.error(err);
  }

  async function loadSurah(number, btnElement){
    // إبراز العنصر
    Array.from(listEl.children).forEach(c=>c.classList.remove('active'));
    btnElement.classList.add('active');
    contentEl.innerHTML = `<p class="muted">جارِ تحميل السورة...</p>`;
    try{
      // هنا نستخدم نسخة نصية (القرآن العثماني) — إن واجهة الـ API تتطلب تعديل، غيّر 'quran-uthmani' أو endpoint حسب الحاجة.
      const res = await fetch(`${API_BASE}/surah/${number}/quran-uthmani`);
      const d = await res.json();
      if(!d.data || !d.data.ayahs) throw new Error('لا بيانات');
      const s = d.data;
      let html = `<h3>${s.englishName} — ${s.name} (عدد الآيات: ${s.numberOfAyahs})</h3>`;
      html += `<div class="surah-text">`;
      s.ayahs.forEach(a=>{
        html += `<div class="ayah"><span class="aya-num">(${a.numberInSurah})</span> <span class="aya-text">${a.text}</span></div>`;
      });
      html += `</div>`;
      contentEl.innerHTML = html;
      contentEl.scrollTop = 0;
    }catch(e){
      contentEl.innerHTML = `<p class="muted">تعذّر تحميل نص السورة. يمكنك تجربة إعادة التحميل أو استخدام النسخة الأوفلاين.</p>`;
      console.error(e);
    }
  }
}

// ---------- Articles & Comments ----------
function initArticlesPage(){
  // modal for article details
  const modal = document.getElementById('article-modal');
  const modalContent = document.getElementById('modal-content');
  document.querySelectorAll('.read-more').forEach(a=>{
    a.addEventListener('click', e=>{
      const key = e.target.dataset.content;
      openArticle(key);
    });
  });
  document.getElementById('close-article').addEventListener('click', ()=> {
    modal.classList.add('hidden');
  });

  // sample content store (يمكنك تعديل/إضافة)
  const CONTENT = {
    hadith1: {
      title: 'حديث: فضل الصدقة',
      body: `<p>عن النبي ﷺ: «ما نقَصَتْ مَالًا مِنْ صدقةٍ...» — (نموذج نصي، ضع هنا النص والمصدر).</p>`
    },
    story1: {
      title: 'موقف نبوي ﷺ مع الصحابة',
      body: `<p>قصة تعليمية عن كيفية تعاطي النبي ﷺ مع الصحابة في مسألة التواضع والرحمة...</p>`
    }
  };

  function openArticle(key){
    const item = CONTENT[key];
    if(!item) return;
    modalContent.innerHTML = `<h3>${item.title}</h3>${item.body}`;
    modal.classList.remove('hidden');
  }

  // بحث المقالات
  const articleSearch = document.getElementById('article-search');
  articleSearch.addEventListener('input', (e)=>{
    const q = e.target.value.trim();
    Array.from(document.querySelectorAll('.card')).forEach(card=>{
      const txt = card.textContent || '';
      card.style.display = txt.includes(q) || txt.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
    });
  });

  // تعليقات (محلي)
  const form = document.getElementById('comment-form');
  const commentsList = document.getElementById('comments-list');
  const storageKey = 'mouiza_comments_v1';
  const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');

  function renderComments(){
    commentsList.innerHTML = '';
    const arr = JSON.parse(localStorage.getItem(storageKey) || '[]').reverse();
    if(arr.length===0) commentsList.innerHTML = `<p class="muted">لا تعليقات بعد — كن أول من يشارك.</p>`;
    arr.forEach(c=>{
      const d = document.createElement('div');
      d.className = 'comment';
      d.innerHTML = `<strong>${escapeHtml(c.name||'زائر')}</strong> <small class="muted">— ${new Date(c.time).toLocaleString()}</small><p>${escapeHtml(c.text)}</p>`;
      commentsList.appendChild(d);
    });
  }

  form.addEventListener('submit', e=>{
    e.preventDefault();
    const name = document.getElementById('comment-name').value.trim();
    const text = document.getElementById('comment-text').value.trim();
    if(!text) return alert('اكتب تعليقًا أولاً');
    const arr = JSON.parse(localStorage.getItem(storageKey) || '[]');
    arr.push({name, text, time: Date.now()});
    localStorage.setItem(storageKey, JSON.stringify(arr));
    form.reset();
    renderComments();
  });

  renderComments();
}

// ----- helpers -----
function escapeHtml(str){
  if(!str) return '';
  return str.replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; });
}
// محتوى المقالات والأحاديث الكامل
const articlesContent = {
  hadith1: `
    <h2>حديث نبوي: فضل الصدقة</h2>
    <p>عن النبي ﷺ: "ما نقصت صدقة من مال..." — مثال نصي كامل للحديث مع المصدر.</p>
  `,
  hadith2: `
    <h2>حديث نبوي: حسن الخلق</h2>
    <p>عن النبي ﷺ: "إنما بعثت لأتمم مكارم الأخلاق" — مثال نصي كامل.</p>
  `,
  story1: `
    <h2>موقف النبي ﷺ مع الصحابة: الصبر</h2>
    <p>قصة قصيرة تشرح الصبر من مواقف النبي ﷺ مع الصحابة.</p>
  `,
  story2: `
    <h2>موقف النبي ﷺ مع الصحابة: التعاون</h2>
    <p>قصة قصيرة تشرح خلق التعاون بين الصحابة ﷺ.</p>
  `
};

// --- العناصر ---
const modal = document.getElementById('article-modal');
const modalContent = document.getElementById('modal-content');
const closeModalBtn = document.getElementById('close-article');
const readMoreLinks = document.querySelectorAll('.read-more');

const searchInput = document.getElementById('article-search');
const articlesList = document.getElementById('articles-list');

const commentForm = document.getElementById('comment-form');
const commentName = document.getElementById('comment-name');
const commentText = document.getElementById('comment-text');
const commentsList = document.getElementById('comments-list');

// --- فتح الـModal عند الضغط على "اقرأ المزيد" ---
readMoreLinks.forEach(link => {
  link.addEventListener('click', () => {
    const contentKey = link.dataset.content;
    modalContent.innerHTML = articlesContent[contentKey] || '<p>المحتوى غير متوفر.</p>';
    modal.classList.remove('hidden');
  });
});

// --- إغلاق الـModal ---
closeModalBtn.addEventListener('click', () => {
  modal.classList.add('hidden');
});

// إغلاق عند الضغط خارج الـmodal-body
modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.classList.add('hidden');
  }
});

// --- البحث في المقالات ---
searchInput.addEventListener('input', () => {
  const filter = searchInput.value.toLowerCase();
  const articles = articlesList.querySelectorAll('.card');
  articles.forEach(article => {
    const text = article.textContent.toLowerCase();
    article.style.display = text.includes(filter) ? '' : 'none';
  });
});

// --- إضافة التعليقات ---
commentForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = commentName.value.trim() || 'زائر';
  const text = commentText.value.trim();
  if (!text) return;

  const commentItem = document.createElement('div');
  commentItem.classList.add('comment');
  commentItem.innerHTML = `<strong>${name}</strong>: <p>${text}</p>`;

  commentsList.appendChild(commentItem);
  commentForm.reset();
});


