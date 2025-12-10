# 🚀 Quick Start Guide - Admin Blog Form

## 5 Minuta do Prve Objave

### Korak 1: Otvaranje Forme

```
Otvori u pretraživaču:
http://localhost:5000/blog/create.html
```

### Korak 2: Popunjavanje Osnovnih Podataka

```
📝 Naslov objave *
└─ Npr: "10 Savjeta za Zdrav Život"

🔗 URL slug *
└─ Npr: "10-savjeta-zdrav-zivot"
   (Može se auto-generirati iz naslova)

📄 Sažetak *
└─ Npr: "Otkrijte 10 praktičnih savjeta..."
   (Prikazuje se u blog listi)
```

### Korak 3: Dodaj Sadržaj

```
📝 Tekst objave *
└─ Unesite glavni tekst (min 50 znakova)

➕ Dodaj poglavlje
├─ TEXT: dodatni odlomci
├─ IMAGE: slike s opisima
└─ VIDEO: YouTube linkovi
```

### Korak 4: Upload Slike

```
🖼️ Naslovna slika *
├─ Drag & drop sliku ILI
├─ Klikni za odabir
└─ Slika se prikazuje kao pretpregled
```

### Korak 5: Odabir Kategorije i Status

```
🏷️ Kategorije
└─ Odaberi više kategorija

📊 Status *
└─ PUBLISHED (odmah vidljivo)
└─ DRAFT (skica za kasnije)
└─ SCHEDULED (budući datum)
```

### Korak 6: Spremi!

```
🎉 Kreiraj objavu
└─ Klikni gumb
└─ Objava se sprema
└─ Preusmjeren na blog listu
```

---

## 💻 Primjer: Pravi Post u 5 Minuta

### Unos Podataka

```
Naslov:
"5 Lakih Vježbi za Bolji Rano Ujutro"

Slug:
"5-lakih-vjezbi-rano-ujutro"

Sažetak:
"Započni dan s energijom. Evo 5 jednostavnih
vježbi koje trebaju samo 10 minuta."

Tekst:
"Dobro jutro! Znate li da redovito vježbanje
ujutro može poboljšati vašu energiju za cijeli dan?
U ovoj objavi želim s vama podijeliti 5 jednostavnih
vježbi koje sam ja koristim svaki dan..."

[+ Dodaj poglavlje]
├─ Poglavlje 1 (TEXT):
│  "Zagrijavanje (2 minute): Počnite s blagim
│   istezanjem i rotacijom zglobova..."
│
├─ Poglavlje 2 (IMAGE):
│  Naslov: "Vježba 1: Sklekovi"
│  Slika: yoga1.jpg
│  Opis: "20 sklekova za jačanje mišića"
│
└─ Poglavlje 3 (VIDEO):
   URL: https://youtu.be/...
   Opis: "Videoupute za sve vježbe"

Kategorije:
☑ Fitness
☑ Zdravlje
☑ Vježbanje

Status: PUBLISHED
Jezik: HR
Featured: ☐
```

### Rezultat

✅ Nova objava kreirana!

- ID: 42
- URL: `/blog/post.html?slug=5-lakih-vjezbi-rano-ujutro`
- Vidljiva javno
- Dodana u blog listu

---

## 🎯 Tipske Greške i Rješenja

### Greška #1: "Minimalno 3 znaka"

```
❌ Naslov: "OK"
✅ Naslov: "OK plan za jutro"
```

### Greška #2: "Sadržaj mora imati najmanje 50 znakova"

```
❌ Tekst: "Ovo je moj post"
✅ Tekst: "Ovo je moj post koji sadrži dovoljno
           znakova za minimalne zahtjeve sustava..."
```

### Greška #3: "Slika mora biti manja od 2 MB"

```
❌ Slika: 5 MB
✅ Slika: 1.2 MB (kompresirana)
```

### Greška #4: "Slug je već u upotrebi"

```
❌ Slug: "zdravi-zivot" (već postoji)
✅ Slug: "zdravi-zivot-2025" (novi)
```

---

## 📱 Responsive Prikaz

### Desktop (>1024px)

