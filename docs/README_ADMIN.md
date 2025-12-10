# Svijet Zdravlja - Admin Blog Creation System

## Pregled Projekta

Kompletan sustav za upravljanje blog objavama s modernim, responzivnim suceljem. Sveobuhvatna forma omogućava adminu da kreira blog postove s bogatim sadržajem, uključujući tekstualna poglavlja, slike i videoe.

## 📁 Datotečna Struktura

```
blog/
├── create.html          # Admin forma za kreiranje/ažuriranje postova
├── index.html           # Lista svih postova
└── post.html            # Prikaz pojedinačne objave

styles/
├── main.css             # Globalni stilovi
└── admin.css            # Stilovi admin forme (novo)

scripts/
├── main.js              # Globalni JavaScript
├── blog.js              # Osnovna blog funkcionalnost
└── admin-form.js        # Admin forma JavaScript (novo)

docs/
├── IMPLEMENTATION_NOTES.md
└── BLOG_ADMIN_GUIDE.md  # Detaljne upute (novo)
```

## 🎨 Dizajn i Sučelje

### Glavne Sekcije Forme

#### 1. Osnovne Informacije

- **Naslov**: Glavna poruka objave (obavezno)
- **Slug**: URL identifikator, automatski generiran
- **Sažetak**: Kratki pregled za listu objava

#### 2. SEO Optimizacija

- **Meta naslov**: Do 60 znakova za pretraživače
- **Meta opis**: Do 160 znakova za search snippete

#### 3. Sadržaj

- **Tekst objave**: Glavno poglavlje
- **Poglavlja**: Dinamički dodajivanje različitih tipova:
  - 📝 Tekst
  - 🖼️ Slike
  - 🎥 Videoe

#### 4. Media

- **Naslovna slika**: Drag & drop suport
- Automatski pretpregled
- Validacija veličine (max 2 MB)

#### 5. Kategorije

- Učitavaju se s backenda
- Višestruki odabir
- Vizualni badge prikaz

#### 6. Status i Objava

- **Status**: DRAFT, PUBLISHED, SCHEDULED, HIDDEN, ARCHIVED
- **Zakazivanje**: Datum/vrijeme za SCHEDULED status
- **Jezik**: HR ili EN
- **Featured**: Istaknut post

## 🚀 Kako Koristiti

### Otvaranje Forme

```
http://localhost:5000/blog/create.html  # Kreiranje nove objave
http://localhost:5000/blog/create.html?id=123  # Uređivanje postojeće
```

### Korak po Korak

1. **Popunite Osnovne Podatke**

   - Unesite naslov (min 3 znaka)
   - Slug se može automatski generirati ili unijeti ručno
   - Napravite sažetak

2. **Dodajte SEO Podatke** (opcionalno)

   - Meta naslov
   - Meta opis

3. **Napišite Sadržaj**

   - Tekst glavnog poglavlja
   - Dodajte dodatna poglavlja
   - Odaberite tip (tekst/slika/video)

4. **Učitajte Naslovnu Sliku**

   - Drag & drop ili klik
   - JPG, PNG ili WEBP format
   - Max 2 MB

5. **Odaberite Kategorije**

   - Kliknite checkbox pored kategorije
   - Može se odabrati više kategorija

6. **Postavite Status**

   - Odaberite status objave
   - Ako je SCHEDULED, odaberite datum
   - Označite ako je featured

7. **Spremi ili Objavi**
   - "Kreiraj objavu" - objava se kreira s odabranim statusom
   - "Spremi kao skicu" - sprema kao DRAFT

## 💻 Tehnička Dokumentacija

### Backend API

Forma komunicira s backend API-jem:

```
POST /api/admin/posts              # Kreiraj post
PUT /api/admin/posts/{id}          # Ažuriraj post
GET /api/admin/categories          # Učitaj kategorije
```

### Struktura Zahtjeva

```javascript
FormData {
  payload: JSON.stringify({
    slug: "naziv-objave",
    title: "Naslov",
    summary: "Sažetak",
    status: "PUBLISHED",
    is_featured: false,
    meta_title: "Meta naslov",
    meta_description: "Meta opis",
    lang: "hr",
    category_ids: [1, 2, 3],
    chapters: [
      {
        position: 0,
        type: "TEXT",
        text_content: "..."
      },
      {
        position: 1,
        type: "IMAGE",
        caption: "..."
      }
    ]
  }),
  hero_image: File,
  chapter_0_image: File,
  chapter_1_image: File
}
```

