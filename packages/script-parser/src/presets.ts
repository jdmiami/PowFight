import type { ParseOptions } from './types.ts';

/**
 * Alias map for the Project Gutenberg First Folio text of Romeo and Juliet (#1112).
 * Folio spelling uses I for J and u/v swaps, so "Iul." is Juliet.
 */
export const ROMEO_AND_JULIET: ParseOptions = {
  title: 'Romeo and Juliet',
  author: 'William Shakespeare',
  source: 'Project Gutenberg #1112 (First Folio text)',
  license: 'Public domain (US). Gutenberg boilerplate removed.',
  aliases: {
    Romeo: ['Rom', 'Ro', 'Rome', 'Romeo'],
    Juliet: ['Iul', 'Iuli', 'Iu', 'Iuliet', 'Iule', 'Jul', 'Juliet'],
    Nurse: ['Nur', 'Nurse', 'Nurs'],
    Benvolio: ['Ben', 'Benuolio', 'Benvolio'],
    Mercutio: ['Mer', 'Merc', 'Mercu', 'Mercutio'],
    'Friar Lawrence': ['Fri', 'Law', 'Friar', 'Frier', 'Lawrence'],
    'Friar John': ['Iohn', 'John'],
    'Lord Capulet': ['Cap', 'Capu', 'Fa', 'Fat', 'Father', 'Capulet'],
    'Lady Capulet': ['Wife', 'Lad', 'Lady', 'La', 'Old La', 'Cap. Wi', 'Mo', 'Mother'],
    'Lord Montague': ['Moun', 'Mount', 'Mountague', 'Montague'],
    Tybalt: ['Tib', 'Tyb', 'Tybalt'],
    Paris: ['Par', 'Pa', 'Pari', 'Paris'],
    Prince: ['Prin', 'Pri', 'Prince'],
    Peter: ['Pet', 'Peter'],
    Sampson: ['Samp', 'Sam', 'Sampson'],
    Gregory: ['Greg', 'Gre', 'Gr', 'Gregory'],
    Abram: ['Abra', 'Abram'],
    Balthasar: ['Man', 'Bal', 'Balthasar'],
    Servant: ['Ser', 'Seru', 'Servant', 'Seruant'],
    Apothecary: ['App', 'Apo', 'Apothecary'],
    Musician: ['Mu', 'Mus', 'Musician', 'Fid', 'Minst'],
    Watchman: ['Watch', 'Wat', 'Con', 'Offi', 'Officer', 'Chief Watch'],
    Citizen: ['Citi', 'Cit', 'Citizens'],
    Page: ['Page', 'Boy'],
    Fellow: ['Fel'],
    Chorus: ['Chorus'],
  },
  // Lines from the editor's preface quoting Hamlet.
  ignoreCues: ['Barnardo', 'Fran', 'Bar', 'Hora'],
};
