# Primjeri Korištenja - Admin Blog Form

## Primjer 1: Kreiranje Osnovne Objave

### Unos Podataka

```
Naslov: "10 Savjeta za Zdraviji Život"
Slug: "10-savjeta-zdraviji-zivot"
Sažetak: "Otkrijte 10 jednostavnih savjeta koji će vam pomoći da živite zdrapije i sretnnije."

Status: PUBLISHED
Jezik: HR
Featured: ☑️ (označeno)

Meta naslov: "10 Savjeta za Zdrav Život - Svijet Zdravlja"
Meta opis: "Naučite 10 praktičnih savjeta za bolji i zdraviji način života."
```

### Poglavlja

#### Poglavlje 1 - Tekst (Uvod)

```
Tip: TEXT
Tekst: "Zdravlje je bogatstvo koje često zanemarujemo u brzini modernog života.
U ovoj objavi dijelim s vama 10 savjeta koji su meni pomogli da poboljšam
kvalitetu moga življenja. Nadam se da će vam biti korisni!"
```

#### Poglavlje 2 - Slika

```
Tip: IMAGE
Naslov: "Vježbanje je Ključno"
Slika: fitness.jpg
Opis: "Redovitim vježbanjem možete poboljšati svojefizičku i mentalnu zdravlje."
Alt tekst: "Osoba koja se vježba u prirodi"
```

#### Poglavlje 3 - Tekst

```
Tip: TEXT
Tekst: "Preporučujem da počnete s laganim vježbama kao što su šetnja,
jogging ili yoga. Postepeno možete povećati intenzitet kako se vaše telo
prilagođava."
```

### Kategorije

- ☑️ Zdravlje
- ☑️ Fitness
- ☑️ Savjeti

### Naslovna Slika

```
Datoteka: header-health.jpg
Format: JPEG
Veličina: 1.5 MB
Dimenzije: 1200x600px
```

### Rezultat

**Kreirani Post:**

- ID: 42
- Status: Odmah objavljeno
- URL: `/blog/post.html?slug=10-savjeta-zdraviji-zivot`
- Poruka: "Objava je uspješno kreirana!"

---

## Primjer 2: Zakazana Objava

### Unos Podataka

```
Naslov: "Jesenski Zdravstveni Pregled - Što Trebate Znati"
Slug: "jesenski-zdravstveni-pregled"
Sažetak: "Pripremi se za jesenski zdravstveni pregled s našim kompletnim vodičem."

Status: SCHEDULED
Zakazano za: 2025-09-21 08:00
Jezik: HR
Featured: ☐ (nije označeno)
```

### Poglavlja

#### Poglavlje 1

```
Tip: TEXT
Tekst: "Jesen je idealno vrijeme za redovit zdravstveni pregled.
Evo što trebate znati prije nego što posjetite liječnika..."
```

#### Poglavlje 2

```
Tip: IMAGE
Naslov: "Što Donijeti na Pregled"
Slika: checkup-items.png
Opis: "Važni dokumenti i informacije koje trebate ponijeti"
```

#### Poglavlje 3

```
Tip: VIDEO
URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ
Opis: "Video: Kako se Pripremiti za Zdravstveni Pregled"
```

### Kategorije

- ☑️ Zdravlje
- ☑️ Prevencija

### Rezultat

- Status: SCHEDULED
- Objavit će se: 21. září 2025. u 08:00
- Poruka: "Objava je zakazana za 21.9.2025."

---

## Primjer 3: Ažuriranje Postojeće Objave

### Otvaranje za Uređivanje

```
URL: /blog/create.html?id=42
```

### Promjene

**Prije:**

```
Naslov: "10 Savjeta za Zdraviji Život"
Status: PUBLISHED
Kategorije: [Zdravlje, Fitness, Savjeti]
```

**Poslije:**

```
Naslov: "10+ Savjeta za Zdraviji Život (Ažurirano 2025)"
Status: PUBLISHED
Kategorije: [Zdravlje, Fitness, Savjeti, Nutricionizam]
```

### Dodane Izmjene

1. Ažurirano poglavlje 1 s novim informacijama
2. Dodana dva nova poglavlja
3. Dodana nova kategorija
4. Ažuriran meta opis

### Rezultat

- Poruka: "Objava je ažurirana!"
- Verzija brojač: 5
- Korisnik se vraća na listu s statusom

---

## Primjer 4: Objava s Bogatim Sadržajem

### Multi-Media Objava

```
Naslov: "Recept: Zdravi Smoothie Bowl"
Slug: "recept-zdravi-smoothie-bowl"
Sažetak: "Naučite kako napraviti ukusni i zdrav smoothie bowl s 5 varijacija."
```

### Poglavlja (7 poglavlja)

1. **TEXT** - Uvod i nutritivna vrijednost
2. **IMAGE** - Gotov smoothie bowl
3. **TEXT** - Osnovni recept s ingredijensima
4. **TEXT** - Uputama za pripremu
5. **VIDEO** - YouTube video s demonstracijom
6. **IMAGE** - 5 varijacija sa slicama
7. **TEXT** - Savjeti za prilagodbu

