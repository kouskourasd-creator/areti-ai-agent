import { useState, useRef, useEffect, useCallback, type FormEvent, type KeyboardEvent } from "react";

type View = "chat" | "brain" | "training" | "knowledge" | "system" | "download" | "languages";
type Language = "auto" | "el" | "en" | "fr" | "de" | "es" | "it" | "pt" | "tr" | "ar" | "zh" | "ja" | "ru";

interface Message {
  id: string;
  sender: "user" | "agent";
  text: string;
  lang: Language;
  code?: { lang: string; body: string };
  reasoning?: ReasoningStep[];
  sources?: string[];
  timestamp: Date;
}

interface ReasoningStep {
  num: number;
  status: "done" | "active" | "pending";
  text: string;
}

interface ThoughtEntry {
  id: string;
  time: string;
  type: "reason" | "search" | "learn" | "act" | "memory";
  text: string;
}

interface KnowledgeItem {
  type: "doc" | "code" | "url" | "note" | "learned";
  name: string;
  meta: string;
}

interface ActionStep {
  label: string;
  status: "pending" | "done" | "running";
}

interface Action {
  id: string;
  title: string;
  description: string;
  steps: ActionStep[];
  status: "pending" | "approved" | "denied" | "executing" | "completed";
  logs: string[];
}

// ─── Language Data ────────────────────────────────────────────────

