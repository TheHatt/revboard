// src/lib/stopwords.ts
// sehr pragmatische DE-Stopwortliste; gern später erweitern
export const STOPWORDS_DE = new Set<string>([
    "und","oder","der","die","das","den","dem","des","ein","eine","einen","einem","einer",
    "ich","du","er","sie","es","wir","ihr","sie",
    "ist","sind","war","waren","sein","bin","bist","seid",
    "in","im","ins","aus","auf","an","am","bei","mit","ohne","für","von","vom","zur","zum","zu",
    "dass","wie","so","auch","nur","noch","schon","sehr","mehr","weniger","mal","immer","nie",
    "hier","dort","da","dann","doch","wohl","eben","etwa","etwas","kein","keine","keinen",
    "über","unter","zwischen","gegen","nach","vor","hinter","neben",
    "was","wer","wo","wann","warum","wieso","weshalb",
    "haben","hat","habe","hatte","hätten","machen","macht","gemacht",
    "weil","aber","also","wenn","falls","sobald","trotzdem",
  ]);
  
  // einfache Normalisierung (Umlaute/Diakritika) → "ä" => "ae", "ö" => "oe", "ü" => "ue", "ß" => "ss"
  export function normalizeToken(raw: string): string {
    const lower = raw.toLowerCase();
    return lower
      .normalize("NFD").replace(/\p{Diacritic}/gu, "")
      .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
  }
  