### Status

```
Status: PUBLISHED
Featured: ☑️
Kategorije: [Prehrana, Recepti, Zdravlje]
```

### Rezultat

Objava s kompletnim vodiči - tekst, slike, videoi i savjeti sve na jednom mjestu.

---

## Primjer 5: Skica za Kasniju Objavu

### Neizvršena Objava

```
Naslov: "Novo Istraživanje: Veza Spavanja i Zdravlja"
Slug: "novo-istrazivanje-veza-spavanja-zdravlja"
Sažetak: "Što tvrdi novo istraživanje o zdravstvenim efektima kvalitetnog spavanja?"

Status: DRAFT
Jezik: HR
```

### Sadržaj

```
Poglavlje 1 - TEXT:
"Istraživanje koje je nedavno objavljeno..."
(Samo početak, trebam dovršiti nakon što pročitam sve izvore)

Poglavlje 2 - Nedovršeno:
"[TODO: Dodati infografiku s podacima]"
```

### Korištenje

1. Korisnik klikne "Spremi kao skicu"
2. Objava se sprema kao DRAFT
3. Nije vidljiva javno
4. Korisnik se može vratiti i nastaviti kad je spreman
5. URL: `/blog/create.html?id=55` - otvara skicu za uređivanje

---

## Primjer 6: Skrivena Objava

### Kontrolirani Pristup

```
Naslov: "Privatni Članak - Samo za Newsletter Pretplaćenike"
Slug: "privatni-clanak-newsletter"
Sažetak: "Ekskluzivni sadržaj za naše vjerne čitatelje."

Status: HIDDEN
Jezik: HR
```

### Svrha

- Objava postoji u bazi
- Nije vidljiva u javnoj listi
- Mogu je vidjeti samo admin i preko direktnog linka s ključem
- Koristi se za ekskluzivni sadržaj

---

## Primjer 7: Arhivirana Objava

### Zastarjeli Sadržaj

```
Naslov: "Mjesečni Izvještaj: Siječanj 2020"
Slug: "mjesecni-izvještaj-sjecanj-2020"

Status: ARCHIVED
Jezik: HR
```

### Svrha

- Objava je dio arhive
- Može se pretraživati
- Prosljeđuje se s drugima starijim člancima
- Korisna za SEO i provjeru historije

---

## Primjer 8: Objava s Više Jezika

### HR Verzija

```
Naslov: "Kako Poboljšati Vašu Mentalnu Zdravlje"
Jezik: HR
```

### EN Verzija

```
Naslov: "How to Improve Your Mental Health"
Slug: "how-improve-mental-health"
Jezik: EN
Kategorije: [Mental Health, Wellness]
```

### Rezultat

- Dvije odvojene objave
- Mogu biti linkane međusobno (opcionalno)
- SEO je optimiziran za oba jezika

---

## Greške i Kako Ih Izbjegnut

### Greška 1: Duplikat Sluga

**Problem:**

```
Slug: "zdravi-dorucak" (već postoji)
```

**Rješenje:**

- Koristiti drugačiji slug: `zdravi-dorucak-2025`
- Ili: `zdravi-dorucak-s-jajima`

### Greška 2: Prevelika Slika

**Problem:**

```
Slika: 5 MB (limit je 2 MB)
```

**Rješenje:**

- Kompresirati sliku prije upload
- Koristiti online alat za kompresiju
- Smanjiti rezoluciju

### Greška 3: Zakazivanje u Prošlosti

**Problem:**

```
Status: SCHEDULED
Zakazano za: 2023-01-01 (već je prošlo)
```

**Rješenje:**

- Odaberite budući datum
- Ili objavite odmah (PUBLISHED)

### Greška 4: Prazan Tekst

**Problem:**

```
Sadržaj: "" (prazno, minimum 50 znakova)
```

**Rješenje:**

- Napišite minimalno 50 znakova
- Ili dodajte poglavlja

---

## Savjeti za Najbolje Rezultate

1. **Naslov**

   - Budi informativan i zanimljiv
   - 50-60 znakova je optimalno

2. **Slug**

   - Koristi relevantne ključne riječi
   - Kraće je bolje (do 5 riječi)

3. **Sažetak**

   - Motiviraj čitatelja da pročita više
   - 100-160 znakova

4. **Poglavlja**

   - Raznolik sadržaj (tekst + slike + video)
   - Logičan redoslijed
   - Jasni naslovi

5. **Slika**

   - Visoka rezolucija (1200x600 idealno)
   - Relevantna za sadržaj
   - Kompresirana za brzinu

6. **Kategorije**

   - 2-4 kategorije po objavi
   - Relevantne za sadržaj

7. **SEO**
   - Уključi ključne riječi u meta podatke
   - Koristi descriptivne tekstove

---

**Više primjera i slučajeva korištenja dolaze uskoro...**
