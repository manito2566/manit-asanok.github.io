# Dr. Manit Asanok — Academic Portfolio

เว็บไซต์แฟ้มสะสมผลงานวิชาการ (Academic Portfolio) ของ ผู้ช่วยศาสตราจารย์ ดร.มานิตย์ อาษานอก
ภาควิชาเทคโนโลยีและสื่อสารการศึกษา คณะศึกษาศาสตร์ มหาวิทยาลัยมหาสารคาม

**Tech:** Static HTML/CSS/JS + Tailwind CSS (CDN) + Alpine.js — ไม่มี build step
**Hosting:** GitHub Pages
**Languages:** Bilingual TH / EN

---

## โครงสร้างโปรเจกต์

```
portfolio-website/
├── index.html              # หน้าหลัก
├── publications.html       # ผลงานวิจัย (filter/search)
├── teaching.html           # การสอน + นิสิตที่ปรึกษา
├── news.html               # ข่าวสาร/blog
├── contact.html            # ฟอร์มติดต่อ
├── 404.html                # error page
├── assets/
│   ├── css/custom.css      # custom styles
│   ├── js/                 # i18n, main, publications
│   ├── img/                # รูปโปรไฟล์, og-image
│   └── docs/               # CV PDF
├── data/
│   ├── profile.json        # ข้อมูลส่วนตัว/ประวัติ
│   ├── publications.json   # ❗ Single source of truth สำหรับผลงานทั้งหมด
│   ├── teaching.json       # รายวิชาที่สอน
│   └── news/               # markdown posts + index.json
└── locales/
    ├── th.json             # UI ภาษาไทย
    └── en.json             # UI ภาษาอังกฤษ
```

---

## วิธีรันแบบ Local

ไม่ต้อง install อะไรเลย — ใช้ static server ใดก็ได้

```powershell
# ใน PowerShell (Python ติดตั้งใน Windows)
cd C:\Users\manito\Documents\portfolio-website
python -m http.server 8000
```
แล้วเปิด `http://localhost:8000` ใน browser

หรือ ใน VS Code: ติดตั้ง extension **Live Server** แล้วคลิกขวาที่ `index.html` → Open with Live Server

---

## ❗ วิธีเพิ่มผลงานวิจัยใหม่

แก้ไฟล์ **`data/publications.json`** เพียงไฟล์เดียว เพิ่ม record ตามรูปแบบนี้

```json
{
  "id": "asanok-2026-new-paper",
  "type": "international",
  "year": 2026,
  "authors": ["Asanok, M.", "Coauthor, A."],
  "title": {
    "en": "Title in English",
    "th": "ชื่อภาษาไทย (ถ้ามี)"
  },
  "venue": "Journal Name",
  "volume": "10",
  "issue": "2",
  "pages": "1-15",
  "doi": "10.xxxx/yyyy",
  "url": "",
  "pdf": "",
  "indexed": ["Scopus"]
}
```

### ค่าของ `type`
| ค่า | ความหมาย | สีและ Badge |
|---|---|---|
| `international` | วารสารนานาชาติ Scopus | ส้ม "Scopus" |
| `national` | วารสารระดับชาติ TCI | ฟ้า "TCI" |
| `conference` | ประชุมวิชาการ | ม่วง "Conference" |
| `academic` | บทความวิชาการ | เขียว "Academic" |
| `book` | หนังสือ/ตำรา | น้ำตาล "Book" |

หลังเพิ่ม → `git add data/publications.json && git commit -m "Add 2026 paper" && git push`
GitHub Pages จะ deploy อัตโนมัติภายใน 1-2 นาที

---

## วิธีเพิ่มข่าว / Blog post

1. สร้างไฟล์ markdown ใน `data/news/` ชื่อ `YYYY-MM-DD-slug.md` พร้อม YAML frontmatter
   ```markdown
   ---
   title:
     th: "หัวข้อภาษาไทย"
     en: "English Title"
   date: 2026-05-21
   tags: [tag1, tag2]
   ---

   เนื้อหา markdown...
   ```
2. เพิ่ม entry ใน `data/news/index.json` (เรียงล่าสุดอยู่บน):
   ```json
   {
     "slug": "2026-05-21-my-post",
     "date": "2026-05-21",
     "title": { "th": "...", "en": "..." },
     "tags": ["..."],
     "excerpt": { "th": "...", "en": "..." }
   }
   ```

---

## ขั้นตอน Deploy ลง GitHub Pages

```powershell
# ครั้งแรก
cd C:\Users\manito\Documents\portfolio-website
git init
git add .
git commit -m "Initial commit: portfolio website"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo>.git
git push -u origin main
```

แล้วเปิด GitHub repo → **Settings → Pages → Source: Deploy from branch → main / root** → Save

ภายใน 1-2 นาทีเว็บจะออนไลน์ที่ `https://<your-username>.github.io/<repo>/`

### Custom Domain (ภายหลัง)
1. ซื้อ domain (เช่น `manit-asanok.com` ที่ Namecheap, Cloudflare, GoDaddy)
2. สร้างไฟล์ `CNAME` ในโปรเจกต์ root มีเนื้อหาเป็น domain ของท่าน
3. ที่ DNS ของ domain provider: ตั้ง A record ไปที่ GitHub Pages IP
   ```
   185.199.108.153
   185.199.109.153
   185.199.110.153
   185.199.111.153
   ```
4. กลับมาที่ GitHub Pages settings → ใส่ custom domain → tick "Enforce HTTPS"

---

## วิธี Regenerate CV PDF

CV PDF ถูก generate อัตโนมัติจากข้อมูลใน `data/profile.json` + `data/publications.json` ด้วย Python script

ครั้งแรกติดตั้ง dependency:
```powershell
pip install reportlab pypdf
```

ทุกครั้งที่อัปเดตข้อมูลแล้วอยาก regenerate CV:
```powershell
cd C:\Users\manito\Documents\portfolio-website
python scripts/generate_cv.py
```
ผลลัพธ์: `assets/docs/CV_Manit_Asanok.pdf` (~76 KB, 5 หน้า)

แล้ว commit + push เหมือนเดิม

---

## รายการสิ่งที่ต้องเตรียม (ก่อน Deploy จริง)

| รายการ | ตำแหน่งไฟล์ | สถานะ |
|---|---|---|
| รูปโปรไฟล์ (500×500px square) | `assets/img/profile.jpg` | ⚠ ยังไม่มี |
| ไฟล์ CV PDF | `assets/docs/CV_Manit_Asanok.pdf` | ✅ มีแล้ว (auto-generated) |
| Open Graph image (1200×630px) | `assets/img/og-image.png` | ⚠ ยังไม่มี (มี fallback) |
| Formspree Form ID | `contact.html` (แทน `YOUR_FORMSPREE_ID`) | ⚠ ยังไม่ตั้งค่า |

ตอนยังไม่มีรูป — เว็บจะแสดงตัวอักษร "M" บนวงกลม gradient แทน (มี fallback ใน HTML)

---

## License

© 2026 Manit Asanok. All rights reserved.