```
┌─────────────────────────────────────┐
│ SEKCIJA 1    │    SEKCIJA 2         │
├──────────────┼──────────────────────┤
│ SEKCIJA 3    │    SEKCIJA 4         │
│              │                      │
└──────────────┴──────────────────────┘
```

### Tablet (768-1023px)

```
┌──────────────────────────────┐
│ SEKCIJA 1 | SEKCIJA 2        │
├──────────────────────────────┤
│ SEKCIJA 3                    │
├──────────────────────────────┤
│ SEKCIJA 4                    │
└──────────────────────────────┘
```

### Mobile (<768px)

```
┌──────────────┐
│ SEKCIJA 1    │
├──────────────┤
│ SEKCIJA 2    │
├──────────────┤
│ SEKCIJA 3    │
├──────────────┤
│ SEKCIJA 4    │
└──────────────┘
```

---

## 🎓 Savjeti za Bolji Sadržaj

### Naslov

- Biti jasna i informativna
- Idealno 6-8 riječi
- ✅ "10 Savjeta za Bolji Rano Ujutro"
- ❌ "Post" ili "Novo"

### Sažetak

- Motivira da se čita više
- 100-160 znakova
- Sadrži ključne riječi
- ✅ "Otkrijte 10 praktičnih savjeta kako optimizirati vaš rani dio dana"
- ❌ "Ovo je post"

### Tekst

- Logička struktura
- Odlomci od 3-4 rečenice
- Jasni naslovi za poglavlja
- Zaključak na kraju

### Slike

- Relevantne za sadržaj
- Dobra rezolucija (1200x600 idealno)
- Kompresivane prije upload
- Jedinstveno za svaku objavu

### Kategorije

- 2-4 po objavi
- Relevantne za sadržaj
- Konzistentne s drugim postovima

---

## ⌨️ Keyboard Shortcuts (Budućno)

| Shortcut | Akcija           |
| -------- | ---------------- |
| Ctrl+S   | Spremi objavu    |
| Ctrl+D   | Spremi kao skicu |
| Tab      | Sljedeće polje   |
| Enter    | Submit forma     |
| Esc      | Odustani         |

(Dostupno u budućoj verziji)

---

## 🔍 Gdje Mogu Vidjeti Moju OBJAVU?

### Prije Objave

```
❌ Nije vidljiva nigdje (ako je DRAFT)
```

### Poslije Objave (PUBLISHED)

```
✅ /blog/index.html - vidiš je u listi
✅ /blog/post.html?id=123 - direktan link
✅ Na početnoj stranici (ako je featured)
```

### Ako je SCHEDULED

```
⏰ Bit će vidljiva nakon zakazanog vremena
```

### Ako je HIDDEN

```
🔒 Skrivena s javne liste (samo admin zna)
```

---

## 📚 Više Informacija

### Detaljna Dokumentacija

👉 Čitaj: `docs/BLOG_ADMIN_GUIDE.md`

### Primjeri i Scenariji

👉 Čitaj: `docs/EXAMPLES.md`

### Tehnička Arhitektura

👉 Čitaj: `docs/ARCHITECTURE.md`

### Kompletan Pregled

👉 Čitaj: `README_ADMIN.md`

---

## ✅ Checklist za Novu Objavu

- [ ] Naslov (min 3 znaka)
- [ ] Slug (jedinstvena, samo-generirana)
- [ ] Sažetak (obavezno)
- [ ] Tekst (min 50 znakova)
- [ ] Naslovna slika (obavezno, max 2 MB)
- [ ] Minimum 1 kategorija
- [ ] Status odabran
- [ ] Pregledano prije spremanja
- [ ] Sprema je uspješna
- [ ] Vidljiva je gdje trebam biti

---

## 🎉 Gotovo!

Sada znate kako koristiti admin blog formu!

### Sljedeće:

1. Napravite prvu objavu
2. Pokušajte s različitim vrstama poglavlja
3. Testirajte sve funkcionalnosti
4. Čitajte detaljnu dokumentaciju za napredne opcije

Sretno s blogganjem! 📝✨
