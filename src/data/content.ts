// Personal copy lives here, in English and German.
// The facts come from Safa Aydin's CV. Home address, birth date, and marital status stay off the public islands.

export type Locale = 'en' | 'de'

export type IslandKind =
  | 'about'
  | 'projects'
  | 'skills'
  | 'languages'
  | 'experience'
  | 'education'
  | 'github'
  | 'linkedin'
  | 'contact'

export type IslandLink = {
  label: string
  href: string
}

export type IslandEntry = {
  title: string
  meta?: string
  text: string
  href?: string
}

export type IslandContent = {
  id: string
  kind: IslandKind
  title: string
  eyebrow: string
  summary: string
  paragraphs: string[]
  entries?: IslandEntry[]
  tags?: string[]
  links?: IslandLink[]
  position: [number, number]
  radius: number
  accent: string
  ground: {
    sand: string
    grass: string
    rock: string
  }
}

export type UiCopy = {
  locale: Locale
  documentTitle: string
  sail: string
  look: string
  lookKey: string
  fire: string
  fireLabel: string
  enter: string
  leave: string
  approach: string
  near: (name: string) => string
  comingSoon: string
  edge: string
  back: string
  draft: string
  emptyTags: string
  musicOn: string
  musicOff: string
  sfxOn: string
  sfxOff: string
  volume: string
  land: string
  forward: string
  steer: string
  left: string
  reverse: string
  right: string
  languageLabel: string
  day: string
  dusk: string
  timeLabel: string
}

export type Hour = 'day' | 'dusk'

type Phrase = { en: string; de: string }

type EntrySource = {
  title: Phrase
  meta?: Phrase
  text: Phrase
  href?: string
}

type IslandSource = {
  id: string
  kind: IslandKind
  title: Phrase
  eyebrow: Phrase
  summary: Phrase
  paragraphs: Phrase[]
  entries?: EntrySource[]
  tags?: Phrase[]
  links?: IslandLink[]
  position: [number, number]
  radius: number
  accent: string
  ground: IslandContent['ground']
}

export const SHOW_DRAFT_NOTE = false

const STORAGE_KEY = 'open-sea-locale'

const warmGround = {
  sand: '#e7d3a4',
  grass: '#67a84f',
  rock: '#8d735c',
}

