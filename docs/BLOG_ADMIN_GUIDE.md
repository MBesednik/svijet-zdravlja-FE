# Blog Admin Form - Dokumentacija

## Pregled

Sustav za upravljanje blog objavama omogućava adminu da kreira, ažurira i upravlja blog postovima. Sveobuhvatna forma komunicira s backend API-jem i podržava sve potrebne funkcionalnosti.

## Struktura Forme

### 1. **Osnovne Informacije**

- **Naslov objave** (obavezno, min 3 znaka)
- **URL slug** (obavezno, mora biti jedinstvena, format: `naziv-objave`)
- **Sažetak** (obavezno, prikazuje se kao pretpregled)

### 2. **SEO Optimizacija**

- **Meta naslov** - naslov za pretraživače (do 60 znakova)
- **Meta opis** - opis za pretraživače (do 160 znakova)

### 3. **Sadržaj Objave**

- **Tekst objave** (obavezno, min 50 znakova)
- **Poglavlja** - dinamička sekcija za dodavanje različitih tipova sadržaja:
  - **TEXT**: Običan tekst
  - **IMAGE**: Slika s opisom i alt tekstom
  - **VIDEO**: Video ili YouTube link

### 4. **Naslovna Slika**

- **Drag & drop** ili klik za upload
- Podržani formati: JPG, PNG, WEBP (max 2 MB)
- Pretpregled se automatski prikazuje

### 5. **Kategorije**

- Dinamička lista kategorija učitana s backenda
- Mogućnost odabira više kategorija
- Odabrane kategorije se prikazuju kao badge-ovi

### 6. **Status I Objava**

- **Status**: DRAFT, PUBLISHED, SCHEDULED, HIDDEN, ARCHIVED
- **Zakazivanje**: Ako je status "SCHEDULED", pojavljuje se datum/vrijeme polja
- **Jezik**: HR ili EN
- **Istaknut post**: Checkbox za Featured status

## Kako Funkcionira

### Inicijalizacija

```javascript
// Forma se inicijalizira pri učitavanju stranice
document.addEventListener("DOMContentLoaded", initForm);
```

### Tok Rada

1. **Učitavanje**

   - Ako je `id` u URL-u, učitavaju se postojeći podaci posta
   - Kategorije se automatski učitavaju s backenda
   - Prikazuje se "Uređivanje objave" naslov

2. **Popunjavanje**

   - Korisnik popunjava sve potrebne polje
   - Dodaje poglavlja pomoću "+ Dodaj poglavlje" dugmeta
   - Odabira kategorije iz liste
   - Učitava naslovnu sliku (drag & drop ili klik)

3. **Validacija**

   - Forma provjerava obavezna polja
   - Validira slug format
   - Provjerava veličinu slike
   - Prikazuje greške korisnikuutor

4. **Slanje**

   - Forma se konvertira u `FormData` objekt
   - Svi parametri se pakuju u `payload` JSON polje
   - Datoteke se dodaju kao odvojeni dijelovi (hero*image, chapter*\*.image)
   - POST zahtjev se šalje na `/api/admin/posts` (kreiraj) ili PUT (ažuriraj)

5. **Odgovara**
   - Backend vraća kreirani post s ID-om
   - Korisnik se preusmjerava na blog listu s statusom

## API Komunikacija

### Autentifikacija

Sve zahtjeve koriste `Authorization: Bearer {token}` header.
Token se čuva u `localStorage` kao `svz_admin_token`.

### Endpoints

#### Učitavanje Kategorija

```
GET /api/admin/categories
Authorization: Bearer {token}
```

Odgovara:

```json
[
  {
    "id": 1,
    "name": "Prehrana",
    "slug": "prehrana",
    "description": "..."
  }
]
```

#### Kreiraj Post

```
POST /api/admin/posts
Authorization: Bearer {token}
Content-Type: multipart/form-data

--boundary
Content-Disposition: form-data; name="payload"
Content-Type: application/json

{
  "slug": "naziv-objave",
  "title": "Naslov objave",
  "summary": "Kratak sažetak",
  "status": "PUBLISHED",
  "is_featured": false,
  "meta_title": "...",
  "meta_description": "...",
  "lang": "hr",
  "category_ids": [1, 2],
  "chapters": [
    {
      "position": 0,
      "type": "TEXT",
      "text_content": "..."
    }
  ]
}

--boundary
Content-Disposition: form-data; name="hero_image"; filename="slika.jpg"
Content-Type: image/jpeg

[binarni sadržaj slike]
--boundary--
```

#### Ažuriraj Post

```
PUT /api/admin/posts/{id}
Authorization: Bearer {token}
Content-Type: multipart/form-data

[ista struktura kao kreiraj]
```

## Poglavlja (Chapters)

Svaki post može imati više poglavlja različitih tipova:

### TEXT Poglavlje

```json
{
  "position": 0,
  "type": "TEXT",
  "title": null,
  "text_content": "Tekst poglavlja..."
}
```

### IMAGE Poglavlje

