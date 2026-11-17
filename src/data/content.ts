// Personal copy lives here, in English and German.
// Swap the draft lines for your name, work, and links.

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

export const SHOW_DRAFT_NOTE = true

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
    eyebrow: { en: 'The Captain', de: 'Der Kapitän' },
    summary: {
      en: 'Your harbor. Your name, your work, and the way you sail.',
      de: 'Dein Hafen. Dein Name, deine Arbeit und wie du segelst.',
    },
    paragraphs: [
      {
        en: 'This island is a short biography. A few lines are enough: who you are, what you work on, and the kind of work you leave behind.',
        de: 'Diese Insel ist eine kurze Biografie. Ein paar Zeilen reichen: wer du bist, woran du arbeitest und was du hinterlässt.',
      },
      {
        en: 'A portrait can hang on the cottage if you want one. The frame by the door is waiting.',
        de: 'Ein Porträt kann an der Hütte hängen, wenn du eins möchtest. Der Rahmen an der Tür wartet.',
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
      en: 'The work you have brought back, chest by chest.',
      de: 'Die Arbeit, die du zurückgebracht hast, Truhe für Truhe.',
    },
    paragraphs: [
      {
        en: 'Each project is a card: a name, a year, one clear line, and a link.',
        de: 'Jedes Projekt ist eine Karte: Name, Jahr, ein klarer Satz und ein Link.',
      },
    ],
    entries: [
      {
        title: { en: 'Sample project', de: 'Beispielprojekt' },
        meta: { en: 'Year · Role', de: 'Jahr · Rolle' },
        text: {
          en: 'This chest is only here so you can see the shape. It will be replaced with your own work.',
          de: 'Diese Truhe zeigt nur die Form. Sie wird durch deine eigene Arbeit ersetzt.',
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
      en: 'The tools and the work you are strongest at.',
      de: 'Die Werkzeuge und die Arbeit, in der du am stärksten bist.',
    },
    paragraphs: [
      {
        en: 'The gems are decoration. The real list will be the craft you name.',
        de: 'Die Edelsteine sind Schmuck. Die echte Liste ist das Handwerk, das du nennst.',
      },
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
      en: 'The languages you speak, and the ones you write in.',
      de: 'Die Sprachen, die du sprichst, und die, in denen du schreibst.',
    },
    paragraphs: [
      {
        en: 'Tell me each language and how well you hold it. The banners will take their colors from that list.',
        de: 'Nenn mir jede Sprache und wie sicher du sie beherrschst. Die Banner nehmen ihre Farben von dieser Liste.',
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
      en: 'Where the code is moored. Your profile, and the repos you want seen.',
      de: 'Wo der Code vertäut liegt. Dein Profil und die Repos, die gesehen werden sollen.',
    },
    paragraphs: [
      {
        en: 'Give me the profile link and, if you like, three repos to pin on the dock.',
        de: 'Gib mir den Profil-Link und, wenn du magst, drei Repos für den Steg.',
      },
    ],
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
      en: 'Schools, courses, and what they taught you to notice.',
      de: 'Schulen, Kurse und was sie dich gelehrt haben zu sehen.',
    },
    paragraphs: [
      {
        en: 'Each stop is a line in the log: place, years, and one thing it left you with.',
        de: 'Jeder Halt ist eine Zeile im Logbuch: Ort, Jahre und eine Sache, die geblieben ist.',
      },
    ],
    entries: [
      {
        title: { en: 'Sample study', de: 'Beispielstudium' },
        meta: { en: 'School · Years', de: 'Schule · Jahre' },
        text: {
          en: 'A placeholder berth. Your real studies will take the shelf.',
          de: 'Ein Platzhalter. Dein wirkliches Studium kommt auf das Bord.',
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
      en: 'The professional light. Tall, so it can be read from the far water.',
      de: 'Das berufliche Licht. Hoch genug, um es vom fernen Wasser zu lesen.',
    },
    paragraphs: [
      {
        en: 'Send the profile link and this island will open it.',
        de: 'Schick den Profil-Link, dann öffnet diese Insel ihn.',
      },
    ],
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
      en: 'Where you have sailed for work, and what changed because you were there.',
      de: 'Wo du für die Arbeit gesegelt bist, und was sich geändert hat, weil du da warst.',
    },
    paragraphs: [
      {
        en: 'Each berth is a record: title, place, dates, and a sentence or two.',
        de: 'Jeder Liegeplatz ist ein Eintrag: Titel, Ort, Daten und ein, zwei Sätze.',
      },
    ],
    entries: [
      {
        title: { en: 'Sample berth', de: 'Beispielhafen' },
        meta: { en: 'Title · Place · Dates', de: 'Titel · Ort · Daten' },
        text: {
          en: 'This entry is a draft. The real log comes from you.',
          de: 'Dieser Eintrag ist ein Entwurf. Das echte Logbuch kommt von dir.',
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
      en: 'Mail, a CV, and any other door you want left open.',
      de: 'Mail, ein Lebenslauf und jede andere Tür, die offen bleiben soll.',
    },
    paragraphs: [
      {
        en: 'An email, a CV link, and anything else a stranger should use to reach you.',
        de: 'Eine E-Mail, ein Lebenslauf-Link und alles, womit dich jemand erreichen soll.',
      },
    ],
    position: [42, -51],
    radius: 8,
    accent: '#ef8f5a',
    ground: { sand: '#e6c99a', grass: '#6a8f48', rock: '#8a6a4e' },
  },
]

const uiPack: Record<Locale, Omit<UiCopy, 'locale' | 'near'> & { near: string }> = {
  en: {
    documentTitle: 'Open Sea — Portfolio',
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
    left: 'Left',
    reverse: 'Back',
    right: 'Right',
    languageLabel: 'Language',
    day: 'Day',
    dusk: 'Dusk',
    timeLabel: 'Time of day',
  },
  de: {
    documentTitle: 'Offene See — Portfolio',
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