const sources: IslandSource[] = [
  {
    id: 'about',
    kind: 'about',
    title: { en: 'About', de: 'Über mich' },
    eyebrow: { en: 'Safa Aydin', de: 'Safa Aydin' },
    summary: {
      en: 'AI-driven software developer, focused on frontend work in React, TypeScript, and Vite.',
      de: 'AI-getriebener Softwareentwickler mit Schwerpunkt Frontend in React, TypeScript und Vite.',
    },
    paragraphs: [
      {
        en: 'I use AI tools for implementation, debugging, and code review, and I check the results before they stay. I also build with WordPress, write my own HTML, CSS, and JavaScript, and work on SEO and GEO.',
        de: 'KI-Werkzeuge setze ich in Implementierung, Debugging und Code-Review ein und prüfe die Ergebnisse, bevor sie bleiben. Dazu kommen WordPress, eigene Komponenten in HTML, CSS und JavaScript sowie SEO- und GEO-Optimierung.',
      },
      {
        en: 'I live in Dortmund and study computer science at TU Dortmund. The bachelor thesis, Cryptography Made Interactive, is a set of learning tools in React and Vite.',
        de: 'Ich lebe in Dortmund und studiere Informatik an der TU Dortmund. Die Bachelorarbeit Cryptography Made Interactive ist eine Reihe von Lernwerkzeugen in React und Vite.',
      },
    ],
    position: [0, -44],
    radius: 12,
    accent: '#e0a35a',
    ground: warmGround,
  },
  {
    id: 'projects',
    kind: 'projects',
    title: { en: 'Projects', de: 'Projekte' },
    eyebrow: { en: 'Plunder', de: 'Beute' },
    summary: {
      en: 'Learning tools from the thesis, and two games from the software internship.',
      de: 'Lernwerkzeuge aus der Bachelorarbeit und zwei Spiele aus dem Softwarepraktikum.',
    },
    paragraphs: [
      {
        en: 'The thesis tools sit beside the lecture slides. The games came out of the practical course at TU Dortmund.',
        de: 'Die Werkzeuge der Thesis begleiten die Vorlesungsfolien. Die Spiele sind im Praktikum an der TU Dortmund entstanden.',
      },
    ],
    entries: [
      {
        title: { en: 'Mode of Operation', de: 'Mode of Operation' },
        meta: { en: 'React, React Flow, crypto-js, Web Crypto API', de: 'React, React Flow, crypto-js, Web Crypto API' },
        href: 'https://github.com/smsmaydi/mode-of-operation',
        text: {
          en: 'Shows the data flow of ECB, CBC, and CTR, with blocks for plaintext, key, and initialization vector. It includes XOR and AES, an image mode, and a download of the encrypted file.',
          de: 'Zeigt den Datenfluss von ECB, CBC und CTR, mit Knoten für Klartext, Schlüssel und Initialisierungsvektor. Dazu XOR und AES, ein Bildmodus und der Download der verschlüsselten Datei.',
        },
      },
      {
        title: { en: 'RSA', de: 'RSA' },
        meta: { en: 'React, Vite', de: 'React, Vite' },
        href: 'https://github.com/smsmaydi/RSA',
        text: {
          en: 'Builds keys from primes with BigInt and derives the private exponent with the extended Euclidean algorithm, including the division steps. Encryption and decryption run through a numeric example.',
          de: 'Erzeugt Schlüssel aus Primzahlen mit BigInt und leitet den privaten Exponenten über den erweiterten euklidischen Algorithmus her, inklusive der Divisionsschritte. Ver- und Entschlüsselung laufen an einem Zahlenbeispiel.',
        },
      },
      {
        title: { en: 'Diffie-Hellman', de: 'Diffie-Hellman' },
        meta: { en: 'React, Vite', de: 'React, Vite' },
        href: 'https://github.com/smsmaydi/DHKE',
        text: {
          en: 'Walks through the key exchange step by step, checks that the parameters are prime, and asks you to find the shared secret yourself.',
          de: 'Stellt den Schlüsselaustausch Schritt für Schritt dar, prüft die Parameter auf Primzahleigenschaft und lässt das gemeinsame Geheimnis selbst ermitteln.',
        },
      },
      {
        title: { en: 'Caesar Cipher', de: 'Caesar-Cipher' },
        meta: { en: 'React, Vite', de: 'React, Vite' },
        href: 'https://github.com/smsmaydi/Caesar-cipher',
        text: {
          en: 'Encrypts and decrypts with an alphabet wheel, plus a brute-force pass over all 26 shifts. Input is limited to Latin letters.',
          de: 'Ver- und Entschlüsselung über ein Alphabetrad, ergänzt um einen Brute-Force-Modus über alle 26 Verschiebungen. Die Eingabe ist auf lateinische Buchstaben begrenzt.',
        },
      },
      {
        title: { en: 'Password Strength Check', de: 'Password Strength Check' },
        meta: { en: 'React, Vite, zxcvbn', de: 'React, Vite, zxcvbn' },
        href: 'https://github.com/smsmaydi/Password-Strength-Check',
        text: {
          en: 'Estimates strength with zxcvbn and breaks the score into dictionary, keyboard path, sequence, repeat, and date. Dictionary hits link to the word list behind them.',
          de: 'Schätzt die Stärke mit zxcvbn und schlüsselt die Bewertung nach Wörterbuch, Tastaturpfad, Sequenz, Wiederholung und Datum auf. Wörterbuchtreffer verlinken auf die zugrunde liegende Wortliste.',
        },
      },
      {
        title: { en: 'Zooloretto', de: 'Zooloretto' },
        meta: { en: 'Kotlin, JavaFX, kotlinx.serialization', de: 'Kotlin, JavaFX, kotlinx.serialization' },
        href: 'https://github.com/smsmaydi/Zooloretto',
        text: {
          en: 'A board game for two to five players, with save games and a high score. The computer opponent uses the Maxⁿ algorithm.',
          de: 'Brettspiel für zwei bis fünf Personen, mit Speicherstand und Highscore. Der Computergegner basiert auf dem Maxⁿ-Algorithmus.',
        },
      },
      {
        title: { en: 'Schwimmen', de: 'Schwimmen' },
        meta: { en: 'Kotlin, BGW-GUI, JUnit', de: 'Kotlin, BGW-GUI, JUnit' },
        href: 'https://github.com/smsmaydi/Schwimmen',
        text: {
          en: 'A card game for two to four players, with card logic, game state, and interface kept apart. The game logic is tested with JUnit.',
          de: 'Kartenspiel für zwei bis vier Personen. Kartenlogik, Spielzustand und Oberfläche sind getrennt. Die Spiellogik ist mit JUnit getestet.',
        },
      },
    ],
    position: [-45, -54],
    radius: 10,
    accent: '#d4654a',
    ground: { sand: '#efd2a2', grass: '#5e9e48', rock: '#9a7b58' },
  },
  {
    id: 'skills',
    kind: 'skills',
    title: { en: 'Skills', de: 'Fähigkeiten' },
    eyebrow: { en: 'The Craft', de: 'Das Handwerk' },
    summary: {
      en: 'Languages, libraries, and the way the work is put together.',
      de: 'Sprachen, Bibliotheken und die Art, wie die Arbeit zusammengesetzt wird.',
    },
    paragraphs: [
      {
        en: 'Component architecture, connecting REST APIs, SEO and GEO, and working with design and specialist teams.',
        de: 'Komponentenarchitektur, REST-API-Anbindung, SEO und GEO, und die Zusammenarbeit mit Design und Fachabteilungen.',
      },
    ],
    tags: [
      { en: 'TypeScript', de: 'TypeScript' },
      { en: 'JavaScript', de: 'JavaScript' },
      { en: 'React', de: 'React' },
      { en: 'Vite', de: 'Vite' },
      { en: 'HTML & CSS', de: 'HTML & CSS' },
      { en: 'WordPress', de: 'WordPress' },
      { en: 'Kotlin', de: 'Kotlin' },
      { en: 'Java', de: 'Java' },
      { en: 'Python', de: 'Python' },
      { en: 'VHDL', de: 'VHDL' },
      { en: 'Git', de: 'Git' },
      { en: 'SEO / GEO', de: 'SEO / GEO' },
    ],
    position: [-71, -13],
    radius: 10,
    accent: '#3cbaa0',
    ground: { sand: '#e4d2aa', grass: '#4f9a72', rock: '#7e7268' },
  },
  {
    id: 'languages',
    kind: 'languages',
    title: { en: 'Languages', de: 'Sprachen' },
    eyebrow: { en: 'Tongues', de: 'Zungen' },
    summary: {
      en: 'German and English at C1, Turkish from home.',
      de: 'Deutsch und Englisch auf C1, Türkisch als Muttersprache.',
    },
    paragraphs: [],
    entries: [
      {
        title: { en: 'German', de: 'Deutsch' },
        meta: { en: 'C1', de: 'C1' },
        text: {
          en: 'Fluent in speech and writing.',
          de: 'Fließend in Wort und Schrift.',
        },
      },
      {
        title: { en: 'English', de: 'Englisch' },
        meta: { en: 'C1', de: 'C1' },
        text: {
          en: 'Fluent in speech and writing.',
          de: 'Fließend in Wort und Schrift.',
        },
      },
      {
        title: { en: 'Turkish', de: 'Türkisch' },
        meta: { en: 'Native', de: 'Muttersprache' },
        text: {
          en: 'First language.',
          de: 'Erste Sprache.',
        },
      },
    ],
    position: [-59, 34],
    radius: 9,
    accent: '#7a6ad4',
    ground: { sand: '#e6d3ae', grass: '#5f9460', rock: '#8a7564' },
  },
  {
    id: 'github',
    kind: 'github',
    title: { en: 'GitHub', de: 'GitHub' },
    eyebrow: { en: 'The Yard', de: 'Die Werft' },
    summary: {
      en: 'The public profile, and the repositories behind the other islands.',
      de: 'Das öffentliche Profil und die Repositories hinter den anderen Inseln.',
    },
    paragraphs: [
      {
        en: 'The thesis tools and the two Kotlin games are in separate repositories under this account.',
        de: 'Die Lernwerkzeuge der Thesis und die beiden Kotlin-Spiele liegen in eigenen Repositories unter diesem Account.',
      },
    ],
    links: [{ label: 'github.com/smsmaydi', href: 'https://github.com/smsmaydi' }],
    position: [-25, 70],
    radius: 9,
    accent: '#8ee0b8',
    ground: { sand: '#3e474e', grass: '#24332c', rock: '#2a3036' },
  },
  {
    id: 'education',
    kind: 'education',
    title: { en: 'Education', de: 'Ausbildung' },
    eyebrow: { en: 'The Academy', de: 'Die Akademie' },
    summary: {
      en: 'Computer science in Dortmund, and the Abitur in Istanbul.',
      de: 'Informatik in Dortmund und das Abitur in Istanbul.',
    },
    paragraphs: [],
    entries: [
      {
        title: { en: 'B.Sc. Computer Science', de: 'B.Sc. Informatik' },
        meta: { en: 'TU Dortmund · 09/2019 – 06/2026', de: 'TU Dortmund · 09/2019 – 06/2026' },
        text: {
          en: 'The thesis, Cryptography Made Interactive, builds learning tools that sit with the lecture slides. They are written in React and Vite, with a clear split between logic and presentation.',
          de: 'Die Bachelorarbeit Cryptography Made Interactive baut Lernwerkzeuge, die die Vorlesungsfolien begleiten. Sie sind in React und Vite umgesetzt, mit einer klaren Trennung von Logik und Darstellung.',
        },
      },
      {
        title: { en: 'Abitur', de: 'Allgemeine Hochschulreife' },
        meta: { en: 'Kuleli Military High School, Istanbul · 08/2012 – 07/2016', de: 'Kuleli Militärisches Gymnasium, Istanbul · 08/2012 – 07/2016' },
        text: {
          en: 'General higher-education entrance qualification.',
          de: 'Allgemeine Hochschulreife.',
        },
      },
    ],
    position: [24, 66],
    radius: 9,
    accent: '#c47b4a',
    ground: { sand: '#ead3a6', grass: '#6a9a52', rock: '#a08b70' },
  },
  {
    id: 'linkedin',
    kind: 'linkedin',
    title: { en: 'LinkedIn', de: 'LinkedIn' },
    eyebrow: { en: 'The Lighthouse', de: 'Der Leuchtturm' },
    summary: {
      en: 'Web development at virtic, and computer science at TU Dortmund.',
      de: 'Webentwicklung bei virtic und Informatik an der TU Dortmund.',
    },
    paragraphs: [
      {
        en: 'The profile is the public record of the work and the degree.',
        de: 'Das Profil ist der öffentliche Nachweis der Arbeit und des Studiums.',
      },
    ],
    links: [{ label: 'linkedin.com/in/safa--aydin', href: 'https://www.linkedin.com/in/safa--aydin/' }],
    position: [62, 36],
    radius: 9,
    accent: '#3d82f0',
    ground: { sand: '#ecd7ae', grass: '#6aaa58', rock: '#c2ad8e' },
  },
  {
    id: 'experience',
    kind: 'experience',
    title: { en: 'Experience', de: 'Erfahrung' },
    eyebrow: { en: 'The Log', de: 'Das Logbuch' },
    summary: {
      en: 'Web development in Dortmund, then content moderation, plus two university internships.',
      de: 'Webentwicklung in Dortmund, davor Content-Moderation, dazu zwei Praktika im Studium.',
    },
    paragraphs: [],
    entries: [
      {
        title: { en: 'Working student, web development', de: 'Werkstudent Webentwicklung' },
        meta: { en: 'virtic GmbH & Co. KG, Dortmund · 06/2025 – present', de: 'virtic GmbH & Co. KG, Dortmund · 06/2025 – heute' },
        text: {
          en: 'I build and maintain the company site with WordPress and Elementor Pro, and write HTML, CSS, and JavaScript where the design cannot be done in Elementor alone. That includes sliders with Splide.js and Swiper.js, a sitemap of more than 300 pages, and SEO and GEO with Yoast.',
          de: 'Ich entwickle und pflege die Unternehmenswebsite mit WordPress und Elementor Pro und schreibe HTML, CSS und JavaScript, wo das Design mit Elementor allein nicht umsetzbar ist. Dazu Slider mit Splide.js und Swiper.js, eine Sitemap mit über 300 Seiten und SEO sowie GEO mit Yoast.',
        },
      },
      {
        title: { en: 'Content moderator', de: 'Content Moderator' },
        meta: { en: 'Majorel Dortmund GmbH (Teleperformance) · 03/2023 – 06/2025', de: 'Majorel Dortmund GmbH (Teleperformance) · 03/2023 – 06/2025' },
        text: {
          en: 'I reviewed live streams for ByteDance in real time and decided on policy actions, and I reviewed uploaded video against the community guidelines. Unclear cases went to specialist teams by ticket, with a written record for quality review.',
          de: 'Ich habe Live-Streams für ByteDance in Echtzeit geprüft und bei Richtlinienverstößen entschieden, und hochgeladenes Video nach den Community-Richtlinien eingeordnet. Unklare Fälle gingen per Ticket an Fachteams, mit Dokumentation für die Qualitätssicherung.',
        },
      },
      {
        title: { en: 'Software internship', de: 'Softwarepraktikum' },
        meta: { en: 'TU Dortmund · 04/2022 – 07/2022', de: 'TU Dortmund · 04/2022 – 07/2022' },
        text: {
          en: 'Requirements and UML, then implementation, tests, and documentation. The course produced two Kotlin games: Schwimmen and Zooloretto.',
          de: 'Anforderungsaufnahme und UML, dann Implementierung, Test und Dokumentation. Im Praktikum entstanden zwei Spiele in Kotlin: Schwimmen und Zooloretto.',
        },
      },
      {
        title: { en: 'Hardware internship', de: 'Hardwarepraktikum' },
        meta: { en: 'TU Dortmund · 10/2020 – 02/2021', de: 'TU Dortmund · 10/2020 – 02/2021' },
        text: {
          en: 'Digital circuits in VHDL, built up from gates to adders, memory, and finite automata, then checked in simulation. The course ended by extending a given simple processor.',
          de: 'Digitale Schaltungen in VHDL, aufgebaut von Gattern bis zu Addierern, Speichern und endlichen Automaten, geprüft in der Simulation. Am Ende stand die Erweiterung eines vorgegebenen einfachen Prozessors.',
        },
      },
    ],
    position: [73, -13],
    radius: 10,
    accent: '#d2a15a',
    ground: warmGround,
  },
  {
    id: 'contact',
    kind: 'contact',
    title: { en: 'Contact', de: 'Kontakt' },
    eyebrow: { en: 'Message in a Bottle', de: 'Flaschenpost' },
    summary: {
      en: 'Email and phone. LinkedIn and GitHub are here as well.',
      de: 'E-Mail und Telefon. LinkedIn und GitHub stehen auch hier.',
    },
    paragraphs: [
      {
        en: 'Dortmund.',
        de: 'Dortmund.',
      },
    ],
    links: [
      { label: 'safaaydin3057@gmail.com', href: 'mailto:safaaydin3057@gmail.com' },
      { label: '+49 157 39306159', href: 'tel:+4915739306159' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/safa--aydin/' },
      { label: 'GitHub', href: 'https://github.com/smsmaydi' },
    ],
    position: [42, -51],
    radius: 8,
    accent: '#ef8f5a',
    ground: { sand: '#e6c99a', grass: '#6a8f48', rock: '#8a6a4e' },
  },
]

const uiPack: Record<Locale, Omit<UiCopy, 'locale' | 'near'> & { near: string }> = {
  en: {
    documentTitle: 'Safa Aydin — Open Sea',
    sail: 'WASD or arrow keys',
    look: 'the view follows the pointer',
    lookKey: 'Mouse',
    fire: 'click to aim',
    fireLabel: 'Fire',
    enter: 'ENTER to land',
    leave: 'ESC back to sea',
    approach: 'Sail closer to an island',
    near: 'ENTER to land',
    comingSoon: 'The link will be hung here soon.',
    edge: 'Edge of the chart. The islands are behind you.',
    back: 'Back to sea',
    draft: 'Draft — these lines will become your story.',
    emptyTags: 'Your craft will be cut into these stones.',
    musicOn: 'Music on',
    musicOff: 'Music off',
    sfxOn: 'Effects on',
    sfxOff: 'Effects off',
    volume: 'Volume',
    land: 'Land',
    forward: 'Forward',
    steer: 'Steer',
    left: 'Left',
    reverse: 'Back',
    right: 'Right',
    languageLabel: 'Language',
    day: 'Day',
    dusk: 'Dusk',
    timeLabel: 'Time of day',
  },
  de: {
    documentTitle: 'Safa Aydin — Offene See',
    sail: 'WASD oder Pfeiltasten',
    look: 'der Blick folgt dem Zeiger',
    lookKey: 'Maus',
    fire: 'klicken zum Zielen',
    fireLabel: 'Feuer',
    enter: 'ENTER zum Anlegen',
    leave: 'ESC zurück aufs Meer',
    approach: 'Segle näher an eine Insel',
    near: 'ENTER zum Anlegen',
    comingSoon: 'Der Link wird bald hier hängen.',
    edge: 'Rand der Karte. Die Inseln liegen hinter dir.',
    back: 'Zurück aufs Meer',
    draft: 'Entwurf — aus diesen Zeilen wird deine Geschichte.',
    emptyTags: 'Dein Handwerk wird in diese Steine geschnitten.',
    musicOn: 'Musik an',
    musicOff: 'Musik aus',
    sfxOn: 'Effekte an',
    sfxOff: 'Effekte aus',
    volume: 'Lautstärke',
    land: 'Anlegen',
    forward: 'Vor',
    steer: 'Steuern',
    left: 'Links',
    reverse: 'Zurück',
    right: 'Rechts',
    languageLabel: 'Sprache',
    day: 'Tag',
    dusk: 'Abend',
    timeLabel: 'Tageszeit',
  },
}

function say(phrase: Phrase, locale: Locale) {
  return phrase[locale]
}

function project(source: IslandSource, locale: Locale): IslandContent {
  return {
    id: source.id,
    kind: source.kind,
    title: say(source.title, locale),
    eyebrow: say(source.eyebrow, locale),
    summary: say(source.summary, locale),
    paragraphs: source.paragraphs.map((line) => say(line, locale)),
    entries: source.entries?.map((entry) => ({
      title: say(entry.title, locale),
      meta: entry.meta ? say(entry.meta, locale) : undefined,
      text: say(entry.text, locale),
      href: entry.href,
    })),
    tags: source.tags?.map((tag) => say(tag, locale)),
    links: source.links,
    position: source.position,
    radius: source.radius,
    accent: source.accent,
    ground: source.ground,
  }
}

function pack(locale: Locale): UiCopy {
  const text = uiPack[locale]
  return {
    ...text,
    locale,
    near: (name) => `${name} — ${text.near}`,
  }
}

export function readLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'de') return stored
  } catch {
    // Storage can be blocked. Fall through to the browser language.
  }
  const language = typeof navigator === 'undefined' ? 'en' : navigator.language.toLowerCase()
  return language.startsWith('de') ? 'de' : 'en'
}

export const islands: IslandContent[] = sources.map((source) => project(source, 'en'))

export function useLocale(locale: Locale): UiCopy {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Ignore a blocked store. The choice still applies for this visit.
  }
  sources.forEach((source, index) => {
    Object.assign(islands[index], project(source, locale))
  })
  return pack(locale)
}

export const initialCopy = useLocale(readLocale())

const HOUR_KEY = 'open-sea-hour'

export function readHour(): Hour {
  try {
    const stored = localStorage.getItem(HOUR_KEY)
    if (stored === 'day' || stored === 'dusk') return stored
  } catch {
    // Storage can be blocked. Fall through to daytime.
  }
  return 'day'
}

export function storeHour(hour: Hour) {
  try {
    localStorage.setItem(HOUR_KEY, hour)
  } catch {
    // The choice still applies for this visit.
  }
}
