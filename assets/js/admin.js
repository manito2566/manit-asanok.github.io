// admin.js — Custom Admin CMS
// Manages: Publications + Profile (Bio/Education/Positions/Awards/Training)
// News/Articles → handled by WordPress at asanoku.wordpress.com (linked separately)
// Depends on: github-api.js (window.GH)

function adminApp() {
  return {
    // ---------- Auth state ----------
    booting: true,
    authed: false,
    authError: '',
    user: null,
    tokenInput: '',
    showTokenHelp: false,

    // ---------- Tabs ----------
    tab: 'news',           // 'news' | 'publications' | 'profile' | 'help'

    // ---------- News (Featured articles) state ----------
    news: [],
    newsIndexSha: '',
    newsForm: emptyNewsForm(),
    newsEditingSlug: null,
    newsShowForm: false,
    newsExistingMdSha: '',
    newsPreview: '',
    newsUploading: false,
    newsUploadProgress: '',

    // ---------- Publications state ----------
    pubs: [],
    pubsSha: '',
    pubFilter: 'all',
    pubSearch: '',
    pubForm: emptyPubForm(),
    pubEditingId: null,
    pubShowForm: false,

    // ---------- Profile state ----------
    profile: null,
    profileSha: '',
    profileSection: 'bio',  // 'bio' | 'education' | 'positions' | 'awards' | 'training'

    // ---------- UI ----------
    saving: false,
    toast: '',
    toastType: 'info',

    // ---------- Init ----------
    async init() {
      const r = await GH.verifyToken();
      if (r.ok) {
        this.authed = true;
        this.user = r.user;
        await this.loadAll();
      } else if (GH.getToken()) {
        this.authError = `Token ไม่ถูกต้อง (${r.reason}). กรุณา login ใหม่`;
        GH.setToken('');
      }
      this.booting = false;
    },

    // ---------- Auth ----------
    async login() {
      if (!this.tokenInput.trim()) {
        this.authError = 'กรุณาใส่ token';
        return;
      }
      GH.setToken(this.tokenInput.trim());
      const r = await GH.verifyToken();
      if (!r.ok) {
        this.authError = `Login ไม่สำเร็จ (${r.reason})`;
        GH.setToken('');
        return;
      }
      this.authError = '';
      this.tokenInput = '';
      this.authed = true;
      this.user = r.user;
      this.notify('เข้าสู่ระบบสำเร็จ', 'success');
      await this.loadAll();
    },

    logout() {
      if (!confirm('ออกจากระบบ และลบ token ใน browser?')) return;
      GH.setToken('');
      this.authed = false;
      this.user = null;
      this.pubs = [];
      this.profile = null;
      this.notify('ออกจากระบบแล้ว', 'info');
    },

    async loadAll() {
      await Promise.all([this.loadNews(), this.loadPubs(), this.loadProfile()]);
    },

    // ============================================================
    // NEWS (Featured articles)
    // ============================================================
    async loadNews() {
      try {
        const f = await GH.getFile('data/news/index.json');
        this.news = f ? JSON.parse(f.content) : [];
        this.newsIndexSha = f ? f.sha : '';
        this.news.sort((a, b) => b.date.localeCompare(a.date));
      } catch (e) {
        this.notify(`โหลดข่าวสารไม่สำเร็จ: ${e.message}`, 'error');
      }
    },

    newNews() {
      this.newsForm = emptyNewsForm();
      this.newsEditingSlug = null;
      this.newsExistingMdSha = '';
      this.newsPreview = '';
      this.newsShowForm = true;
      setTimeout(() => document.getElementById('news-title-th')?.focus(), 50);
    },

    async editNews(slug) {
      const post = this.news.find(p => p.slug === slug);
      if (!post) return;
      this.newsEditingSlug = slug;
      try {
        const f = await GH.getFile(`data/news/${slug}.md`);
        if (!f) throw new Error('Markdown file not found');
        const body = f.content.replace(/^---[\s\S]*?---\s*/, '');
        this.newsForm = {
          slug,
          date: post.date,
          titleTh: post.title?.th || '',
          titleEn: post.title?.en || '',
          tags: (post.tags || []).join(', '),
          excerptTh: post.excerpt?.th || '',
          excerptEn: post.excerpt?.en || '',
          cover: post.cover || '',
          content: body.trim(),
        };
        this.newsExistingMdSha = f.sha;
        this.updateNewsPreview();
        this.newsShowForm = true;
      } catch (e) {
        this.notify(`เปิดโพสต์ไม่สำเร็จ: ${e.message}`, 'error');
      }
    },

    cancelNewsForm() {
      if ((this.newsForm.titleTh || this.newsForm.content) &&
          !confirm('ยกเลิกการแก้ไข? ข้อมูลที่ยังไม่ save จะหาย')) return;
      this.newsShowForm = false;
      this.newsForm = emptyNewsForm();
      this.newsEditingSlug = null;
    },

    updateNewsPreview() {
      if (window.marked) this.newsPreview = marked.parse(this.newsForm.content || '');
    },

    suggestNewsSlug() {
      const text = (this.newsForm.titleEn || this.newsForm.titleTh || '').toLowerCase();
      const slug = text
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50);
      const date = this.newsForm.date || new Date().toISOString().slice(0, 10);
      return slug ? `${date}-${slug}` : `${date}-post`;
    },

    async onNewsImageUpload(event, fieldName) {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      this.newsUploading = true;
      try {
        const uploaded = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          this.newsUploadProgress = `อัปโหลด ${i + 1}/${files.length}: ${file.name}`;
          const slug = this.newsEditingSlug || this.suggestNewsSlug();
          const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
          const path = `assets/img/news/${slug}-${Date.now()}-${safe}`;
          const buf = await file.arrayBuffer();
          const b64 = GH.bufferToBase64(buf);
          await GH.putBinaryFile(path, b64, `Upload image: ${path}`);
          uploaded.push(path);
        }
        if (fieldName === 'cover') {
          this.newsForm.cover = uploaded[0];
        } else {
          const inserts = uploaded.map(u => `\n![](${u})\n`).join('');
          this.newsForm.content += inserts;
          this.updateNewsPreview();
        }
        this.notify(`อัปโหลด ${uploaded.length} รูปสำเร็จ`, 'success');
      } catch (e) {
        this.notify(`อัปโหลดรูปไม่สำเร็จ: ${e.message}`, 'error');
      } finally {
        this.newsUploading = false;
        this.newsUploadProgress = '';
        event.target.value = '';
      }
    },

    async saveNews() {
      if (!this.newsForm.titleTh && !this.newsForm.titleEn) {
        this.notify('กรุณาใส่หัวข้ออย่างน้อย 1 ภาษา', 'error');
        return;
      }
      if (!this.newsForm.date) { this.notify('กรุณาใส่วันที่', 'error'); return; }
      if (!this.newsForm.content) { this.notify('กรุณาใส่เนื้อหา', 'error'); return; }

      this.saving = true;
      try {
        const slug = this.newsEditingSlug || this.newsForm.slug || this.suggestNewsSlug();
        const tags = this.newsForm.tags.split(',').map(t => t.trim()).filter(Boolean);

        // Build YAML frontmatter
        const frontmatter = [
          '---',
          'title:',
          `  th: "${escYaml(this.newsForm.titleTh)}"`,
          `  en: "${escYaml(this.newsForm.titleEn)}"`,
          `date: ${this.newsForm.date}`,
          tags.length ? `tags: [${tags.join(', ')}]` : '',
          this.newsForm.cover ? `cover: ${this.newsForm.cover}` : '',
          '---',
          '',
        ].filter(Boolean).join('\n');
        const mdContent = frontmatter + this.newsForm.content.trim() + '\n';

        const mdPath = `data/news/${slug}.md`;
        const action = this.newsEditingSlug ? 'Update' : 'Add';

        // 1) Write markdown
        await GH.putTextFile(
          mdPath, mdContent,
          `${action} article: ${this.newsForm.titleTh || this.newsForm.titleEn}`,
          this.newsExistingMdSha || undefined,
        );

        // 2) Update index.json
        const cur = await GH.getFile('data/news/index.json');
        let news = cur ? JSON.parse(cur.content) : [];
        news = news.filter(p => p.slug !== slug);
        news.unshift({
          slug,
          date: this.newsForm.date,
          title: { th: this.newsForm.titleTh || '', en: this.newsForm.titleEn || '' },
          tags,
          ...(this.newsForm.cover ? { cover: this.newsForm.cover } : {}),
          excerpt: {
            th: this.newsForm.excerptTh || '',
            en: this.newsForm.excerptEn || '',
          },
        });
        news.sort((a, b) => b.date.localeCompare(a.date));
        const newIndex = JSON.stringify(news, null, 2) + '\n';
        await GH.putTextFile(
          'data/news/index.json',
          newIndex,
          `${action} news index: ${slug}`,
          cur ? cur.sha : undefined,
        );

        this.notify(`บันทึก "${this.newsForm.titleTh || this.newsForm.titleEn}" สำเร็จ — เว็บอัปเดตใน 1-2 นาที`, 'success');
        this.newsShowForm = false;
        this.newsForm = emptyNewsForm();
        this.newsEditingSlug = null;
        await this.loadNews();
      } catch (e) {
        this.notify(`บันทึกไม่สำเร็จ: ${e.message}`, 'error');
      } finally {
        this.saving = false;
      }
    },

    async deleteNews(slug) {
      const post = this.news.find(p => p.slug === slug);
      if (!post) return;
      const t = post.title?.th || post.title?.en || slug;
      if (!confirm(`ลบข่าวสาร "${t}"?\n\nไฟล์ markdown จะถูกลบ และข้อมูลใน index จะหาย\n(รูปประกอบไม่ถูกลบ — ต้องลบเองภายหลังถ้าต้องการ)`)) return;
      this.saving = true;
      try {
        const md = await GH.getFile(`data/news/${slug}.md`);
        if (md) {
          await GH.deleteFile(`data/news/${slug}.md`, `Delete article: ${t}`, md.sha);
        }
        const cur = await GH.getFile('data/news/index.json');
        if (cur) {
          const news = JSON.parse(cur.content).filter(p => p.slug !== slug);
          const newIndex = JSON.stringify(news, null, 2) + '\n';
          await GH.putTextFile('data/news/index.json', newIndex, `Remove ${slug} from index`, cur.sha);
        }
        this.notify(`ลบ "${t}" สำเร็จ`, 'success');
        await this.loadNews();
      } catch (e) {
        this.notify(`ลบไม่สำเร็จ: ${e.message}`, 'error');
      } finally {
        this.saving = false;
      }
    },

    // ============================================================
    // PUBLICATIONS
    // ============================================================
    async loadPubs() {
      try {
        const f = await GH.getFile('data/publications.json');
        this.pubs = f ? JSON.parse(f.content) : [];
        this.pubsSha = f ? f.sha : '';
        this.pubs.sort((a, b) => b.year - a.year);
      } catch (e) {
        this.notify(`โหลด publications ไม่สำเร็จ: ${e.message}`, 'error');
      }
    },

    get filteredPubs() {
      const q = this.pubSearch.trim().toLowerCase();
      return this.pubs.filter(p => {
        if (this.pubFilter !== 'all' && p.type !== this.pubFilter) return false;
        if (q) {
          const hay = [
            p.title?.en || '',
            p.title?.th || '',
            (p.authors || []).join(' '),
            p.venue || '',
            String(p.year),
          ].join(' ').toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
    },

    pubCount(type) {
      if (type === 'all') return this.pubs.length;
      return this.pubs.filter(p => p.type === type).length;
    },

    newPub() {
      this.pubForm = emptyPubForm();
      this.pubEditingId = null;
      this.pubShowForm = true;
      setTimeout(() => document.getElementById('pub-title-en')?.focus(), 50);
    },

    editPub(id) {
      const p = this.pubs.find(x => x.id === id);
      if (!p) return;
      this.pubEditingId = id;
      this.pubForm = {
        id: p.id,
        type: p.type || 'international',
        year: p.year || new Date().getFullYear(),
        authors: (p.authors || []).join('; '),
        titleEn: p.title?.en || '',
        titleTh: p.title?.th || '',
        venue: p.venue || '',
        volume: p.volume || '',
        issue: p.issue || '',
        pages: p.pages || '',
        doi: p.doi || '',
        url: p.url || '',
        pdf: p.pdf || '',
        indexed: (p.indexed || []).join(', '),
      };
      this.pubShowForm = true;
    },

    cancelPubForm() {
      this.pubShowForm = false;
      this.pubForm = emptyPubForm();
      this.pubEditingId = null;
    },

    suggestPubId() {
      const firstAuthor = (this.pubForm.authors.split(';')[0] || 'paper')
        .toLowerCase()
        .replace(/[^a-z]/g, '')
        .slice(0, 12) || 'paper';
      const year = this.pubForm.year || new Date().getFullYear();
      const keyword = (this.pubForm.titleEn || this.pubForm.titleTh || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3 && !['with','from','using','that','this','their','will','about'].includes(w))[0] || 'paper';
      return `${firstAuthor}-${year}-${keyword}`.toLowerCase();
    },

    async savePub() {
      if (!this.pubForm.titleEn && !this.pubForm.titleTh) {
        this.notify('กรุณาใส่ชื่อบทความอย่างน้อย 1 ภาษา', 'error');
        return;
      }
      if (!this.pubForm.authors.trim()) {
        this.notify('กรุณาใส่รายชื่อผู้เขียน', 'error');
        return;
      }

      const id = this.pubEditingId || this.pubForm.id || this.suggestPubId();
      const f = this.pubForm;
      const newPub = {
        id,
        type: f.type,
        year: parseInt(f.year, 10),
        authors: f.authors.split(';').map(s => s.trim()).filter(Boolean),
        title: {},
      };
      if (f.titleEn) newPub.title.en = f.titleEn;
      if (f.titleTh) newPub.title.th = f.titleTh;
      if (f.venue) newPub.venue = f.venue;
      if (f.volume) newPub.volume = f.volume;
      if (f.issue) newPub.issue = f.issue;
      if (f.pages) newPub.pages = f.pages;
      if (f.doi) newPub.doi = f.doi;
      if (f.url) newPub.url = f.url;
      if (f.pdf) newPub.pdf = f.pdf;
      if (f.indexed) newPub.indexed = f.indexed.split(',').map(s => s.trim()).filter(Boolean);

      this.saving = true;
      try {
        const cur = await GH.getFile('data/publications.json');
        let pubs = cur ? JSON.parse(cur.content) : [];
        pubs = pubs.filter(p => p.id !== id);
        pubs.unshift(newPub);
        pubs.sort((a, b) => b.year - a.year);
        const newJson = JSON.stringify(pubs, null, 2) + '\n';
        const action = this.pubEditingId ? 'Update' : 'Add';
        await GH.putTextFile(
          'data/publications.json',
          newJson,
          `${action} publication: ${id}`,
          cur ? cur.sha : undefined,
        );
        this.notify(`บันทึก "${id}" สำเร็จ — เว็บอัปเดตใน 1-2 นาที`, 'success');
        this.pubShowForm = false;
        this.pubForm = emptyPubForm();
        this.pubEditingId = null;
        await this.loadPubs();
      } catch (e) {
        this.notify(`บันทึกไม่สำเร็จ: ${e.message}`, 'error');
      } finally {
        this.saving = false;
      }
    },

    async deletePub(id) {
      const p = this.pubs.find(x => x.id === id);
      if (!p) return;
      const t = p.title?.en || p.title?.th || id;
      if (!confirm(`ลบผลงาน "${t}"?\nID: ${id}\n\nลบถาวร — ย้อนได้ผ่าน git revert บน GitHub เท่านั้น`)) return;
      this.saving = true;
      try {
        const cur = await GH.getFile('data/publications.json');
        if (!cur) throw new Error('publications.json not found');
        const pubs = JSON.parse(cur.content).filter(p => p.id !== id);
        const newJson = JSON.stringify(pubs, null, 2) + '\n';
        await GH.putTextFile('data/publications.json', newJson, `Delete publication: ${id}`, cur.sha);
        this.notify(`ลบ "${t}" สำเร็จ`, 'success');
        await this.loadPubs();
      } catch (e) {
        this.notify(`ลบไม่สำเร็จ: ${e.message}`, 'error');
      } finally {
        this.saving = false;
      }
    },

    // ============================================================
    // PROFILE
    // ============================================================
    async loadProfile() {
      try {
        const f = await GH.getFile('data/profile.json');
        if (!f) throw new Error('profile.json not found');
        this.profile = JSON.parse(f.content);
        this.profileSha = f.sha;
      } catch (e) {
        this.notify(`โหลด profile ไม่สำเร็จ: ${e.message}`, 'error');
      }
    },

    addAward() {
      this.profile.awards = this.profile.awards || [];
      this.profile.awards.unshift({
        year: new Date().getFullYear() + 543,
        yearEn: new Date().getFullYear(),
        title: { th: '', en: '' },
      });
    },

    removeAward(i) {
      if (!confirm('ลบรายการนี้?')) return;
      this.profile.awards.splice(i, 1);
    },

    addTraining() {
      this.profile.training = this.profile.training || [];
      this.profile.training.unshift({
        title: { th: '', en: '' },
        by: { th: '', en: '' },
      });
    },

    removeTraining(i) {
      if (!confirm('ลบรายการนี้?')) return;
      this.profile.training.splice(i, 1);
    },

    addPosition() {
      this.profile.positions = this.profile.positions || [];
      this.profile.positions.unshift({
        year: '',
        yearEn: '',
        title: { th: '', en: '' },
        org: { th: '', en: '' },
      });
    },

    removePosition(i) {
      if (!confirm('ลบรายการนี้?')) return;
      this.profile.positions.splice(i, 1);
    },

    async saveProfile() {
      this.saving = true;
      try {
        const newJson = JSON.stringify(this.profile, null, 2) + '\n';
        const cur = await GH.getFile('data/profile.json');
        await GH.putTextFile(
          'data/profile.json',
          newJson,
          `Update profile (${this.profileSection})`,
          cur ? cur.sha : undefined,
        );
        this.profileSha = cur ? cur.sha : '';
        this.notify('บันทึก profile สำเร็จ', 'success');
        await this.loadProfile();
      } catch (e) {
        this.notify(`บันทึกไม่สำเร็จ: ${e.message}`, 'error');
      } finally {
        this.saving = false;
      }
    },

    // ============================================================
    // UI helpers
    // ============================================================
    notify(msg, type = 'info') {
      this.toast = msg;
      this.toastType = type;
      setTimeout(() => { this.toast = ''; }, type === 'error' ? 6000 : 3500);
    },
  };
}

function emptyNewsForm() {
  return {
    slug: '',
    date: new Date().toISOString().slice(0, 10),
    titleTh: '',
    titleEn: '',
    tags: '',
    excerptTh: '',
    excerptEn: '',
    cover: '',
    content: '',
  };
}

function escYaml(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function emptyPubForm() {
  return {
    id: '',
    type: 'international',
    year: new Date().getFullYear(),
    authors: '',
    titleEn: '',
    titleTh: '',
    venue: '',
    volume: '',
    issue: '',
    pages: '',
    doi: '',
    url: '',
    pdf: '',
    indexed: '',
  };
}

window.adminApp = adminApp;
