/** Canonical, format-agnostic representation of a play script. */

export type LineType = 'dialogue' | 'direction' | 'heading';

export interface ScriptLine {
  /** Stable id within the script, e.g. "l0042". */
  id: string;
  /** 0-based position in the whole script. */
  index: number;
  type: LineType;
  /** Present for dialogue lines. References ScriptCharacter.id. */
  characterId?: string;
  /** The spoken text (dialogue) or the direction/heading text. Newlines preserve verse breaks. */
  text: string;
  /** 0-based index of the scene this line belongs to. */
  sceneIndex: number;
}

export interface ScriptCharacter {
  /** Slug id, e.g. "romeo". */
  id: string;
  /** Display name, e.g. "Romeo". */
  name: string;
  /** Raw speaker cues that map to this character, e.g. ["Rom", "Ro", "Romeo"]. */
  aliases: string[];
  lineCount: number;
  wordCount: number;
}

export interface ScriptScene {
  id: string;
  index: number;
  title: string;
  /** Index range [first, last] into ParsedScript.lines. */
  firstLine: number;
  lastLine: number;
}

export interface ParsedScript {
  title: string;
  author?: string;
  /** Where the text came from (e.g. "Project Gutenberg #1112"). */
  source?: string;
  /** Free-text license note. Uploaders must assert rights for non-public-domain works. */
  license?: string;
  format: 'inline-cue' | 'block-cue' | 'fountain' | 'unknown';
  characters: ScriptCharacter[];
  scenes: ScriptScene[];
  lines: ScriptLine[];
  warnings: string[];
}

export interface ParseOptions {
  title?: string;
  author?: string;
  source?: string;
  license?: string;
  /**
   * Map of canonical display name -> raw cues (case-insensitive, trailing period optional).
   * Anything not listed is auto-grouped by prefix heuristics.
   */
  aliases?: Record<string, string[]>;
  /** Cues to drop entirely (e.g. sample lines quoted in an editor's preface). */
  ignoreCues?: string[];
  /** Minimum lines a cue needs to be kept as its own character when no alias is supplied. */
  minLinesForCharacter?: number;
}