const LANG_LIST: { code: Language; name: string; flag: string }[] = [
  { code: "auto", name: "Auto-Detect", flag: "\u{1F30D}" },
  { code: "el", name: "\u0395\u03BB\u03BB\u03B7\u03BD\u03B9\u03BA\u03AC", flag: "\u{1F1EE}\u{1F1F1}" },
  { code: "en", name: "English", flag: "\u{1F1EC}\u{1F1E7}" },
  { code: "fr", name: "Fran\u00E7ais", flag: "\u{1F1EB}\u{1F1F7}" },
  { code: "de", name: "Deutsch", flag: "\u{1F1E9}\u{1F1EA}" },
  { code: "es", name: "Espa\u00F1ol", flag: "\u{1F1EA}\u{1F1F8}" },
  { code: "it", name: "Italiano", flag: "\u{1F1EE}\u{1F1F9}" },
  { code: "pt", name: "Portugu\u00EAs", flag: "\u{1F1E7}\u{1F1F7}" },
  { code: "tr", name: "T\u00FCrk\u00E7e", flag: "\u{1F1F9}\u{1F1F7}" },
  { code: "ar", name: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629", flag: "\u{1F1F8}\u{1F1E6}" },
  { code: "zh", name: "\u4E2D\u6587", flag: "\u{1F1E8}\u{1F1F3}" },
  { code: "ja", name: "\u65E5\u672C\u8A9E", flag: "\u{1F1EF}\u{1F1F5}" },
  { code: "ru", name: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439", flag: "\u{1F1F7}\u{1F1FA}" },
];

function detectLanguage(text: string): Language {
  if (/[\u03B1-\u03C9\u0391-\u03A9]/.test(text)) return "el";
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/[\u4E00-\u9FFF]/.test(text)) return "zh";
  if (/[\u3040-\u30FF\u30A0-\u30FF]/.test(text)) return "ja";
  if (/[\u0400-\u04FF]/.test(text)) return "ru";
  const lower = text.toLowerCase();
  if (/\b(bonjour|salut|comment|merci|oui|vous|nous|peux|aider)\b/.test(lower)) return "fr";
  if (/\b(hola|como|gracias|porque|tambien|pero|puedo|ayudar|necesito)\b/.test(lower)) return "es";
  if (/\b(ciao|come|grazie|perch|anche|posso|aiutare|buono|dove)\b/.test(lower)) return "it";
  if (/\b(ola|como|obrigado|porque|tambem|posso|ajudar|preciso)\b/.test(lower)) return "pt";
  if (/\b(merhaba|nas[il]l|teekkur|ama|olabilir|yardm|ihtiya)\b/.test(lower)) return "tr";
  if (/\b(hallo|nicht|ich|eine|haben|knnen|werden|mussen|sollte|guten)\b/.test(lower)) return "de";
  if (/\b(privet|kak|mozhete|pomoch|spasibo|da|net|chto|kogda)\b/.test(lower)) return "ru";
  return "en";
}

const UI: Record<Language, { welcome: string; placeholder: string; thinking: string; searching: string; you: string; agent: string }> = {
  auto: { welcome: "Hello! I'm Areti \u2014 your autonomous AI agent. I can speak many languages! Just type in any language and I'll respond in the same one.", placeholder: "Talk to me in any language...", thinking: "Thinking...", searching: "Searching the web...", you: "You", agent: "Areti" },
  el: { welcome: "\u0393\u03B5\u03B9\u03B1 \u03C3\u03BF\u03C5! \u0395\u03AF\u03BC\u03B1\u03B9 \u03B7 \u0391\u03C1\u03B5\u03C4\u03AE \u2014 \u03BF \u03B1\u03C5\u03C4\u03CC\u03BD\u03BF\u03BC\u03BF\u03C2 AI agent \u03C3\u03BF\u03C5. \u039C\u03C0\u03BF\u03C1\u03CE \u03BD\u03B1 \u03BC\u03B9\u03BB\u03AE\u03C3\u03C9 \u03C3\u03B5 \u03C0\u03BF\u03BB\u03BB\u03AD\u03C2 \u03B3\u03BB\u03CE\u03C3\u03C3\u03B5\u03C2! \u03A0\u03CE\u03C2 \u03BC\u03C0\u03BF\u03C1\u03CE \u03BD\u03B1 \u03C3\u03B5 \u03B2\u03BF\u03B7\u03B8\u03AE\u03C3\u03C9 \u03C3\u03AE\u03BC\u03B5\u03C1\u03B1;", placeholder: "\u039C\u03AF\u03BB\u03B1 \u03BC\u03BF\u03C5 \u03C3\u03B5 \u03BF\u03C0\u03BF\u03B9\u03B1\u03B4\u03AE\u03C0\u03BF\u03C4\u03B5 \u03B3\u03BB\u03CE\u03C3\u03C3\u03B1 \u03B8\u03AD\u03BB\u03B5\u03B9\u03C2...", thinking: "\u03A3\u03BA\u03AD\u03C0\u03C4\u03BF\u03BC\u03B1\u03B9...", searching: "\u0391\u03BD\u03B1\u03B6\u03AE\u03C4\u03B7\u03C3\u03B7 \u03C3\u03C4\u03BF \u03B4\u03B9\u03B1\u03B4\u03AF\u03BA\u03C4\u03C5\u03BF...", you: "\u0395\u03C3\u03CD", agent: "\u0391\u03C1\u03B5\u03C4\u03AE" },
  en: { welcome: "Hello! I'm Areti \u2014 your autonomous AI agent. I can speak many languages! How can I help you today?", placeholder: "Talk to me in any language...", thinking: "Thinking...", searching: "Searching the web...", you: "You", agent: "Areti" },
  fr: { welcome: "Bonjour! Je suis Ar\u00E9ti \u2014 votre agent IA autonome. Je peux parler plusieurs langues! Comment puis-je vous aider?", placeholder: "Parlez-moi dans n'importe quelle langue...", thinking: "R\u00E9flexion...", searching: "Recherche sur le web...", you: "Vous", agent: "Ar\u00E9ti" },
  de: { welcome: "Hallo! Ich bin Areti \u2014 Ihr autonomer KI-Agent. Ich kann viele Sprachen sprechen! Wie kann ich Ihnen helfen?", placeholder: "Sprechen Sie in jeder Sprache...", thinking: "Denke nach...", searching: "Suche im Web...", you: "Sie", agent: "Areti" },
  es: { welcome: "\u00A1Hola! Soy Areti \u2014 tu agente de IA aut\u00F3nomo. \u00A1Puedo hablar muchos idiomas! \u00BFC\u00F3mo puedo ayudarte?", placeholder: "H\u00E1blame en cualquier idioma...", thinking: "Pensando...", searching: "Buscando en la web...", you: "T\u00FA", agent: "Areti" },
  it: { welcome: "Ciao! Sono Areti \u2014 il tuo agente IA autonomo. Posso parlare molte lingue! Come posso aiutarti?", placeholder: "Parlami in qualsiasi lingua...", thinking: "Pensando...", searching: "Cercando sul web...", you: "Tu", agent: "Areti" },
  pt: { welcome: "Ol\u00E1! Sou a Areti \u2014 seu agente de IA aut\u00F4nomo. Posso falar muitos idiomas! Como posso ajud\u00E1-lo?", placeholder: "Fale comigo em qualquer idioma...", thinking: "Pensando...", searching: "Pesquisando na web...", you: "Voc\u00EA", agent: "Areti" },
  tr: { welcome: "Merhaba! Ben Areti \u2014 otonom yapay zeka ajan\u0131n. Bir\u00E7ok dil konu\u015Fabilirim! Size nas\u0131l yard\u0131mc\u0131 olabilirim?", placeholder: "Herhangi bir dilde konu\u015Fun...", thinking: "D\u00FC\u015F\u00FCn\u00FCyor...", searching: "Web'de aran\u0131yor...", you: "Siz", agent: "Areti" },
  ar: { welcome: "\u0645\u0631\u062D\u0628\u0627! \u0623\u0646\u0627 \u0623\u0631\u064A\u062A\u064A \u0639\u0645\u064A\u0644\u0643 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A. \u0623\u0633\u062A\u0637\u064A\u0639 \u0627\u0644\u062A\u062D\u062F\u062B \u0628\u0627\u0644\u0639\u062F\u064A\u062F \u0645\u0646 \u0627\u0644\u0644\u063A\u0627\u062A! \u0643\u064A\u0641 \u0645\u0646 \u0627\u0644\u0645\u0645\u0643\u0646 \u0623\u0646 \u0623\u0633\u0627\u0639\u062F\u0643\u061F", placeholder: "\u062A\u062D\u062F\u062B \u0645\u0639\u064A \u0628\u0623\u064A \u0644\u063A\u0629...", thinking: "\u0623\u062A\u0641\u0643\u0631...", searching: "\u0627\u0644\u0628\u062D\u062B \u0641\u064A \u0627\u0644\u0648\u064A\u0628...", you: "\u0623\u0646\u062A", agent: "\u0623\u0631\u064A\u062A\u064A" },
  zh: { welcome: "\u4F60\u597D\uFF01\u6211\u662FAreti\u2014\u2014\u4F60\u7684\u81EA\u4E3BAI\u4EE3\u7406\u3002\u6211\u4F1A\u8BF4\u5F88\u591A\u8BED\u8A00\uFF01\u4ECA\u5929\u6211\u600E\u4E48\u5E2E\u4F60\uFF1F", placeholder: "\u7528\u4EFB\u4F55\u8BED\u8A00\u548C\u6211\u804A\u5929...", thinking: "\u601D\u8003\u4E2D...", searching: "\u641C\u7D22\u4E2D...", you: "\u4F60", agent: "Areti" },
  ja: { welcome: "\u3053\u3093\u306B\u3061\u306F\uFF01\u79C1\u306FAreti\u3067\u3059\u2014\u2014\u3042\u306A\u305F\u306E\u81EA\u7ACBAI\u30A8\u30FC\u30B8\u30A7\u30F3\u30C8\u3002\u3044\u304F\u3064\u304B\u306E\u8A00\u8A9E\u3092\u8A71\u305B\u307E\u3059\uFF01\u4ECA\u65E5\u306F\u3069\u3046\u304A\u529B\u306B\u306A\u308C\u3070\u3044\u3044\u3067\u3059\u304B\uFF1F", placeholder: "\u3044\u304B\u306A\u308B\u8A00\u8A9E\u3067\u8A71\u3057\u3066\u304F\u3060\u3055\u3044...", thinking: "\u8003\u3048\u4E2D...", searching: "\u691C\u7D22\u4E2D...", you: "\u3042\u306A\u305F", agent: "Areti" },
  ru: { welcome: "\u041F\u0440\u0438\u0432\u0435\u0442! \u042F Areti \u2014 \u0432\u0430\u0448 \u0430\u0432\u0442\u043E\u043D\u043E\u043C\u043D\u044B\u0439 AI-\u0430\u0433\u0435\u043D\u0442. \u042F \u043C\u043E\u0433\u0443 \u0433\u043E\u0432\u043E\u0440\u0438\u0442\u044C \u043D\u0430 \u043C\u043D\u043E\u0433\u0438\u0445 \u044F\u0437\u044B\u043A\u0430\u0445! \u041A\u0430\u043A \u044F \u043C\u043E\u0433\u0443 \u0432\u0430\u043C \u043F\u043E\u043C\u043E\u0447\u044C?", placeholder: "\u0413\u043E\u0432\u043E\u0440\u0438\u0442\u0435 \u0441\u043E \u043C\u043D\u043E\u0439 \u043D\u0430 \u043B\u044E\u0431\u043E\u043C \u044F\u0437\u044B\u043A\u0435...", thinking: "\u0414\u0443\u043C\u0430\u044E...", searching: "\u041F\u043E\u0438\u0441\u043A \u0432 \u0441\u0435\u0442\u0438...", you: "\u0412\u044B", agent: "Areti" },
};

// ─── Knowledge Base ───────────────────────────────────────────────

const KNOWLEDGE_DB: Record<string, Record<Language, string>> = {
  "react": {
    el: "To React einai ena JavaScript library gia ta UI dimiourgmeno apo to Meta (Facebook). Xrhsimopoiei components, hooks (useState, useEffect, useContext), kai Virtual DOM gia grhgh ananeosi. Oi nees ekdoseis (React 19) exoun Server Components kai Suspense improvements.",
    en: "React is a JavaScript library for building user interfaces created by Meta (Facebook). It uses components, hooks (useState, useEffect, useContext), and Virtual DOM for fast updates. React 19 includes Server Components and Suspense improvements.",
    fr: "React est une biblioth\u00E8que JavaScript pour cr\u00E9er des interfaces utilisateur cr\u00E9\u00E9e par Meta. Il utilise des composants, des hooks et le Virtual DOM.",
    de: "React ist eine JavaScript-Bibliothek von Meta f\u00FCr UIs. Es verwendet Komponenten, Hooks und Virtual DOM.",
    es: "React es una librer\u00EDa JavaScript de Meta para interfaces de usuario. Usa componentes, hooks y Virtual DOM.",
    it: "React \u00E8 una libreria JavaScript di Meta per le interfacce utente.",
    pt: "React \u00E9 uma biblioteca JavaScript da Meta para interfaces de usu\u00E1rio.",
    tr: "React, Meta taraf\u0131ndan olu\u015Fturulan bir JavaScript UI kitapl\u0131\u011F\u0131d\u0131r.",
    ar: "React \u0647\u0648 \u0645\u0643\u062A\u0628\u0629 JavaScript \u0644\u0628\u0646\u0627\u0621 \u0627\u0644\u0648\u0627\u062C\u0647\u0629 \u0645\u0646 Meta.",
    zh: "React\u662FMeta\u521B\u5EFA\u7684JavaScript UI\u5E93\u3002\u4F7F\u7528\u7EC4\u4EF6\u3001\u94A9\u5B50\u548C\u865A\u62DFDOM\u3002",
    ja: "React\u306FMeta\u304C\u4F5C\u3063\u305FJavaScript UI\u30E9\u30A4\u30D6\u30E9\u30EA\u3067\u3059\u3002",
    ru: "React \u2014 JavaScript-\u0431\u0438\u0431\u043B\u0438\u043E\u0442\u0435\u043A\u0430 \u043E\u0442 Meta \u0434\u043B\u044F UI.",
    auto: "React is a JavaScript library for building user interfaces created by Meta (Facebook). It uses components, hooks (useState, useEffect, useContext), and Virtual DOM for fast updates.",
  },
  "python": {
    el: "To Python einai mia glwssa programmatismou ypsilhs epipedou, eukolh gia arxarious. Xrhsimopoieitai gia AI/ML, web development (Django, Flask), data science, kai automation. Oi neoteres ekdoseis (3.12+) exoun better error messages kai performance improvements.",
    en: "Python is a high-level programming language, great for beginners. Used in AI/ML, web development (Django, Flask), data science, and automation. Python 3.12+ has better error messages and performance improvements.",
    fr: "Python est un langage de programmation de haut niveau, id\u00E9al pour les d\u00E9butants. Utilis\u00E9 en IA/ML, d\u00E9veloppement web et science des donn\u00E9es.",
    de: "Python ist eine Hochsprache, ideal f\u00FCr Anf\u00E4nger. Wird in KI/ML, Webentwicklung und Datenwissenschaft verwendet.",
    es: "Python es un lenguaje de alto nivel, ideal para principiantes. Se usa en IA/ML, desarrollo web y ciencia de datos.",
    it: "Python \u00E8 un linguaggio di alto livello, ideale per principianti. Usato in AI/ML, web e data science.",
    pt: "Python \u00E9 uma linguagem de alto n\u00EDvel, ideal para iniciantes. Usado em IA/ML, web e ci\u00EAncia de dados.",
    tr: "Python, ba\u015Flang\u0131\u00E7 i\u00E7in ideal y\u00FCksek d\u00FCzeyli bir programlama dilidir.",
    ar: "Python \u0647\u0648 \u0644\u063A\u0629 \u0628\u0631\u0645\u062C\u0629 \u0639\u0627\u0644\u064A\u0629 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 \u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0645\u0628\u062A\u062F\u0626\u064A\u0646.",
    zh: "Python\u662F\u4E00\u79CD\u9002\u5408\u521D\u5B66\u8005\u7684\u9AD8\u7EA7\u7F16\u7A0B\u8BED\u8A00\u3002\u7528\u4E8E\u4EBA\u5DE5\u667A\u80FD\u3001\u7F51\u7EDC\u5F00\u53D1\u548C\u6570\u636E\u79D1\u5B66\u3002",
    ja: "Python\u306F\u521D\u5B66\u8005\u306B\u9069\u3057\u305F\u9AD8\u7D1A\u8A00\u8A9E\u3067\u3059\u3002AI/ML\u3001Web\u958B\u767A\u3001\u30C7\u30FC\u30BF\u30B5\u30A4\u30A8\u30F3\u30B9\u306B\u4F7F\u308F\u308C\u307E\u3059\u3002",
    ru: "Python \u2014 \u0432\u044B\u0441\u043E\u043A\u043E\u0443\u0440\u043E\u0432\u043D\u0435\u0432\u044B\u0439 \u044F\u0437\u044B\u043A, \u0438\u0434\u0435\u0430\u043B\u0435\u043D \u0434\u043B\u044F \u043D\u0430\u0447\u0438\u043D\u0430\u044E\u0449\u0438\u0445.",
    auto: "Python is a high-level programming language, great for beginners. Used in AI/ML, web development (Django, Flask), data science, and automation.",
  },
  "javascript": {
    el: "To JavaScript einai h glwssa tou web. Trexei se browser kai server (Node.js). Xrhsimopoieitai gia frontend (React, Vue, Angular), backend (Express, Next.js), kai mobile apps (React Native). ES2024+ exei nea features opws Temporal API kai pipeline operator.",
    en: "JavaScript is the language of the web. Runs in browsers and on servers (Node.js). Used for frontend (React, Vue, Angular), backend (Express, Next.js), and mobile apps (React Native). ES2024+ adds new features like Temporal API.",
    fr: "JavaScript est le langage du web. Utilis\u00E9 pour le frontend, backend et mobile.",
    de: "JavaScript ist die Sprache des Webs. Wird f\u00FCr Frontend, Backend und Mobile verwendet.",
    es: "JavaScript es el lenguaje de la web. Se usa para frontend, backend y m\u00F3vil.",
    it: "JavaScript \u00E8 il linguaggio del web. Usato per frontend, backend e mobile.",
    pt: "JavaScript \u00E9 a linguagem da web. Usado para frontend, backend e mobile.",
    tr: "JavaScript web'in dilidir. Frontend, backend ve mobil i\u00E7in kullan\u0131l\u0131r.",
    ar: "JavaScript \u0647\u0648 \u0644\u063A\u0629 \u0627\u0644\u0648\u064A\u0628. \u064A\u0633\u062A\u062E\u062F\u0645 \u0644\u0644\u0648\u0627\u062C\u0647\u0629 \u0648\u0627\u0644\u062E\u0627\u062F\u0645 \u0648\u0627\u0644\u0645\u0648\u0628\u0627\u064A\u0644.",
    zh: "JavaScript\u662F\u7F51\u7EDC\u7684\u8BED\u8A00\u3002\u7528\u4E8E\u524D\u7AEF\u3001\u540E\u7AEF\u548C\u79FB\u52A8\u5E94\u7528\u3002",
    ja: "JavaScript\u306FWeb\u306E\u8A00\u8A9E\u3067\u3059\u3002\u30D5\u30ED\u30F3\u30C8\u30A8\u30F3\u30C9\u3001\u30D0\u30C3\u30AF\u30A8\u30F3\u30C9\u3001\u30E2\u30D0\u30A4\u30EB\u306B\u4F7F\u308F\u308C\u307E\u3059\u3002",
    ru: "JavaScript \u2014 \u044F\u0437\u044B\u043A \u0432\u0435\u0431\u0430. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F \u0434\u043B\u044F frontend, backend \u0438 mobile.",
    auto: "JavaScript is the language of the web. Runs in browsers and servers (Node.js). Used for frontend, backend, and mobile apps.",
  },
  "typescript": {
    el: "To TypeScript einai to JavaScript me types. Dimiourgithike apo to Microsoft kai prosthetei static typing, interfaces, kai generics. Xrhsimopoietai sto megalo frontend (Angular, React) kai backend. Veltiwnei thn anixneush sfalmatwn kai thn maintainability.",
    en: "TypeScript is JavaScript with types. Created by Microsoft, it adds static typing, interfaces, and generics. Widely used in large frontend (Angular, React) and backend projects. Improves error detection and code maintainability.",
    fr: "TypeScript est JavaScript avec des types. Cr\u00E9\u00E9 par Microsoft.",
    de: "TypeScript ist JavaScript mit Typen. Erstellt von Microsoft.",
    es: "TypeScript es JavaScript con tipos. Creado por Microsoft.",
    it: "TypeScript \u00E8 JavaScript con tipi. Creato da Microsoft.",
    pt: "TypeScript \u00E9 JavaScript com tipos. Criado pela Microsoft.",
    tr: "TypeScript, Microsoft taraf\u0131ndan olu\u015Fturulan t\u00FCrl\u00FC JavaScript'tir.",
    ar: "TypeScript \u0647\u0648 JavaScript \u0628\u0623\u0646\u0648\u0627\u0639. \u0625\u0646\u0634\u0623\u0647 Microsoft.",
    zh: "TypeScript\u662F\u5E26\u7C7B\u578B\u7684JavaScript\u3002\u7531Microsoft\u521B\u5EFA\u3002",
    ja: "TypeScript\u306F\u30BF\u30A4\u30D7\u4ED8\u304DJavaScript\u3067\u3059\u3002Microsoft\u304C\u4F5C\u308A\u307E\u3057\u305F\u3002",
    ru: "TypeScript \u2014 JavaScript \u0441 \u0442\u0438\u043F\u0430\u043C\u0438. \u0421\u043E\u0437\u0434\u0430\u043D Microsoft.",
    auto: "TypeScript is JavaScript with types. Created by Microsoft, it adds static typing, interfaces, and generics.",
  },
  "html": {
    el: "To HTML (HyperText Markup Language) einai h vash tou web. Xrhsimopoieitai gia na orizei thn domh tis selidas (headings, paragraphs, links, images). HTML5 prosferei semantic elements (header, nav, main, footer) kai multimedia support (video, audio, canvas).",
    en: "HTML (HyperText Markup Language) is the foundation of the web. Used to define page structure (headings, paragraphs, links, images). HTML5 offers semantic elements (header, nav, main, footer) and multimedia support.",
    fr: "HTML est la fondation du web. Utilis\u00E9 pour d\u00E9finir la structure des pages.",
    de: "HTML ist das Fundament des Webs. Wird f\u00FCr die Seitenstruktur verwendet.",
    es: "HTML es la base de la web. Se usa para definir la estructura de p\u00E1ginas.",
    it: "HTML \u00E8 la base del web. Usato per definire la struttura delle pagine.",
    pt: "HTML \u00E9 a base da web. Usado para definir a estrutura das p\u00E1ginas.",
    tr: "HTML web'in temelidir. Sayfa yap\u0131s\u0131n\u0131 tan\u0131mlamak i\u00E7in kullan\u0131l\u0131r.",
    ar: "HTML \u0647\u0648 \u0623\u0633\u0627\u0633 \u0627\u0644\u0648\u064A\u0628.",
    zh: "HTML\u662F\u7F51\u7EDC\u7684\u57FA\u7840\u3002\u7528\u4E8E\u5B9A\u4E49\u9875\u9762\u7ED3\u6784\u3002",
    ja: "HTML\u306FWeb\u306E\u57FA\u790E\u3067\u3059\u3002\u30DA\u30FC\u30B8\u69CB\u9020\u3092\u5B9A\u7FA9\u3059\u308B\u306E\u306B\u4F7F\u308F\u308C\u307E\u3059\u3002",
    ru: "HTML \u2014 \u043E\u0441\u043D\u043E\u0432\u0430 \u0432\u0435\u0431\u0430. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F \u0434\u043B\u044F \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u044B \u0441\u0442\u0440\u0430\u043D\u0438\u0446.",
    auto: "HTML (HyperText Markup Language) is the foundation of the web. Used to define page structure.",
  },
  "css": {
    el: "To CSS (Cascading Style Sheets) xrhsimopoieitai gia na stilizei ta HTML elements. Modern CSS periexei Flexbox, Grid, CSS Variables, kai animations. Tailwind CSS einai ena popoular utility-first framework.",
    en: "CSS (Cascading Style Sheets) is used to style HTML elements. Modern CSS includes Flexbox, Grid, CSS Variables, and animations. Tailwind CSS is a popular utility-first framework.",
    fr: "CSS est utilis\u00E9 pour styliser les \u00E9l\u00E9ments HTML.",
    de: "CSS wird verwendet, um HTML-Elemente zu gestalten.",
    es: "CSS se usa para estilizar elementos HTML.",
    it: "CSS \u00E8 usato per stilizzare gli elementi HTML.",
    pt: "CSS \u00E9 usado para estilizar elementos HTML.",
    tr: "HTML \u00F6\u011Felerini stilize etmek i\u00E7in kullan\u0131l\u0131r.",
    ar: "CSS \u064A\u0633\u062A\u062E\u062F\u0645 \u0644\u062A\u0635\u0645\u064A\u0645 \u0639\u0646\u0627\u0635\u0631 HTML.",
    zh: "CSS\u7528\u4E8E\u8BBE\u7F6EHTML\u5143\u7D20\u7684\u6837\u5F0F\u3002",
    ja: "CSS\u306FHTML\u8981\u7D20\u306E\u30B9\u30BF\u30A4\u30EA\u30F3\u30B0\u306B\u4F7F\u308F\u308C\u307E\u3059\u3002",
    ru: "CSS \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F \u0434\u043B\u044F \u0441\u0442\u0438\u043B\u0438\u0437\u0430\u0446\u0438\u0438 HTML.",
    auto: "CSS (Cascading Style Sheets) is used to style HTML elements. Modern CSS includes Flexbox, Grid, CSS Variables, and animations.",
  },
  "ai": {
    el: "To AI (Artificial Intelligence) einai o tomeas pou asxoleitai me thn dimiourgia exypnwn systhmatwn. Ta basika paradigmata einai: Machine Learning (ekmathisi apo dedomena), Deep Learning (neural networks), NLP (epexergasia fysikhs glwssas), kai Computer Vision. Ta LLM (Large Language Models) opws to GPT kai Claude einai oi pio nees exelixeis.",
    en: "AI (Artificial Intelligence) is the field of creating intelligent systems. Key paradigms: Machine Learning (learning from data), Deep Learning (neural networks), NLP (natural language processing), and Computer Vision. LLMs (Large Language Models) like GPT and Claude are the latest developments.",
    fr: "L'IA est le domaine de cr\u00E9ation de syst\u00E8mes intelligents. Les LLM comme GPT et Claude sont les derniers d\u00E9veloppements.",
    de: "KI ist das Gebiet der intelligenten Systeme. LLMs wie GPT und Claude sind die neuesten Entwicklungen.",
    es: "La IA es el campo de crear sistemas inteligentes. Los LLM como GPT y Claude son los \u00FAltimos desarrollos.",
    it: "L'IA \u00E8 il campo dei sistemi intelligenti. I LLM come GPT e Claude sono gli ultimi sviluppi.",
    pt: "A IA \u00E9 o campo de cria\u00E7\u00E3o de sistemas inteligentes.",
    tr: "YZ, ak\u0131ll\u0131 sistemler yaratma alan\u0131d\u0131r.",
    ar: "\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0647\u0648 \u0645\u062C\u0627\u0644 \u0625\u0646\u0634\u0627\u0621 \u0623\u0646\u0638\u0645\u0629 \u0630\u0643\u064A\u0629.",
    zh: "\u4EBA\u5DE5\u667A\u80FD\u662F\u521B\u5EFA\u667A\u80FD\u7CFB\u7EDF\u7684\u9886\u57DF\u3002LLM\u5982GPT\u548CClaude\u662F\u6700\u65B0\u53D1\u5C55\u3002",
    ja: "AI\u306F\u77E5\u7684\u30B7\u30B9\u30C6\u30E0\u3092\u4F5C\u308B\u5206\u91CE\u3067\u3059\u3002GPT\u3084Claude\u306A\u3069\u306ELLM\u304C\u6700\u65B0\u306E\u767A\u5C55\u3067\u3059\u3002",
    ru: "\u0418\u0418 \u2014 \u043E\u0431\u043B\u0430\u0441\u0442\u044C \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F \u0438\u043D\u0442\u0435\u043B\u043B\u0435\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u044B\u0445 \u0441\u0438\u0441\u0442\u0435\u043C.",
    auto: "AI (Artificial Intelligence) is the field of creating intelligent systems. Key paradigms: Machine Learning, Deep Learning, NLP, and Computer Vision.",
  },
  "vite": {
    el: "To Vite einai ena fast build tool gia web development. Dimiourgithike apo ton Evan You (dimioyrgos tou Vue). Xrhsimopoiei ES modules gia instant dev server kai Rollup gia production builds. Yposthrizei React, Vue, Svelte, kai alles.",
    en: "Vite is a fast build tool for web development. Created by Evan You (creator of Vue). Uses ES modules for instant dev server and Rollup for production builds. Supports React, Vue, Svelte, and more.",
    fr: "Vite est un outil de build rapide pour le d\u00E9veloppement web.",
    de: "Vite ist ein schnelles Build-Tool f\u00FCr die Webentwicklung.",
    es: "Vite es una herramienta de build r\u00E1pida para desarrollo web.",
    it: "Vite \u00E8 uno strumento di build veloce per lo sviluppo web.",
    pt: "Vite \u00E9 uma ferramenta de build r\u00E1pida para desenvolvimento web.",
    tr: "Vite, web geli\u015Ftirme i\u00E7in h\u0131zl\u0131 bir build arac\u0131d\u0131r.",
    ar: "Vite \u0623\u062F\u0627\u0629 \u0628\u0646\u0627\u0621 \u0633\u0631\u064A\u0639\u0629 \u0644\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0648\u064A\u0628.",
    zh: "Vite\u662F\u4E00\u4E2A\u5FEB\u901F\u7684Web\u5F00\u53D1\u6784\u5EFA\u5DE5\u5177\u3002",
    ja: "Vite\u306FWeb\u958B\u767A\u306E\u305F\u3081\u306E\u9AD8\u901F\u30D3\u30EB\u30C9\u30C4\u30FC\u30EB\u3067\u3059\u3002",
    ru: "Vite \u2014 \u0431\u044B\u0441\u0442\u0440\u044B\u0439 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442 \u0434\u043B\u044F \u0432\u0435\u0431-\u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u043A\u0438.",
    auto: "Vite is a fast build tool for web development. Created by Evan You (creator of Vue).",
  },
  "electron": {
    el: "To Electron einai framework gia na ftiaxneis desktop apps me web technologies (HTML, CSS, JavaScript). Xrhsimopoieitai apo apps opws VS Code, Discord, kai Slack. Sunde thn Chromium me Node.js.",
    en: "Electron is a framework for building desktop apps with web technologies (HTML, CSS, JavaScript). Used by VS Code, Discord, and Slack. Combines Chromium with Node.js.",
    fr: "Electron est un framework pour cr\u00E9er des applications de bureau avec des technologies web.",
    de: "Electron ist ein Framework f\u00FCr Desktop-Apps mit Web-Technologien.",
    es: "Electron es un framework para crear aplicaciones de escritorio con tecnolog\u00EDas web.",
    it: "Electron \u00E8 un framework per creare app desktop con tecnologie web.",
    pt: "Electron \u00E9 um framework para criar apps desktop com tecnologias web.",
    tr: "Electron, web teknolojileriyle masa\u00FCst\u00FC uygulamalar\u0131 yapmak i\u00E7in bir framework't\u00FCr.",
    ar: "Electron \u0647\u0648 \u0625\u0637\u0627\u0631 \u0644\u0628\u0646\u0627\u0621 \u062A\u0637\u0628\u064A\u0642\u0627\u062A \u0633\u0637\u062D \u0627\u0644\u0645\u0643\u062A\u0628 \u0628\u062A\u0642\u0646\u064A\u0627\u062A \u0627\u0644\u0648\u064A\u0628.",
    zh: "Electron\u662F\u4F7F\u7528Web\u6280\u672F\u6784\u5EFA\u684C\u9762\u5E94\u7528\u7684\u6846\u67B6\u3002",
    ja: "Electron\u306FWeb\u6280\u8853\u3067\u30C7\u30B9\u30AF\u30C8\u30C3\u30D7\u30A2\u30D7\u30EA\u3092\u4F5C\u308B\u30D5\u30EC\u30FC\u30E0\u30EF\u30FC\u30AF\u3067\u3059\u3002",
    ru: "Electron \u2014 \u0444\u0440\u0435\u0439\u043C\u0432\u043E\u0440\u043A \u0434\u043B\u044F desktop \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0439 \u043D\u0430 \u0432\u0435\u0431-\u0442\u0435\u0445\u043D\u043E\u043B\u043E\u0433\u0438\u044F\u0445.",
    auto: "Electron is a framework for building desktop apps with web technologies. Used by VS Code, Discord, and Slack.",
  },
};

// Topic-based response patterns for common questions
const TOPIC_RESPONSES: { pattern: RegExp; topic: string; followUp: Record<Language, string> }[] = [
  { pattern: /\b(ti einai|what is|qu'est-ce que|was ist|que es|che cos'è|o que \u00E9|nedir|ma huva|shi shenme|nani desu|chto takoye)\b/i, topic: "general",
    followUp: { el: "Mporeis na me rwthseis gia: React, Python, JavaScript, TypeScript, HTML, CSS, AI, Vite, Electron, h opoiodhpote allo thema. Ti sou endiaferei?", en: "You can ask me about: React, Python, JavaScript, TypeScript, HTML, CSS, AI, Vite, Electron, or any other topic. What interests you?", fr: "Vous pouvez me demander: React, Python, JavaScript, TypeScript, HTML, CSS, AI, Vite, Electron. Qu'est-ce qui vous int\u00E9resse?", de: "Sie k\u00F6nnen mich fragen: React, Python, JavaScript, TypeScript, HTML, CSS, AI, Vite, Electron.", es: "Puedes preguntarme: React, Python, JavaScript, TypeScript, HTML, CSS, AI, Vite, Electron.", it: "Puoi chiedermi: React, Python, JavaScript, TypeScript, HTML, CSS, AI, Vite, Electron.", pt: "Voc\u00EA pode me perguntar: React, Python, JavaScript, TypeScript, HTML, CSS, AI, Vite, Electron.", tr: "React, Python, JavaScript, TypeScript, HTML, CSS, AI, Vite, Electron hakk\u0131nda sorabilirsiniz.", ar: "\u064A\u0645\u0643\u0646\u0643 \u0633\u0624\u0627\u0644\u064A \u0639\u0646: React, Python, JavaScript, TypeScript, HTML, CSS, AI, Vite, Electron.", zh: "\u4F60\u53EF\u4EE5\u95EE\u6211\u5173\u4E8E: React, Python, JavaScript, TypeScript, HTML, CSS, AI, Vite, Electron\u3002", ja: "React, Python, JavaScript, TypeScript, HTML, CSS, AI, Vite, Electron\u306A\u3069\u306B\u3064\u3044\u3066\u8CEA\u554F\u3067\u304D\u307E\u3059\u3002", ru: "\u0412\u044B \u043C\u043E\u0436\u0435\u0442\u0435 \u0441\u043F\u0440\u043E\u0441\u0438\u0442\u044C \u043E: React, Python, JavaScript, TypeScript, HTML, CSS, AI, Vite, Electron.", auto: "You can ask me about: React, Python, JavaScript, TypeScript, HTML, CSS, AI, Vite, Electron, or any other topic." } },
  { pattern: /\b(pos|how|comment|wie|como|come|como|nas[il]l|kayf|zenme|dou|kak)\b/i, topic: "howto",
    followUp: { el: "Mporeis na me rwtas pws na kaneis otiadhpote! Px:\n- \"Pos ftiaxnw ena React app?\"\n- \"Pos kanw install Python?\"\n- \"Pos ftiaxnw website?\"", en: "You can ask me how to do anything! Eg:\n- \"How do I create a React app?\"\n- \"How to install Python?\"\n- \"How to build a website?\"", fr: "Vous pouvez me demander comment faire n'importe quoi!", de: "Sie k\u00F6nnen mich fragen, wie man alles macht!", es: "\u00A1Puedes preguntarme c\u00F3mo hacer cualquier cosa!", it: "Puoi chiedermi come fare qualsiasi cosa!", pt: "Voc\u00EA pode me perguntar como fazer qualquer coisa!", tr: "Herhangi bir \u015Feyin nas\u0131l yap\u0131ld\u0131\u011F\u0131n\u0131 sorabilirsiniz!", ar: "\u064A\u0645\u0643\u0646\u0643 \u0633\u0624\u0627\u0644\u064A \u0643\u064A\u0641 \u062A\u0641\u0639\u0644 \u0623\u064A \u0634\u064A\u0621!", zh: "\u4F60\u53EF\u4EE5\u95EE\u6211\u5982\u4F55\u505A\u4EFB\u4F55\u4E8B\u60C5\uFF01", ja: "\u3069\u3093\u306A\u3053\u3068\u3067\u3082\u8CEA\u554F\u3067\u304D\u307E\u3059\uFF01", ru: "\u0412\u044B \u043C\u043E\u0436\u0435\u0442\u0435 \u0441\u043F\u0440\u043E\u0441\u0438\u0442\u044C \u043A\u0430\u043A \u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0447\u0442\u043E \u0443\u0433\u043E\u0434\u043D\u043E!", auto: "You can ask me how to do anything! E.g. 'How do I create a React app?'" } },
  { pattern: /\b(ti kaneis|how are you|comment allez|wie geht|como estas|come stai|como vai|nasilsin|kayf halak|ni hao ma|ogenki desu|kak dela)\b/i, topic: "status",
    followUp: { el: "Mia xara eimai! Exw 1,247 patterns stin mnimi mou kai mathainw synechws. Esy ti kaneis? Ti mporw na sou voithisw?", en: "I'm doing great! I have 1,247 patterns in my memory and I'm constantly learning. How about you? How can I help?", fr: "Je vais bien! J'ai 1 247 sch\u00E9mas en m\u00E9moire. Comment puis-je vous aider?", de: "Mir geht es gut! Ich habe 1.247 Muster im Speicher. Wie kann ich helfen?", es: "\u00A1Estoy bien! Tengo 1.247 patrones en memoria. \u00BFC\u00F3mo puedo ayudarte?", it: "Sto bene! Ho 1.247 schemi in memoria. Come posso aiutarti?", pt: "Estou bem! Tenho 1.247 padr\u00F5es em mem\u00F3ria. Como posso ajudar?", tr: "\u0130yiyim! Haf\u0131zamda 1.247 \u00F6rnek var. Size nas\u0131l yard\u0131mc\u0131 olabilirim?", ar: "\u0623\u0646\u0627 \u0628\u062E\u064A\u0631! \u0644\u062F\u064A 1247 \u0646\u0645\u0648\u0630\u062C\u0627\u064B \u0641\u064A \u0627\u0644\u0630\u0627\u0643\u0631\u0629.", zh: "\u6211\u5F88\u597D\uFF01\u6211\u67091247\u4E2A\u6A21\u5F0F\u5728\u5185\u5B58\u4E2D\u3002", ja: "\u5143\u6C17\u3067\u3059\uFF01\u30E1\u30E2\u30EA\u306B1,247\u306E\u30D1\u30BF\u30FC\u30F3\u304C\u3042\u308A\u307E\u3059\u3002", ru: "\u0412\u0441\u0435 \u043E\u0442\u043B\u0438\u0447\u043D\u043E! \u0412 \u043F\u0430\u043C\u044F\u0442\u0438 1247 \u043F\u0430\u0442\u0442\u0435\u0440\u043D\u043E\u0432.", auto: "I'm doing great! I have 1,247 patterns in my memory and I'm constantly learning. How can I help?" } },
];

function findTopicResponse(input: string, lang: Language): string | null {
  const lower = input.toLowerCase();
  // Check knowledge database
  for (const [topic, translations] of Object.entries(KNOWLEDGE_DB)) {
    if (lower.includes(topic)) {
      const answer = translations[lang] || translations.auto;
      return answer;
    }
  }
  // Check topic patterns
  for (const t of TOPIC_RESPONSES) {
    if (t.pattern.test(lower)) {
      return t.followUp[lang] || t.followUp.auto;
    }
  }
  return null;
}

// ─── Multi-language response generator ────────────────────────────

function respondIn(lang: Language, input: string): { messages: Message[]; thoughts: ThoughtEntry[]; memoryDelta: number } {
  const lower = input.toLowerCase();
  const thoughts: ThoughtEntry[] = [
    { id: uid(), time: now(), type: "reason", text: `Processing in [${lang.toUpperCase()}]: "${input.slice(0, 50)}${input.length > 50 ? "..." : ""}"` },
  ];
  const reasoning: ReasoningStep[] = [
    { num: 1, status: "done", text: `Detected language: <em>${LANG_LIST.find(l => l.code === lang)?.name || lang}</em>` },
    { num: 2, status: "done", text: "Searching knowledge base for relevant information..." },
    { num: 3, status: "done", text: "Formulating response in detected language" },
    { num: 4, status: "done", text: "Storing interaction for future learning" },
  ];

  const msg = (text: string, code?: { lang: string; body: string }): Message => ({
    id: uid(), sender: "agent", text, lang, code, reasoning, sources: ["knowledge-base", "conversation-memory"], timestamp: new Date(),
  });

  // System optimization
  if (lower.includes("optim") || lower.includes("pc") || lower.includes("systim") || lower.includes("sistema") || lower.includes("syst\u00e8me") || lower.includes("system") || lower.includes("sistemas")) {
    thoughts.push({ id: uid(), time: now(), type: "act", text: "System analysis initiated" });
    const responses: Record<Language, string> = {
      el: "Ekanw plhrh analysh tou PC sou. Vrika tis parakatw beltistopoihseis. An theleis na tis efarmwsw, patise Approve:",
      en: "I performed a full system analysis. Here are the optimizations I found. If you want me to apply them, hit Approve:",
      fr: "J'ai effectu\u00E9 une analyse compl\u00E8te. Voici les optimisations trouv\u00E9es:",
      de: "Ich habe eine vollst\u00E4ndige Systemanalyse durchgef\u00FChrt. Hier sind die Optimierungen:",
      es: "Realic\u00E9 un an\u00E1lisis completo del sistema. Estas son las optimizaciones:",
      it: "Ho eseguito un'analisi completa del sistema. Ecco le ottimizzazioni:",
      pt: "Fiz uma an\u00E1lise completa do sistema. Aqui est\u00E3o as otimiza\u00E7\u00F5es:",
      tr: "Sisteminizin tam analizini yapt\u0131m. I\u015Fte optimizasyonlar:",
      ar: "\u0623\u062C\u0631\u064A\u062A \u062A\u062D\u0644\u064A\u0644\u0627\u064B \u0643\u0627\u0645\u0644\u0627\u064B \u0644\u0644\u0646\u0638\u0627\u0645. \u0647\u0630\u0647 \u0627\u0644\u062A\u062D\u0633\u064A\u0646\u0627\u062A:",
      zh: "\u6211\u5BF9\u4F60\u7684\u7CFB\u7EDF\u8FDB\u884C\u4E86\u5B8C\u6574\u5206\u6790\u3002\u4EE5\u4E0B\u662F\u4F18\u5316\u5EFA\u8BAE:",
      ja: "\u30B7\u30B9\u30C6\u30E0\u306E\u5B8C\u5168\u306A\u5206\u6790\u3092\u884C\u3044\u307E\u3057\u305F\u3002\u6700\u9069\u5316\u306E\u7D50\u679C:",
      ru: "\u042F \u043F\u0440\u043E\u0432\u0435\u043B \u043F\u043E\u043B\u043D\u044B\u0439 \u0430\u043D\u0430\u043B\u0438\u0437 \u0441\u0438\u0441\u0442\u0435\u043C\u044B. \u041E\u043F\u0442\u0438\u043C\u0438\u0437\u0430\u0446\u0438\u0438:",
      auto: "I performed a full system analysis. Here are the optimizations I found. If you want me to apply them, hit Approve:",
    };
    return {
      thoughts, memoryDelta: 2,
      messages: [msg(responses[lang], { lang: "system-analysis", body: `CPU:   23% -> OK\nRAM:   6.8/20 GB -> Cache cleanup available (-1.2 GB)\nDisk:  42 MB/s -> SSD healthy, no defrag needed\nNet:   12ms -> Good latency\n\nSuggested actions:\n1. Clear system cache (-1.2 GB)\n2. Disable 3 unused startup programs\n3. Schedule driver update check` })],
    };
  }

  // Code
  if (lower.includes("code") || lower.includes("kwdika") || lower.includes("python") || lower.includes("javascript") || lower.includes("typescript") || lower.includes("react") || lower.includes("vite") || lower.includes("electron") || lower.includes("html") || lower.includes("css") || lower.includes("c\u00f3digo") || lower.includes("codice") || lower.includes("kod")) {
    thoughts.push({ id: uid(), time: now(), type: "learn", text: "Searching knowledge base for code" });
    // Check if it's a knowledge base topic
    const topicResponse = findTopicResponse(input, lang);
    if (topicResponse) {
      return { thoughts, memoryDelta: 3, messages: [msg(topicResponse)] };
    }
    const responses: Record<Language, string> = {
      el: "Edw einai ena paradeigma kwdika pou exw mathei. An theleis kati sygekrimeno, pwse mou:",
      en: "Here's a code example I've learned. If you need something specific, just ask:",
      fr: "Voici un exemple de code. Si vous avez besoin de quelque chose de sp\u00E9cifique, demandez:",
      de: "Hier ein Codebeispiel. Wenn Sie etwas Bestimmtes brauchen, fragen Sie:",
      es: "Aqu\u00ED tienes un ejemplo. Si necesitas algo espec\u00EDfico, pregunta:",
      it: "Ecco un esempio. Se hai bisogno di qualcosa di specifico, chiedi:",
      pt: "Aqui est\u00E1 um exemplo. Se precisar de algo espec\u00EDfico, pergunte:",
      tr: "I\u015Fte bir kod \u00F6rne\u011Fi. Belirli bir \u015Feye ihtiyac\u0131n\u0131z varsa sorun:",
      ar: "\u0647\u0630\u0627 \u0645\u062B\u0627\u0644. \u0625\u0646 \u0623\u062D\u062A\u062C\u062A \u0634\u064A\u0621\u064B\u0627 \u0645\u062D\u062F\u062F\u0627\u064B \u0633\u0624\u0627\u0644:",
      zh: "\u8FD9\u662F\u4EE3\u7801\u793A\u4F8B\u3002\u5982\u679C\u4F60\u9700\u8981\u7279\u5B9A\u7684\u4E1C\u897F\uFF0C\u8BF7\u544A\u8BC9\u6211:",
      ja: "\u3053\u308C\u306F\u30B3\u30FC\u30C9\u4F8B\u3067\u3059\u3002\u7279\u5B9A\u306E\u3082\u306E\u304C\u5FC5\u8981\u306A\u3089\u8CEA\u554F\u3057\u3066\u304F\u3060\u3055\u3044:",
      ru: "\u0412\u043E\u0442 \u043F\u0440\u0438\u043C\u0435\u0440 \u043A\u043E\u0434\u0430. \u0415\u0441\u043B\u0438 \u043D\u0443\u0436\u043D\u043E \u0447\u0442\u043E-\u0442\u043E \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u043E\u0435, \u0441\u043F\u0440\u043E\u0441\u0438\u0442\u0435:",
      auto: "Here's a code example I've learned. If you need something specific, just ask:",
    };
    return {
      thoughts, memoryDelta: 4,
      messages: [msg(responses[lang], { lang: "python", body: `# Areti learned: Python example\nfrom functools import lru_cache\n\n@lru_cache(maxsize=256)\ndef fibonacci(n: int) -> int:\n    if n < 2:\n        return n\n    return fibonacci(n - 1) + fibonacci(n - 2)\n\nprint(fibonacci(10))  # 55` })],
    };
  }

  // Search
  if (lower.includes("psakse") || lower.includes("search") || lower.includes("recherche") || lower.includes("buscar") || lower.includes("cerca") || lower.includes("suche") || lower.includes("ara")) {
    thoughts.push({ id: uid(), time: now(), type: "search", text: "Searching the web..." });
    const topicResponse = findTopicResponse(input, lang);
    if (topicResponse) {
      return { thoughts, memoryDelta: 3, messages: [msg(topicResponse)] };
    }
    const responses: Record<Language, string> = {
      el: "Psaksa gia auto sto internet. Edw einai ti vrika:",
      en: "I searched the web for this. Here's what I found:",
      fr: "J'ai cherch\u00E9 sur le web. Voici ce que j'ai trouv\u00E9:",
      de: "Ich habe im Web gesucht. Hier ist, was ich gefunden habe:",
      es: "Busqu\u00E9 en la web. Esto es lo que encontr\u00E9:",
      it: "Ho cercato sul web. Ecco cosa ho trovato:",
      pt: "Pesquisei na web. Aqui est\u00E1 o que encontrei:",
      tr: "Web'de arad\u0131m. I\u015Fte bulduklar\u0131m:",
      ar: "\u0628\u062D\u062B\u062A \u0639\u0646 \u0630\u0644\u0643 \u0641\u064A \u0627\u0644\u0648\u064A\u0628. \u0647\u0630\u0627 \u0645\u0627 \u0648\u062C\u062F\u062A:",
      zh: "\u6211\u5728\u7F51\u4E0A\u641C\u7D22\u4E86\u8FD9\u4E2A\u3002\u8FD9\u662F\u6211\u627E\u5230\u7684:",
      ja: "\u30A6\u30A7\u30D6\u3067\u691C\u7D22\u3057\u307E\u3057\u305F\u3002\u7D50\u679C:",
      ru: "\u042F \u0438\u0441\u043A\u0430\u043B \u044D\u0442\u043E \u0432 \u0441\u0435\u0442\u0438. \u0412\u043E\u0442 \u0447\u0442\u043E \u043D\u0430\u0448\u0451\u043B:",
      auto: "I searched the web for this. Here's what I found:",
    };
    return {
      thoughts, memoryDelta: 3,
      messages: [msg(responses[lang])],
    };
  }

  // Tasks
  if (lower.includes("task") || lower.includes("simera") || lower.includes("today") || lower.includes("aujourd") || lower.includes("hoy") || lower.includes("oggi") || lower.includes("heute") || lower.includes("bugun") || lower.includes("segodnya")) {
    const responses: Record<Language, string> = {
      el: "Edw einai ti kanw aftomata xwris na me zhthseis:\n\n1. Parakolouthisi apodosis PC (synekh)\n2. Ekpaideusi se nees glwsses programmatismou (background)\n3. Indexing neou documentation apo to internet\n4. Analysh tou kwdika sou gia optimization\n5. Ekmathisi apo tis prohgoumenes syzhthseis mas\n\nAn theleis kati sygekrimeno, pwse mou!",
      en: "Here are my autonomous tasks:\n\n1. System performance monitoring (continuous)\n2. Learning new programming languages (background)\n3. Indexing new documentation from the web\n4. Analyzing your code for optimization\n5. Learning from our past conversations\n\nIf you need something specific, just ask!",
      fr: "Voici mes t\u00E2ches autonomes:\n\n1. Surveillance des performances\n2. Apprentissage de nouveaux langages\n3. Indexation de la documentation\n4. Analyse de votre code\n5. Apprentissage des conversations pass\u00E9es\n\nSi vous avez besoin de quelque chose de sp\u00E9cifique, demandez!",
      de: "Meine autonomen Aufgaben:\n\n1. System\u00FCberwachung\n2. Neue Programmiersprachen lernen\n3. Dokumentation indexieren\n4. Code analysieren\n5. Aus vergangenen Gespr\u00E4chen lernen\n\nWenn Sie etwas Bestimmtes brauchen, fragen Sie!",
      es: "Mis tareas aut\u00F3nomas:\n\n1. Monitoreo del sistema\n2. Aprender nuevos lenguajes\n3. Indexar documentaci\u00F3n\n4. Analizar tu c\u00F3digo\n5. Aprender de conversaciones pasadas\n\n\u00A1Si necesitas algo, pregunta!",
      it: "I miei compiti autonomi:\n\n1. Monitoraggio del sistema\n2. Imparare nuovi linguaggi\n3. Indicizzare la documentazione\n4. Analizzare il tuo codice\n5. Imparare dalle conversazioni passate\n\nSe hai bisogno di qualcosa, chiedi!",
      pt: "Minhas tarefas aut\u00F4nomas:\n\n1. Monitoramento do sistema\n2. Aprender novas linguagens\n3. Indexar documenta\u00E7\u00E3o\n4. Analisar seu c\u00F3digo\n5. Aprender com conversas passadas\n\nSe precisar de algo, pergunte!",
      tr: "\u00D6tonom g\u00F6revlerim:\n\n1. Sistem performans\u0131 izleme\n2. Yeni programlama dilleri \u00F6\u011Frenme\n3. Dok\u00FCmantasyon indeksleme\n4. Kodunuzu analiz etme\n5. Ge\u00E7mi\u015F konu\u015Fmalardan \u00F6\u011Frenme\n\nBir \u015Feye ihtiyac\u0131n\u0131z varsa sorun!",
      ar: "\u0645\u0647\u0627\u0645\u064A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A:\n\n1. \u0645\u0631\u0627\u0642\u0628\u0629 \u0623\u062F\u0627\u0621 \u0627\u0644\u0646\u0638\u0627\u0645\n2. \u062A\u0639\u0644\u0645 \u0644\u063A\u0627\u062A \u0628\u0631\u0645\u062C\u0629 \u062C\u062F\u064A\u062F\u0629\n3. \u0641\u0647\u0631\u0633\u0629 \u0627\u0644\u062A\u062B\u0642\u064A\u0641\n4. \u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0643\u0648\u062F\n5. \u0627\u0644\u062A\u0639\u0644\u0645 \u0645\u0646 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0627\u062A \u0627\u0644\u0633\u0627\u0628\u0642\u0629\n\n\u0625\u0646 \u0623\u062D\u062A\u062C\u062A \u0634\u064A\u0621\u064B\u0627 \u0633\u0624\u0627\u0644!",
      zh: "\u6211\u7684\u81EA\u4E3B\u4EFB\u52A1:\n\n1. \u7CFB\u7EDF\u6027\u80FD\u76D1\u63A7\n2. \u5B66\u4E60\u65B0\u7F16\u7A0B\u8BED\u8A00\n3. \u7D22\u5F15\u6587\u6863\n4. \u5206\u6790\u4F60\u7684\u4EE3\u7801\n5. \u4ECE\u8FC7\u53BB\u7684\u5BF9\u8BDD\u4E2D\u5B66\u4E60\n\n\u5982\u679C\u4F60\u9700\u8981\u7279\u5B9A\u7684\u4E1C\u897F\uFF0C\u8BF7\u544A\u8BC9\u6211\uFF01",
      ja: "\u79C1\u306E\u81EA\u52D5\u30BF\u30B9\u30AF:\n\n1. \u30B7\u30B9\u30C6\u30E0\u30D1\u30D5\u30A9\u30FC\u30DE\u30F3\u30B9\u76E3\u8996\n2. \u65B0\u3057\u3044\u30D7\u30ED\u30B0\u30E9\u30DF\u30F3\u30B0\u8A00\u8A9E\u306E\u5B66\u7FD2\n3. \u30C9\u30AD\u30E5\u30E1\u30F3\u30C6\u30FC\u30B7\u30E7\u30F3\u306E\u30A4\u30F3\u30C7\u30C3\u30AF\u30B9\n4. \u30B3\u30FC\u30C9\u5206\u6790\n5. \u904E\u53BB\u306E\u4F1A\u8A71\u304B\u3089\u306E\u5B66\u7FD2\n\n\u7279\u5B9A\u306E\u3082\u306E\u304C\u5FC5\u8981\u306A\u3089\u8CEA\u554F\u3057\u3066\u304F\u3060\u3055\u3044\uFF01",
      ru: "\u041C\u043E\u0438 \u0430\u0432\u0442\u043E\u043D\u043E\u043C\u043D\u044B\u0435 \u0437\u0430\u0434\u0430\u0447\u0438:\n\n1. \u041C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433 \u0441\u0438\u0441\u0442\u0435\u043C\u044B\n2. \u0418\u0437\u0443\u0447\u0435\u043D\u0438\u0435 \u043D\u043E\u0432\u044B\u0445 \u044F\u0437\u044B\u043A\u043E\u0432\n3. \u0418\u043D\u0434\u0435\u043A\u0441\u0430\u0446\u0438\u044F \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430\u0446\u0438\u0438\n4. \u0410\u043D\u0430\u043B\u0438\u0437 \u043A\u043E\u0434\u0430\n5. \u041E\u0431\u0443\u0447\u0435\u043D\u0438\u0435 \u043D\u0430 \u043F\u0440\u043E\u0448\u043B\u044B\u0445 \u0434\u0438\u0430\u043B\u043E\u0433\u0430\u0445\n\n\u0415\u0441\u043B\u0438 \u0447\u0442\u043E-\u0442\u043E \u043D\u0443\u0436\u043D\u043E, \u0441\u043F\u0440\u043E\u0441\u0438\u0442\u0435!",
      auto: "Here are my autonomous tasks:\n\n1. System performance monitoring (continuous)\n2. Learning new programming languages (background)\n3. Indexing new documentation from the web\n4. Analyzing your code for optimization\n5. Learning from our past conversations\n\nIf you need something specific, just ask!",
    };
    return {
      thoughts, memoryDelta: 1,
      messages: [msg(responses[lang])],
    };
  }

  // Greeting
  if (lower.length < 15 && /\b(hi|hello|hey|geia|salut|hola|ciao|hallo|ola|merhaba|privet|bonjour)\b/.test(lower)) {
    const responses: Record<Language, string> = {
      el: "Geia sou! Einai i Areti, o AI agent sou. Mporw na sou voithisw me kwdika, na sou eksigw concepts, na psaksw plirofories, na analysw to PC sou, kai alla polla. Ti sou endiaferei?",
      en: "Hey there! I'm Areti, your AI agent. I can help you with code, explain concepts, search for information, analyze your system, and much more. What are you interested in?",
      fr: "Bonjour! Je suis Ar\u00E9ti. Je peux vous aider avec le code, expliquer des concepts, chercher des informations et plus encore. Qu'est-ce qui vous int\u00E9resse?",
      de: "Hallo! Ich bin Areti. Ich kann Ihnen mit Code helfen, Konzepte erkl\u00E4ren und Informationen suchen. Was interessiert Sie?",
      es: "\u00A1Hola! Soy Areti. Puedo ayudarte con c\u00F3digo, explicar conceptos, buscar informaci\u00F3n y m\u00E1s. \u00BFQu\u00E9 te interesa?",
      it: "Ciao! Sono Areti. Posso aiutarti con il codice, spiegare concetti, cercare informazioni e altro. Cosa ti interessa?",
      pt: "Ol\u00E1! Sou a Areti. Posso ajudar com c\u00F3digo, explicar conceitos, pesquisar informa\u00E7\u00F5es e mais. O que te interessa?",
      tr: "Merhaba! Ben Areti. Kod yard\u0131m\u0131, kavram a\u00E7\u0131klamas\u0131, bilgi arama ve daha fazlas\u0131nda yard\u0131mc\u0131 olabilirim. Ne ilginizi \u00E7ekiyor?",
      ar: "\u0645\u0631\u062D\u0628\u0627! \u0623\u0646\u0627 \u0623\u0631\u064A\u062A\u064A. \u064A\u0645\u0643\u0646\u0646\u064A \u0645\u0633\u0627\u0639\u062F\u062A\u0643 \u0628\u0627\u0644\u0643\u0648\u062F\u060C \u0634\u0631\u062D \u0627\u0644\u0645\u0641\u0627\u0647\u064A\u0645\u060C \u0627\u0644\u0628\u062D\u062B \u0648\u0623\u0643\u062B\u0631. \u0645\u0627\u0630\u0627 \u064A\u0647\u062A\u0645\u0643\u061F",
      zh: "\u4F60\u597D\uFF01\u6211\u662FAreti\u3002\u6211\u53EF\u4EE5\u5E2E\u4F60\u5199\u4EE3\u7801\u3001\u89E3\u91CA\u6982\u5FF5\u3001\u641C\u7D22\u4FE1\u606F\u7B49\u3002\u4F60\u5BF9\u4EC0\u4E48\u611F\u5174\u8DA3\uFF1F",
      ja: "\u3053\u3093\u306B\u3061\u306F\uFF01\u79C1\u306FAreti\u3067\u3059\u3002\u30B3\u30FC\u30C9\u306E\u30D8\u30EB\u30D7\u3001\u6982\u5FF5\u306E\u8AAC\u660E\u3001\u60C5\u5831\u691C\u7D22\u304C\u3067\u304D\u307E\u3059\u3002\u4F55\u306B\u8208\u5473\u304C\u3042\u308A\u307E\u3059\u304B\uFF1F",
      ru: "\u041F\u0440\u0438\u0432\u0435\u0442! \u042F Areti. \u041C\u043E\u0433\u0443 \u043F\u043E\u043C\u043E\u0447\u044C \u0441 \u043A\u043E\u0434\u043E\u043C, \u043E\u0431\u044A\u044F\u0441\u043D\u0438\u0442\u044C \u043A\u043E\u043D\u0446\u0435\u043F\u0446\u0438\u0438, \u0438\u0441\u043A\u0430\u0442\u044C \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044E. \u0427\u0442\u043E \u0438\u043D\u0442\u0435\u0440\u0435\u0441\u043D\u043E?",
      auto: "Hey there! I'm Areti, your AI agent. I can help you with code, explain concepts, search for information, analyze your system, and much more. What are you interested in?",
    };
    return { thoughts, memoryDelta: 0, messages: [msg(responses[lang])] };
  }

  // Check knowledge base for any topic mentioned
  const topicResponse = findTopicResponse(input, lang);
  if (topicResponse) {
    thoughts.push({ id: uid(), time: now(), type: "learn", text: "Found relevant topic in knowledge base" });
    return { thoughts, memoryDelta: 2, messages: [msg(topicResponse)] };
  }

  // Smart generic response based on language
  const g: Record<Language, (i: string) => string> = {
    el: (i) => `Endiaferon thema! Analyw: "${i.slice(0, 60)}".\n\nMporw na se voithisw pio sygekrimena an mou dwseis perissoteres plirofories. Px:\n- Theleis na sou eksigw ena concept?\n- Xreiazesai kwdika?\n- Thes na psaksw kati?\n\nPwse mou ti akribws theleis!`,
    en: (i) => `Interesting topic! I'm analyzing: "${i.slice(0, 60)}".\n\nI can help more specifically if you give me more details. For example:\n- Want me to explain a concept?\n- Need code examples?\n- Should I search for something?\n\nJust tell me what you need!`,
    fr: (i) => `Sujet int\u00E9ressant! J'analyse: "${i.slice(0, 60)}".\n\nDonnez-moi plus de d\u00E9tails pour que je puisse mieux vous aider.`,
    de: (i) => `Interessantes Thema! Ich analysiere: "${i.slice(0, 60)}".\n\nGeben Sie mir mehr Details, damit ich besser helfen kann.`,
    es: (i) => `\u00A1Tema interesante! Estoy analizando: "${i.slice(0, 60)}".\n\nDame m\u00E1s detalles para ayudarte mejor.`,
    it: (i) => `Argomento interessante! Sto analizzando: "${i.slice(0, 60)}".\n\nDammi pi\u00F9 dettagli per aiutarti meglio.`,
    pt: (i) => `Assunto interessante! Estou analisando: "${i.slice(0, 60)}".\n\nMe d\u00EA mais detalhes para ajudar melhor.`,
    tr: (i) => `\u0130lgin\u00E7 konu! "${i.slice(0, 60)}" analiz ediyorum.\n\nDaha iyi yard\u0131mc\u0131 olmak i\u00E7in daha fazla detay verin.`,
    ar: (i) => `\u0645\u0648\u0636\u0648\u0639 \u0645\u062B\u064A\u0631 \u0644\u0644\u0627\u0647\u062A\u0645\u0627\u0645! \u0623\u062D\u0644\u0644: "${i.slice(0, 60)}".\n\n\u0623\u0639\u0637\u0646\u064A \u062A\u0641\u0627\u0635\u064A\u0644 \u0623\u0643\u062B\u0631 \u0644\u0645\u0633\u0627\u0639\u062F\u062A\u0643 \u0628\u0634\u0643\u0644 \u0623\u0641\u0636\u0644.`,
    zh: (i) => `\u6709\u8DA3\u7684\u8BDD\u9898\uFF01\u6211\u6B63\u5728\u5206\u6790: "${i.slice(0, 60)}".\n\n\u8BF7\u7ED9\u6211\u66F4\u591A\u7EC6\u8282\uFF0C\u6211\u53EF\u4EE5\u66F4\u597D\u5730\u5E2E\u52A9\u4F60\u3002`,
    ja: (i) => `\u8208\u5473\u6DF1\u3044\u30C8\u30D4\u30C3\u30AF\u3067\u3059\uFF01"${i.slice(0, 60)}"\u3092\u5206\u6790\u4E2D\u3067\u3059\u3002\n\n\u3082\u3063\u3068\u8A73\u7D30\u3092\u6559\u3048\u3066\u304F\u3060\u3055\u3044\u3002`,
    ru: (i) => `\u0418\u043D\u0442\u0435\u0440\u0435\u0441\u043D\u0430\u044F \u0442\u0435\u043C\u0430! \u0410\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u0443\u044E: "${i.slice(0, 60)}".\n\n\u0414\u0430\u0439\u0442\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 \u0434\u0435\u0442\u0430\u043B\u0435\u0439 \u0434\u043B\u044F \u043B\u0443\u0447\u0448\u0435\u0439 \u043F\u043E\u043C\u043E\u0449\u0438.`,
    auto: (i) => `Interesting topic! I'm analyzing: "${i.slice(0, 60)}".\n\nI can help more specifically if you give me more details. For example:\n- Want me to explain a concept?\n- Need code examples?\n- Should I search for something?\n\nJust tell me what you need!`,
  };
  return { thoughts, memoryDelta: 1, messages: [msg(g[lang](input))] };
}

// ─── Action Generator ─────────────────────────────────────────────

function generateAction(input: string): Action | null {
  const lower = input.toLowerCase();
  if (lower.includes("optim") || lower.includes("pc") || lower.includes("systim")) {
    return {
      id: uid(),
      title: "System Optimization",
      description: "Analyze and optimize your PC performance. I will clean caches, disable unnecessary startup programs, and check for driver updates.",
      steps: [
        { label: "Scan CPU, RAM, Disk, Network metrics", status: "pending" },
        { label: "Clear system cache (-1.2 GB estimated)", status: "pending" },
        { label: "Disable unused startup programs", status: "pending" },
        { label: "Schedule driver update check", status: "pending" },
        { label: "Index new optimization rules to memory", status: "pending" },
      ],
      status: "pending",
      logs: [],
    };
  }
  if (lower.includes("code") || lower.includes("kwdika") || lower.includes("python") || lower.includes("learn")) {
    return {
      id: uid(),
      title: "Code Learning & Analysis",
      description: "Search the code pattern database, generate examples, and add new patterns to the knowledge base.",
      steps: [
        { label: "Search knowledge base for relevant patterns", status: "pending" },
        { label: "Generate code example with best practices", status: "pending" },
        { label: "Store new patterns in memory", status: "pending" },
      ],
      status: "pending",
      logs: [],
    };
  }
  if (lower.includes("psakse") || lower.includes("search") || lower.includes("recherche") || lower.includes("buscar") || lower.includes("suche")) {
    return {
      id: uid(),
      title: "Web Search & Research",
      description: "Search the web for information, evaluate sources, and synthesize an answer.",
      steps: [
        { label: "Query web sources for relevant information", status: "pending" },
        { label: "Evaluate source credibility and relevance", status: "pending" },
        { label: "Cross-reference top results for consistency", status: "pending" },
        { label: "Synthesize answer and store in memory", status: "pending" },
      ],
      status: "pending",
      logs: [],
    };
  }
  if (lower.includes("ftiakse") || lower.includes("create") || lower.includes("dimiourg") || lower.includes("app") || lower.includes("efarmog")) {
    return {
      id: uid(),
      title: "Create Application",
      description: "Design and build a new application based on your requirements.",
      steps: [
        { label: "Analyze requirements and plan architecture", status: "pending" },
        { label: "Generate project structure and boilerplate", status: "pending" },
        { label: "Implement core features", status: "pending" },
        { label: "Test and validate the application", status: "pending" },
        { label: "Prepare for deployment", status: "pending" },
      ],
      status: "pending",
      logs: [],
    };
  }
  // Generic action for any non-trivial request
  if (lower.length > 15) {
    return {
      id: uid(),
      title: "Analyze & Process Request",
      description: `Process your request: "${input.slice(0, 60)}${input.length > 60 ? "..." : ""}"`,
      steps: [
        { label: "Analyze the request and identify intent", status: "pending" },
        { label: "Search knowledge base for relevant data", status: "pending" },
        { label: "Generate response and store learnings", status: "pending" },
      ],
      status: "pending",
      logs: [],
    };
  }
  return null;
}

// ─── Constants ────────────────────────────────────────────────────

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    sender: "agent",
    text: "Hello! I'm Areti \u2014 your autonomous AI agent. I can speak many languages! When you ask me to do something, I'll propose a plan and ask for your approval before executing. How can I help you?",
    lang: "en",
    timestamp: new Date(),
  },
];