### Validacija Forme

- ✅ Naslov: min 3 znaka
- ✅ Slug: unique, format `naziv-objave`
- ✅ Sažetak: obavezno
- ✅ Status: obavezno
- ✅ Jezik: obavezno
- ✅ Naslovna slika: obavezno (JPG/PNG/WEBP, max 2MB)
- ✅ Scheduled_for: obavezno ako je status SCHEDULED

## 🎯 Značajke

### ✨ Funkcionalnosti

- ✅ **Kreiraj post** - Nova objava s svim podacima
- ✅ **Ažuriraj post** - Uredi postojeću objavu
- ✅ **Dinamička poglavlja** - Dodaj text/image/video poglavlja
- ✅ **Kategorije** - Odabir iz backenda liste
- ✅ **Zakazivanje** - Postavi budući datum objave
- ✅ **Drag & Drop** - Upload slike jednostavno
- ✅ **Validacija** - Provjera svih polja
- ✅ **Responsive** - Radi na svim uređajima
- ✅ **Statusne poruke** - Povratna информација korisniku

### 🎨 Dizajn

- **Moderne boje**: Zelena paleta u skladu s brandom
- **Čitljivost**: Jasna hierarhija i razmak
- **Uživeljive forme**: Input polja s hover/focus efektima
- **Responsive**: Mobil, tablet, desktop
- **Pristupačnost**: ARIA labels, semantički HTML

## 📱 Responsivnost

- **Mobile** (<768px): Jednokanalni layout
- **Tablet** (768px-1023px): Двоканalni layout
- **Desktop** (>1024px): Puni layout

## 🔒 Sigurnost

- Token-based autentifikacija (JWT)
- CSRF zaštita
- Validacija na client i server strani
- Secure file upload

## 🐛 Rješavanje Problema

### Greške pri Učitavanju

**Problem**: "Ne mogu učitati kategorije"

- Provjerite da je backend pokrenut
- Provjerite JWT token u localStorage
- Provjerite CORS postavke

**Problem**: "Slika nije učitana"

- Provjerite veličinu slike (max 2 MB)
- Format mora biti JPG, PNG ili WEBP
- Provjerite dozvole za upload

**Problem**: "Slug je već u upotrebi"

- Odaberite drugačiji slug
- Slug mora biti jedinstvena

## 📊 Statusne Poruke

| Status  | Opis              |
| ------- | ----------------- |
| info    | Obrada u tijeku   |
| success | Uspješno spraćeno |
| error   | Greška            |
| warning | Upozorenje        |

## 🔄 Tok Ažuriranja

1. Korisnik otvori `/blog/create.html?id=123`
2. Forma učitava postojeće podatke
3. Korisnik izvršava izmjene
4. Klikne "Ažuriraj objavu"
5. PUT zahtjev se šalje na `/api/admin/posts/123`
6. Backend ažurira objavu
7. Korisnik se preusmjerava s porukom o uspjehu

## 🎓 Napredne Opcije

### Mogućnosti za Proširenje

1. **Rich Text Editor**

   - Integracija TinyMCE ili Quill-a
   - Oblikovanje teksta, liste, linkovi

2. **Image Gallery**

   - Odabir s postoje galerije
   - Crop/resize slike

3. **Draft Auto-Save**

   - Automatske sprema svakih 30s
   - Povrat posljednje spremljene verzije

4. **Collaboration**

   - Više admin korisnika
   - Verzioniranje promjena

5. **Preview**
   - Live preview kako će izgledati post
   - Mobile preview

## 📚 Dodatne Resurse

- [BLOG_ADMIN_GUIDE.md](./docs/BLOG_ADMIN_GUIDE.md) - Detaljne upute
- [IMPLEMENTATION_NOTES.md](./docs/IMPLEMENTATION_NOTES.md) - Tehničke napomene
- Backend dokumentacija - API specifikacija

## 🤝 Podrška

Za pitanja ili probleme:

1. Provjerite dokumentaciju
2. Provjerite browser konzolu za greške
3. Provjerite network tab u dev tools
4. Kontaktirajte tim razvoja

---

**Verzija**: 1.0
**Status**: ✅ Proizvodnja
**Zadnja ažuriranja**: 2025-12-10
**Autor**: Development Team
