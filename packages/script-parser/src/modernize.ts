/**
 * Light-touch modernizer for Early Modern English spelling (First Folio / Quarto texts).
 * Not a translation: it only normalizes the printers' conventions (u/v, i/j, long-s leftovers,
 * terminal -e, doubled consonants) so a first-time actor can read a line aloud without stumbling.
 * Deterministic; safe to run repeatedly. Proper nouns are handled by the same rules (Iuliet → Juliet).
 */

const WORDS: Record<string, string> = {
  // function words the rules below would miss or mangle
  'ile': "I'll", 'ide': "I'd", 'wee': 'we', 'bee': 'be', 'hee': 'he', 'shee': 'she', 'mee': 'me', 'doe': 'do', 'goe': 'go',
  'soe': 'so', 'noe': 'no', 'toe': 'to', 'ye': 'you', 'thee': 'thee', 'then': 'then', 'thorough': 'through', 'yong': 'young',
  'onely': 'only', 'oft': 'oft', 'bin': 'been', 'beene': 'been', 'seene': 'seen', 'heere': 'here', 'there': 'there', 'theyr': 'their',
  'sayes': 'says', 'saies': 'says', 'sayd': 'said', 'saide': 'said', 'maister': 'master', 'honor': 'honor', 'ayre': 'air', 'eyther': 'either',
  'againe': 'again', 'blisse': 'bliss', 'kisse': 'kiss', 'lesse': 'less', 'glasse': 'glass', 'passe': 'pass', 'masse': 'mass',
  'sweete': 'sweet', 'heare': 'hear', 'deare': 'dear', 'feare': 'fear', 'neere': 'near', 'yeare': 'year', 'teares': 'tears',
  'coales': 'coals', 'colliars': 'colliers', 'choller': 'choler', 'collar': 'collar', 'fellowes': 'fellows', 'houre': 'hour', 'halfe': 'half',
  'selfe': 'self', 'wolfe': 'wolf', 'griefe': 'grief', 'thiefe': 'thief', 'knowes': 'knows', 'showes': 'shows', 'growes': 'grows',
  'soule': 'soul', 'foule': 'foul', 'faire': 'fair', 'paire': 'pair', 'warre': 'war', 'starre': 'star', 'farre': 'far',
  'citie': 'city', 'pittie': 'pity', 'beautie': 'beauty', 'dutie': 'duty', 'merrie': 'merry', 'verie': 'very', 'anie': 'any', 'manie': 'many',
  'mountague': 'Montague', 'mountagues': 'Montagues', 'capels': "Capulets'", 'frier': 'friar', 'lanthorne': 'lantern', 'sculles': 'skulls',
  'cloudes': 'clouds', 'bottome': 'bottom', 'weeke': 'week', 'poore': 'poor', 'thred': 'thread', 'busines': 'business', 'behoouefull': 'behoveful', 'behoovefull': 'behoveful', 'morrow': 'morrow', 'sodaine': 'sudden', 'suddaine': 'sudden', 'wantons': "wanton's", 'gyues': 'gyves', 'gyves': 'gyves', 'cul\'d': "cull'd", 'littl': 'little', 'starres': 'stars', 'warres': 'wars', 'hower': 'hour', 'howre': 'hour', 'ayme': 'aim', 'eies': 'eyes', 'eie': 'eye', 'dye': 'die', 'lye': 'lie', 'lyes': 'lies', 'ynough': 'enough', 'inough': 'enough', 'vertue': 'virtue', 'perswade': 'persuade', 'sommer': 'summer', 'moneth': 'month', 'murther': 'murder', 'murtherer': 'murderer', 'yron': 'iron', 'tong': 'tongue', 'talke': 'talk', 'walke': 'walk', 'speake': 'speak', 'thinke': 'think', 'drinke': 'drink', 'worke': 'work', 'looke': 'look', 'tooke': 'took', 'booke': 'book', 'maides': 'maids', 'shewes': 'shows', 'shew': 'show', 'sence': 'sense', 'civill': 'civil', 'evill': 'evil', 'quarrell': 'quarrel', 'qvarrell': 'quarrel', 'wee\'l': "we'll", 'runst': "runn'st", 'vaine': 'vain', 'vainely': 'vainly', 'ith': "i' th'", 'oth': "o' th'",
};

function applyRules(w: string): string {
  let s = w;
  // u/v: printers used v initially and u medially regardless of sound.
  s = s.replace(/^v(?=[nmpstrlbcdfg])/i, (m) => (m === 'V' ? 'U' : 'u'));           // vp → up, vnto → unto, vs → us
  s = s.replace(/^vs$/i, (m) => (m[0] === 'V' ? 'Us' : 'us'));
  s = s.replace(/([aeiouy])u(?=[aeiouy])/gi, '$1v');                                  // haue → have, loue → love, euer → ever
  s = s.replace(/([aeiou])u(?=')/gi, '$1v');                                           // mou'd → mov'd
  // i/j: initial I before a vowel is J (Iuliet, Ioy, Iealous); medial "iu"/"ie" after vowel is j (maiesty)
  s = s.replace(/^I(?=[aeou])/, 'J').replace(/^i(?=[aeou])/, 'j');
  s = s.replace(/([aeiou])i(?=[aeou][a-z])/g, '$1j');
  s = s.replace(/cke$/i, 'ck').replace(/eake$/i, 'eak').replace(/eene$/i, 'een');       // necke, weake, betweene
  // doubled consonant + e endings: dogge → dog, sonne → son, cutte → cut
  s = s.replace(/([bcdfgklmnprstz])\1e$/i, '$1');
  // -ie endings of adjectives/nouns → -y (merrie → merry) handled in WORDS; generic -lie → -ly
  s = s.replace(/lie$/i, 'ly');
  // terminal -e after a short-vowel consonant cluster: "worde" → "word", "stande" → "stand" (keep -ke/-ce/-ge/-ve/-se/-the)
  s = s.replace(/([^aeiouy][rnmd])e$/i, (m, g) => (/^(the|ore|ire|are|ure|ere)$/i.test(m) ? m : g));   // worde → word (never -le: little, gentle)
  // -ll → -l in a few endings ("vntill" → "until") and "shalbe" → "shall be"
  s = s.replace(/till$/i, 'til').replace(/^shalbe$/i, 'shall be');
  return s;
}

export function modernizeWord(word: string): string {
  const m = /^([^A-Za-z]*)([A-Za-z']+)([^A-Za-z]*)$/.exec(word);
  if (!m) return word;
  const [, pre, core, post] = m;
  const lower = core.toLowerCase();
  let out: string;
  if (WORDS[lower]) {
    out = WORDS[lower];
    if (core[0] === core[0].toUpperCase() && out[0] !== out[0].toUpperCase()) out = out[0].toUpperCase() + out.slice(1);
  } else {
    out = applyRules(core);
  }
  return pre + out + post;
}

/** Modernize a passage, preserving line breaks and punctuation. */
export function modernize(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/^(\s*)I,(?=\s)/, '$1Ay,'))      // Folio "I," = "Ay,"
    .join('\n')
    .split(/(\s+)/)
    .map((tok) => (/\s/.test(tok) ? tok : modernizeWord(tok)))
    .join('');
}

/** Heuristic: does this script look like it uses Early Modern spelling? */
export function looksEarlyModern(text: string): boolean {
  const sample = text.slice(0, 20000).toLowerCase();
  const hits = (sample.match(/\b(haue|loue|vpon|vnto|euer|neuer|giue|heauen|selfe|doe|bee|wee)\b/g) ?? []).length;
  return hits >= 5;
}