```json
{
  "position": 1,
  "type": "IMAGE",
  "title": "Naslov slike",
  "caption": "Opis slike",
  "alt_text": "Alternativni tekst",
  "chapter_image_field": "chapter_1_image"
}
```

Datoteka se šalje kao: `chapter_1_image` (multipart polje)

### VIDEO Poglavlje

```json
{
  "position": 2,
  "type": "VIDEO",
  "external_video_url": "https://youtube.com/watch?v=...",
  "caption": "Opis videa"
}
```

## Poruke Statusa

Forma prikazuje različite poruke tijekom obrade:

- **info**: Obrada u tijeku (plava)
- **success**: Uspješno spremljeno (zelena)
- **error**: Greška pri spremanju (crvena)
- **warning**: Upozorenja (žuta)

## Validacija

### Obavezna Polja

- `title` (naslov) - min 3 znaka
- `slug` - format: samo mala slova, brojeve i crtice
- `summary` - sažetak
- `status` - obavezno
- `lang` - obavezno
- `hero_image` - obavezna naslovna slika

### Uvjetna Polja

- `scheduled_for` - obavezno ako je status `SCHEDULED`

## Drag & Drop za Slike

Naslovna slika podržava drag & drop:

1. Korisnik može prevući sliku na dropzone
2. Ili kliknuti za standardni file picker
3. Slika se prikazuje kao pretpregled
4. Validacija se vrši automatski

## Poglavlja - Dodavanje i Uređivanje

### Dodaj Poglavlje

Kliknuti "+ Dodaj poglavlje" dugme dodaj novo poglavlje.

### Uređivanje Poglavlja

1. Odaberite tip (TEXT, IMAGE, VIDEO)
2. Popunite specifična polja za tip
3. Za slike: odaberite datoteku
4. Za videoe: unesite URL

### Brisanje Poglavlja

Kliknite "Ukloni" dugme na pogavlju.

## Kategorije

### Odabir Kategorija

1. Lista kategorija se učitava s backenda
2. Kliknite checkbox pored kategorije
3. Odabrana kategorija se pojavljuje kao badge
4. Uklonite s X gumbom na badge-u

## Status Sekvence

### DRAFT (Skica)

- Objava nije vidljiva javno
- Može se uređivati više puta
- Korisnik može je bilo kada objaviti

### PUBLISHED

- Objava je odmah vidljiva javno
- Prikazuje se u blog listi
- Ima `published_at` timestamp

### SCHEDULED

- Objava će biti objavljena u budućnosti
- Mora imati `scheduled_for` datum
- Prikazuje se kao zakazana

### HIDDEN

- Objava postoji ali je skrivena
- Nije vidljiva u javnoj listi

### ARCHIVED

- Objava je arhivirana
- Čini se kao najstarija

## Primjer Kompletnog Toka

```javascript
// 1. Korisnik otvara /blog/create.html
// 2. Forma se inicijalizira, učitavaju se kategorije

// 3. Korisnik popunjava podatke:
//    - Naslov: "5 Brzih Ideja za Zdrav Doručak"
//    - Slug: "5-brzih-ideja-zdrav-dorucak"
//    - Sažetak: "Otkrijte 5 jednostavnih recepata za zdrav početak dana"
//    - Status: "PUBLISHED"
//    - Jezik: "HR"
//    - Kategorije: [Prehrana, Zdravlje]

// 4. Dodaje poglavlja:
//    - TEXT: Uvod
//    - IMAGE: Slika recepata + opis
//    - TEXT: Savjeti
//    - VIDEO: YouTube video s preparacijom

// 5. Učitava naslovnu sliku (drag & drop)

// 6. Klikne "Kreiraj objavu"

// 7. Forma se validira i šalje na backend

// 8. Backend vraća novi post s ID-om

// 9. Korisnik se preusmjerava na /blog/index.html?status=created&id=123

// 10. Lista prikazuje novu objavu s statusnom porukom
```

## Greške i Rješenja

| Greška                          | Rješenje                                      |
| ------------------------------- | --------------------------------------------- |
| "Niste prijavljeni"             | Prijavite se ili provjerite token             |
| "Obavezna polja nisu popunjena" | Popunite sva polja označena sa \*             |
| "Slika mora biti manja od 2 MB" | Kompresirana sliku ili koristite manji format |
| "Slug mora biti jedinstvena"    | Izbjerite drugi slug                          |
| "Zakazivanje zahtijeva datum"   | Odaberite datum ako je status SCHEDULED       |

## Napredne Opcije

### Autosave Draft

Mogućnost dodavanja autosave funkcionalanosti:

```javascript
// Spremi formu kao draft svaki n sekundi
setInterval(() => {
  saveDraft();
}, 30000); // svaki 30 sekundi
```

### Rich Text Editor

Za kompleksniji sadržaj, može se integrirati:

- TinyMCE
- Quill
- CKEditor

### Image Optimization

- Automatska kompresija prije upload
- Generiranje thumbnails
- Responsive images

---

**Verzija**: 1.0
**Zadnja ažuriranja**: 2025-12-10