const TRAINING_MODULES = [
  { icon: "\u{1F4DA}", title: "General Knowledge", desc: "Autonomous learning from the internet, documentation, and conversations.", progress: 52, color: "blue" },
  { icon: "\u{1F4BB}", title: "Code Learning", desc: "Learns programming patterns, best practices, and writes code autonomously.", progress: 41, color: "green" },
  { icon: "\u{2699}\u{FE0F}", title: "System Optimization", desc: "Continuously monitors and optimizes your PC without being asked.", progress: 78, color: "cyan" },
  { icon: "\u{1F30D}", title: "Multilingual", desc: "Understands and responds in 12+ languages with auto-detection.", progress: 67, color: "purple" },
  { icon: "\u{1F9E0}", title: "Self-Improvement", desc: "Analyzes its own performance, identifies gaps, and retrains itself.", progress: 25, color: "orange" },
];

const INITIAL_KNOWLEDGE: KnowledgeItem[] = [
  { type: "doc", name: "React Documentation", meta: "1.2MB - Updated 2h ago" },
  { type: "code", name: "Python Best Practices", meta: "340KB - Updated 1d ago" },
  { type: "url", name: "MDN Web Docs", meta: "Synced - 850 pages indexed" },
  { type: "note", name: "Custom Notes", meta: "23 entries - Last edit 30m ago" },
  { type: "learned", name: "User Interaction Patterns", meta: "Learned from 47 conversations" },
  { type: "learned", name: "Multilingual Knowledge", meta: "12 languages supported" },
];

const SYSTEM_TASKS = [
  { status: "done" as const, name: "Disk cleanup completed", time: "5m ago" },
  { status: "running" as const, name: "Monitoring CPU usage", time: "Active now" },
  { status: "done" as const, name: "Memory optimization", time: "12m ago" },
  { status: "running" as const, name: "Background learning: multilingual patterns", time: "Active now" },
  { status: "queued" as const, name: "Network latency check", time: "Queued" },
  { status: "done" as const, name: "Process prioritization", time: "20m ago" },
];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function now() {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// ─── App ──────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<View>("chat");
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [memoryUsed, setMemoryUsed] = useState(34);
  const [autonomousMode, setAutonomousMode] = useState(true);
  const [preferredLang, setPreferredLang] = useState<Language>("auto");
  const [thoughts, setThoughts] = useState<ThoughtEntry[]>([
    { id: uid(), time: now(), type: "reason", text: "Areti initialized. Autonomous mode active. Multilingual support enabled (12 languages)." },
    { id: uid(), time: now(), type: "memory", text: "Loaded 1,247 learned patterns from knowledge base" },
    { id: uid(), time: now(), type: "act", text: "Background system monitoring started" },
  ]);
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>(INITIAL_KNOWLEDGE);
  const [reasoningOpen, setReasoningOpen] = useState<Record<string, boolean>>({});
  const [actions, setActions] = useState<Action[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    const detectedLang = preferredLang === "auto" ? detectLanguage(text) : preferredLang;
    const userMsg: Message = { id: uid(), sender: "user", text: text.trim(), lang: detectedLang, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    if (/\b(psakse|search|recherche|buscar|cerca|suche|ara)\b/i.test(text.toLowerCase())) {
      setIsSearching(true);
    }

    setTimeout(() => {
      const result = respondIn(detectedLang, text.trim());
      const action = generateAction(text.trim());
      setIsTyping(false);
      setIsSearching(false);
      setMessages((prev) => [...prev, ...result.messages]);
      setThoughts((prev) => [...prev, ...result.thoughts]);
      setMemoryUsed((prev) => Math.min(95, prev + result.memoryDelta));

      if (action) {
        setActions((prev) => [...prev, action]);
      }

      if (result.memoryDelta > 0) {
        setKnowledge((prev) => {
          const existing = prev.find((k) => k.name === "Auto-learned from conversations");
          if (existing) return prev.map((k) => k.name === "Auto-learned from conversations" ? { ...k, meta: `Updated just now - ${prev.length + 3} entries` } : k);
          return [...prev, { type: "learned", name: "Auto-learned from conversations", meta: "Updated just now - 1 entry" }];
        });
      }
    }, 1000 + Math.random() * 800);
  }, [preferredLang]);

  function approveAction(actionId: string) {
    setActions((prev) => prev.map((a) => a.id === actionId ? { ...a, status: "executing" as const, logs: ["[info] User approved. Starting execution..."] } : a));

    // Simulate step-by-step execution
    const action = actions.find((a) => a.id === actionId);
    if (!action) return;

    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex >= action.steps.length) {
        clearInterval(interval);
        setActions((prev) => prev.map((a) => {
          if (a.id !== actionId) return a;
          return {
            ...a,
            status: "completed" as const,
            steps: a.steps.map((s) => ({ ...s, status: "done" as const })),
            logs: [...a.logs, "[success] All steps completed successfully."],
          };
        }));
        setThoughts((prev) => [...prev, { id: uid(), time: now(), type: "act", text: `Action "${action.title}" completed successfully.` }]);
        return;
      }

      const currentStep = stepIndex;
      setActions((prev) => prev.map((a) => {
        if (a.id !== actionId) return a;
        const newSteps = a.steps.map((s, i) => {
          if (i < currentStep) return { ...s, status: "done" as const };
          if (i === currentStep) return { ...s, status: "running" as const };
          return s;
        });
        return {
          ...a,
          steps: newSteps,
          logs: [...a.logs, `[running] ${action.steps[currentStep].label}...`],
        };
      }));

      setTimeout(() => {
        setActions((prev) => prev.map((a) => {
          if (a.id !== actionId) return a;
          return {
            ...a,
            logs: [...a.logs.filter((l) => !l.includes(action.steps[currentStep].label) || l.includes("[done]")), `[done] ${action.steps[currentStep].label} - completed`],
          };
        }));
      }, 600);

      stepIndex++;
    }, 1200);
  }

  function denyAction(actionId: string) {
    setActions((prev) => prev.map((a) => a.id === actionId ? { ...a, status: "denied" as const, logs: [...a.logs, "[denied] User denied this action."] } : a));
    setThoughts((prev) => [...prev, { id: uid(), time: now(), type: "reason", text: "User denied an action. Adjusting approach." }]);
  }

  function handleSubmit(e: FormEvent) { e.preventDefault(); sendMessage(input); }
  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }
  function toggleReasoning(msgId: string) { setReasoningOpen((prev) => ({ ...prev, [msgId]: !prev[msgId] })); }

  const ui = preferredLang === "auto" ? UI.auto : UI[preferredLang];
  const currentLangData = LANG_LIST.find((l) => l.code === preferredLang)!;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <span className="logo">Areti</span>
          <span className="status-dot" />
          <span className="status-text">
            {autonomousMode ? "Autonomous" : "Manual"} &bull; {currentLangData.flag} {currentLangData.name}
          </span>
          {autonomousMode && <span className="autonomy-badge">Autonomous</span>}
        </div>
        <div className="topbar-right">
          <select
            value={preferredLang}
            onChange={(e) => setPreferredLang(e.target.value as Language)}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.3rem 0.5rem", fontSize: "0.78rem", color: "var(--text)", cursor: "pointer" }}
          >
            {LANG_LIST.map((l) => (
              <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
            ))}
          </select>
          <div className={`toggle-switch ${autonomousMode ? "on" : ""}`} onClick={() => setAutonomousMode(!autonomousMode)} />
          <button className="btn" onClick={() => setView("system")}>{"\u{1F527}"} System</button>
        </div>
      </header>

      <nav className="sidebar">
        <div className="sidebar-section">
          <div className="sidebar-label">Navigation</div>
          {(["chat", "brain", "training", "knowledge", "system", "languages", "download"] as View[]).map((v) => {
            const icons: Record<View, string> = { chat: "\u{1F4AC}", brain: "\u{1F9E0}", training: "\u{1F393}", knowledge: "\u{1F4DA}", system: "\u{2699}\u{FE0F}", download: "\u{1F4E5}", languages: "\u{1F30D}" };
            const labels: Record<View, string> = { chat: "Chat", brain: "Brain", training: "Training", knowledge: "Knowledge", system: "System", download: "Download", languages: "Languages" };
            return (
              <div key={v} className={`nav-item ${view === v ? "active" : ""}`} onClick={() => setView(v)}>
                <span className="nav-icon">{icons[v]}</span> {labels[v]}
              </div>
            );
          })}
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">Quick Actions</div>
          <div className="nav-item" onClick={() => sendMessage("Optimise to PC mou")}>
            <span className="nav-icon">{"\u{26A1}"}</span> Optimize PC
          </div>
          <div className="nav-item" onClick={() => sendMessage("Analyse ti trexei tora")}>
            <span className="nav-icon">{"\u{1F50D}"}</span> Analyze System
          </div>
          <div className="nav-item" onClick={() => { setView("chat"); sendMessage("Na mathw kwdika simera"); }}>
            <span className="nav-icon">{"\u{1F4BB}"}</span> Learn Code
          </div>
          <div className="nav-item" onClick={() => sendMessage("Psakse gia nea sto internet")}>
            <span className="nav-icon">{"\u{1F310}"}</span> Web Search
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="memory-bar">
            <div className="memory-label">
              <span>Agent Memory</span>
              <span style={{ color: memoryUsed > 80 ? "var(--red)" : memoryUsed > 60 ? "var(--orange)" : "var(--blue)" }}>
                {memoryUsed > 80 ? "High" : memoryUsed > 60 ? "Medium" : "Healthy"}
              </span>
            </div>
            <div className="memory-track"><div className="memory-fill" style={{ width: `${memoryUsed}%` }} /></div>
            <div className="memory-stats">
              <span>{memoryUsed}% used</span>
              <span>{(memoryUsed * 0.2).toFixed(1)} / 20 GB</span>
            </div>
          </div>
          <div style={{ marginTop: "0.65rem", fontSize: "0.65rem", color: "var(--text-tertiary)", textAlign: "center", lineHeight: 1.5 }}>
            <div>Created by <strong style={{ color: "var(--text-secondary)" }}>Kouskouras D.</strong></div>
            <div style={{ marginTop: "0.15rem" }}>kouskourasd@gmail.com</div>
          </div>
        </div>
      </nav>

      <main className="main-content">
        {/* CHAT */}
        {view === "chat" && (
          <div className="chat-container">
            <div className="chat-messages">
              {messages.map((msg) => (
                <div key={msg.id} className="message">
                  <div className={`message-avatar ${msg.sender}`}>
                    {msg.sender === "agent" ? "A" : "U"}
                  </div>
                  <div className="message-content">
                    <div className={`message-sender ${msg.sender}`}>
                      {msg.sender === "agent" ? ui.agent : ui.you}
                      <span style={{ marginLeft: "0.5rem", fontSize: "0.6rem", opacity: 0.5 }}>{LANG_LIST.find(l => l.code === msg.lang)?.flag}</span>
                    </div>
                    <div className="message-text">
                      {msg.text}
                      {isSearching && msg.sender === "user" && msg.id === messages[messages.length - 1]?.id && (
                        <div className="web-search-indicator">
                          <div className="search-spinner" />
                          <span>{ui.searching}</span>
                        </div>
                      )}
                      {msg.reasoning && msg.reasoning.length > 0 && (
                        <div className="reasoning-chain">
                          <div className="reasoning-header" onClick={() => toggleReasoning(msg.id)}>
                            <span className="reasoning-header-icon">{"\u{1F9E0}"}</span>
                            <span className="reasoning-header-text">Reasoning</span>
                            <span className="reasoning-header-toggle">{reasoningOpen[msg.id] ? "\u25B2" : "\u25BC"}</span>
                          </div>
                          {reasoningOpen[msg.id] && (
                            <div className="reasoning-body">
                              {msg.reasoning.map((step) => (
                                <div key={step.num} className="reasoning-step">
                                  <div className={`reasoning-step-num ${step.status}`}>{step.status === "done" ? "\u2713" : step.num}</div>
                                  <div className="reasoning-step-text" dangerouslySetInnerHTML={{ __html: step.text }} />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="sources-list">{msg.sources.map((s) => <span key={s} className="source-chip">{s}</span>)}</div>
                      )}
                      {msg.code && (
                        <div className="code-block">
                          <div className="code-header"><span className="code-lang">{msg.code.lang}</span></div>
                          <div className="code-body">{msg.code.body}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="message">
                  <div className="message-avatar agent">A</div>
                  <div className="message-content">
                    <div className="message-sender agent">{ui.agent}</div>
                    <div className="typing-indicator">
                      <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                    </div>
                  </div>
                </div>
              )}
              {/* Action Cards */}
              {actions.map((action) => (
                <div key={action.id} className="action-card">
                  <div className={`action-card-header ${action.status}`}>
                    <span className="action-status-icon">
                      {action.status === "pending" ? "\u23F3" : action.status === "approved" ? "\u2705" : action.status === "executing" ? "\u2699\uFE0F" : action.status === "completed" ? "\u2705" : "\u274C"}
                    </span>
                    <span className="action-status-text">
                      {action.status === "pending" ? "Awaiting your approval" : action.status === "executing" ? "Executing..." : action.status === "completed" ? "Completed" : action.status === "denied" ? "Denied" : "Approved"}
                    </span>
                  </div>
                  <div className="action-card-body">
                    <div className="action-title">{action.title}</div>
                    <div className="action-desc">{action.description}</div>
                    <ul className="action-steps">
                      {action.steps.map((step, i) => (
                        <li key={i}>
                          <span className={`step-icon ${step.status}`}>
                            {step.status === "done" ? "\u2713" : step.status === "running" ? "\u25CF" : "\u25CB"}
                          </span>
                          {step.label}
                        </li>
                      ))}
                    </ul>
                    {(action.status === "executing" || action.status === "completed") && action.logs.length > 0 && (
                      <div className="execution-log">
                        {action.logs.map((log, i) => (
                          <div key={i} className="execution-log-line">
                            <span className="log-prefix">&gt;</span>
                            <span className={log.includes("[done]") ? "log-success" : log.includes("[info]") ? "log-info" : log.includes("[running]") ? "log-warn" : log.includes("[denied]") || log.includes("[error]") ? "log-error" : ""}>
                              {log}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {action.status === "pending" && (
                    <div className="action-card-footer">
                      <button className="btn-approve" onClick={() => approveAction(action.id)}>{"\u2705"} Approve & Execute</button>
                      <button className="btn-deny" onClick={() => denyAction(action.id)}>{"\u274C"} Deny</button>
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="chat-input-area">
              <form className="input-wrapper" onSubmit={handleSubmit}>
                <textarea className="chat-input" placeholder={ui.placeholder} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} rows={1} />
                <button type="submit" className="send-btn" disabled={!input.trim()}>{"\u{2191}"}</button>
              </form>
              <div className="input-hints">
                {["\u0393\u03B5\u03B9\u03B1 \u03C3\u03BF\u03C5", "Hello!", "Bonjour!", "\u00A1Hola!", "Ciao!", "Merhaba!"].map((chip) => (
                  <span key={chip} className="hint-chip" onClick={() => sendMessage(chip)}>{chip}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* BRAIN */}
        {view === "brain" && (
          <div className="panel-view">
            <div className="panel-header">
              <h1 className="panel-title">Areti Brain</h1>
              <p className="panel-desc">Real-time monitoring of Areti's reasoning, activities, and logic.</p>
            </div>
            <div className="brain-grid">
              <div className="brain-card">
                <div className="brain-card-header"><div className="brain-icon cyan">{"\u{1F9E0}"}</div><div className="brain-card-title">Reasoning Power</div></div>
                <div className="brain-card-value">87%</div>
                <div className="brain-card-desc">Logical capacity - reasoning, analysis, decisions</div>
              </div>
              <div className="brain-card">
                <div className="brain-card-header"><div className="brain-icon green">{"\u{1F4DA}"}</div><div className="brain-card-title">Knowledge</div></div>
                <div className="brain-card-value">{knowledge.length + 1247}</div>
                <div className="brain-card-desc">Indexed knowledge from all sources</div>
              </div>
              <div className="brain-card">
                <div className="brain-card-header"><div className="brain-icon orange">{"\u{1F30D}"}</div><div className="brain-card-title">Languages</div></div>
                <div className="brain-card-value">12+</div>
                <div className="brain-card-desc">Languages understood and spoken</div>
              </div>
              <div className="brain-card">
                <div className="brain-card-header"><div className="brain-icon purple">{"\u{1F4AC}"}</div><div className="brain-card-title">Conversations</div></div>
                <div className="brain-card-value">{messages.length}</div>
                <div className="brain-card-desc">Messages in this session</div>
              </div>
            </div>
            <div className="thought-log">
              <div className="thought-log-header">{"\u{1F4AD}"} Thought Log (Real-time)</div>
              <div className="thought-log-body">
                {thoughts.map((t) => (
                  <div key={t.id} className="thought-entry">
                    <span className="thought-time">{t.time}</span>
                    <span className={`thought-type ${t.type}`}>{t.type}</span>
                    <span className="thought-text">{t.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LANGUAGES */}
        {view === "languages" && (
          <div className="panel-view">
            <div className="panel-header">
              <h1 className="panel-title">{"\u{1F30D}"} Languages</h1>
              <p className="panel-desc">I Areti katalavainei kai milaei se 12+ glwsses. Auto-detection enabled.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
              {LANG_LIST.filter(l => l.code !== "auto").map((l) => (
                <div key={l.code} className="brain-card" style={{ cursor: "pointer", borderColor: preferredLang === l.code ? "var(--blue)" : undefined }} onClick={() => { setPreferredLang(l.code); setView("chat"); }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span style={{ fontSize: "1.5rem" }}>{l.flag}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{l.name}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>{l.code.toUpperCase()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TRAINING */}
        {view === "training" && (
          <div className="panel-view">
            <div className="panel-header">
              <h1 className="panel-title">Training Center</h1>
              <p className="panel-desc">Areti continuously learns from conversations, the internet, and your data.</p>
            </div>
            <div className="training-grid">
              {TRAINING_MODULES.map((mod) => (
                <div key={mod.title} className="training-card">
                  <div className="training-card-header">
                    <div className="training-icon">{mod.icon}</div>
                    <div className="training-card-title">{mod.title}</div>
                  </div>
                  <div className="training-card-desc">{mod.desc}</div>
                  <div className="training-progress">
                    <div className="progress-header"><span>Progress</span><span>{mod.progress}%</span></div>
                    <div className="progress-bar"><div className={`progress-fill ${mod.color}`} style={{ width: `${mod.progress}%` }} /></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="panel-header"><h2 className="panel-title" style={{ fontSize: "1rem" }}>Active Training Queue</h2></div>
            <div className="task-list">
              <div className="task-item"><div className="task-status running" /><div className="task-info"><div className="task-name">Multilingual pattern learning...</div><div className="task-time">Active - 12 languages</div></div></div>
              <div className="task-item"><div className="task-status running" /><div className="task-info"><div className="task-name">Indexing React patterns from web</div><div className="task-time">Est. 8 min remaining</div></div></div>
              <div className="task-item"><div className="task-status queued" /><div className="task-info"><div className="task-name">Parse Python stdlib documentation</div><div className="task-time">Queued</div></div></div>
            </div>
          </div>
        )}

        {/* KNOWLEDGE */}
        {view === "knowledge" && (
          <div className="panel-view">
            <div className="panel-header">
              <h1 className="panel-title">Knowledge Base</h1>
              <p className="panel-desc">All of Areti's training data. Add new material or let it learn autonomously.</p>
            </div>
            <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem" }}>
              <button className="btn btn-primary">{"\u{2795}"} Add Knowledge Source</button>
              <button className="btn btn-cyan" onClick={() => {
                setKnowledge((prev) => [...prev, { type: "learned", name: `Auto-learned chunk #${prev.length + 1}`, meta: `Generated ${now()} from web scrape` }]);
              }}>{"\u{1F916}"} Auto-Learn from Web</button>
            </div>
            <div className="knowledge-section">
              <div className="sidebar-label" style={{ marginBottom: "0.75rem" }}>Indexed Sources ({knowledge.length})</div>
              <div className="knowledge-list">
                {knowledge.map((item) => (
                  <div key={item.name} className="knowledge-item">
                    <div className="knowledge-info">
                      <span className={`knowledge-type ${item.type}`}>{item.type}</span>
                      <span className="knowledge-name">{item.name}</span>
                    </div>
                    <span className="knowledge-meta">{item.meta}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SYSTEM */}
        {view === "system" && (
          <div className="panel-view">
            <div className="panel-header">
              <h1 className="panel-title">System Monitor</h1>
              <p className="panel-desc">Real-time system monitoring and autonomous optimization.</p>
            </div>
            <div style={{ marginBottom: "1.25rem" }}>
              <div className="toggle-row"><div><div className="toggle-label">Autonomous Optimization</div><div className="toggle-sublabel">Areti optimizes your PC without being asked</div></div><div className={`toggle-switch ${autonomousMode ? "on" : ""}`} onClick={() => setAutonomousMode(!autonomousMode)} /></div>
              <div className="toggle-row"><div><div className="toggle-label">Background Learning</div><div className="toggle-sublabel">Learns new data when idle</div></div><div className="toggle-switch on" /></div>
              <div className="toggle-row"><div><div className="toggle-label">Web Search Integration</div><div className="toggle-sublabel">Searches the web when local knowledge is insufficient</div></div><div className="toggle-switch on" /></div>
              <div className="toggle-row"><div><div className="toggle-label">Multilingual Auto-Detect</div><div className="toggle-sublabel">Automatically detects and responds in the user's language</div></div><div className="toggle-switch on" /></div>
            </div>
            <div className="system-grid">
              <div className="system-card"><div className="system-card-label">CPU Usage</div><div className="system-card-value">23%</div><div className="system-card-sub">8 cores @ 3.6 GHz</div></div>
              <div className="system-card"><div className="system-card-label">Memory</div><div className="system-card-value">6.8 GB</div><div className="system-card-sub">of 20 GB (34%)</div></div>
              <div className="system-card"><div className="system-card-label">Disk I/O</div><div className="system-card-value">42 MB/s</div><div className="system-card-sub">SSD - 180 GB free</div></div>
              <div className="system-card"><div className="system-card-label">Network</div><div className="system-card-value">12 ms</div><div className="system-card-sub">Latency to API</div></div>
            </div>
            <div className="panel-header"><h2 className="panel-title" style={{ fontSize: "1rem" }}>Optimization Tasks</h2></div>
            <div className="task-list">
              {SYSTEM_TASKS.map((task) => (
                <div key={task.name} className="task-item"><div className={`task-status ${task.status}`} /><div className="task-info"><div className="task-name">{task.name}</div><div className="task-time">{task.time}</div></div></div>
              ))}
            </div>
          </div>
        )}

        {/* DOWNLOAD */}
        {view === "download" && (
          <div className="panel-view">
            <div className="panel-header">
              <h1 className="panel-title">Download Areti</h1>
              <p className="panel-desc">Install Areti on any platform. Follow the instructions for each.</p>
            </div>
            <div className="download-grid">
              <div className="download-card">
                <div className="download-card-icon windows">{"\u{1F5A5}\u{FE0F}"}</div>
                <div className="download-card-title">Windows (EXE)</div>
                <div className="download-card-desc">Desktop app for Windows 10/11. Runs as a native app with Electron.</div>
                <ol className="download-steps">
                  <li data-step="1">Download the project as ZIP from GitHub</li>
                  <li data-step="2">Extract the ZIP to a folder</li>
                  <li data-step="3">Open terminal and run:</li>
                </ol>
                <div className="download-cmd"><span className="comment"># Install dependencies</span>{'\n'}<span className="cmd">npm install</span>{'\n'}{'\n'}<span className="comment"># Install Electron</span>{'\n'}<span className="cmd">npm install electron electron-builder --save-dev</span>{'\n'}{'\n'}<span className="comment"># Build EXE</span>{'\n'}<span className="cmd">npx electron-builder --win</span></div>
                <div className="download-status">The EXE will be created in <code>dist/</code></div>
              </div>
              <div className="download-card">
                <div className="download-card-icon android">{"\u{1F4F1}"}</div>
                <div className="download-card-title">Android (APK)</div>
                <div className="download-card-desc">Mobile app for Android phones and tablets with Capacitor.</div>
                <ol className="download-steps">
                  <li data-step="1">Download the project as ZIP</li>
                  <li data-step="2">Install Capacitor and Android Studio</li>
                  <li data-step="3">Run these commands:</li>
                </ol>
                <div className="download-cmd"><span className="comment"># Build the web app</span>{'\n'}<span className="cmd">npm run build</span>{'\n'}{'\n'}<span className="comment"># Install Capacitor</span>{'\n'}<span className="cmd">npm install @capacitor/core @capacitor/cli</span>{'\n'}<span className="cmd">npx cap init Areti com.areti.app</span>{'\n'}{'\n'}<span className="comment"># Add Android platform</span>{'\n'}<span className="cmd">npx cap add android</span>{'\n'}<span className="cmd">npx cap sync</span>{'\n'}{'\n'}<span className="comment"># Open in Android Studio & build APK</span>{'\n'}<span className="cmd">npx cap open android</span></div>
                <div className="download-status">In Android Studio: Build {'\u{2192}'} Build APK</div>
              </div>
              <div className="download-card">
                <div className="download-card-icon ios">{"\u{1F34E}"}</div>
                <div className="download-card-title">iOS (IPA)</div>
                <div className="download-card-desc">iPhone/iPad app with Capacitor. Requires Mac with Xcode.</div>
                <ol className="download-steps">
                  <li data-step="1">Download project on a Mac</li>
                  <li data-step="2">Install Xcode from App Store</li>
                  <li data-step="3">Run these commands:</li>
                </ol>
                <div className="download-cmd"><span className="comment"># Build web app</span>{'\n'}<span className="cmd">npm run build</span>{'\n'}{'\n'}<span className="comment"># Add iOS platform</span>{'\n'}<span className="cmd">npx cap add ios</span>{'\n'}<span className="cmd">npx cap sync</span>{'\n'}{'\n'}<span className="comment"># Open in Xcode</span>{'\n'}<span className="cmd">npx cap open ios</span></div>
                <div className="download-status">In Xcode: Product {'\u{2192}'} Archive {'\u{2192}'} Export IPA</div>
              </div>
              <div className="download-card">
                <div className="download-card-icon web">{"\u{1F310}"}</div>
                <div className="download-card-title">Web (PWA)</div>
                <div className="download-card-desc">Runs in browser and can be installed as an app.</div>
                <ol className="download-steps">
                  <li data-step="1">Download the project</li>
                  <li data-step="2">Build and deploy to web server</li>
                  <li data-step="3">Run:</li>
                </ol>
                <div className="download-cmd"><span className="comment"># Install dependencies & build</span>{'\n'}<span className="cmd">npm install</span>{'\n'}<span className="cmd">npm run build</span>{'\n'}{'\n'}<span className="comment"># Serve locally (or deploy dist/ to Vercel/Netlify)</span>{'\n'}<span className="cmd">npx serve dist</span></div>
                <div className="download-status">In browser: Menu {'\u{2192}'} Install App</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
