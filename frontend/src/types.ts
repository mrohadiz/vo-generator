/** Tipe data yang dipakai bersama antara API Flask dan UI React. */

export type EngineId = 'supertonic' | 'pocket_tts' | 'gemini_tts' | 'gemini_gw' | 'drama3';
export type Mode = 'single' | 'scene' | 'theater';

export interface Voice {
  id: string;
  name: string;
  gender?: 'male' | 'female' | string;
  filename?: string;
}

export interface Engine {
  id: EngineId;
  name: string;
  description: string;
  supports_preview: boolean;
  supports_speed: boolean;
  supports_style?: boolean;
  default_style?: string;
  voices: Voice[];
}

export interface EngineState {
  ready: boolean;
  loading: boolean;
  error: string | null;
}

export interface StatusResponse {
  engines: Record<string, EngineState>;
}

export interface Analysis {
  raw_text?: string;
  cleaned_text: string;
  word_count: number;
  char_count: number;
  estimated_duration: string;
  estimated_seconds: number;
  segment_count: number;
  segments: string[];
  warnings: string[];
  english_words: string[];
  title?: string;
  extracted?: boolean;
}

export interface SceneDraft {
  index: number;
  raw_text: string;
  cleaned_text: string;
  word_count: number;
  estimated_duration: string;
  english_words: string[];
  warnings: string[];
}

export interface AnnotateInfo {
  mode: 'ai' | 'rules';
  model?: string | null;
  note: string;
}

export interface AnnotateResult {
  text: string;
  segments: string[];
  info: AnnotateInfo;
}

export interface Character {
  name: string;
  gender: string;
  age: string;
  voice_description?: string;
  provider: 'supertonic' | 'drama3' | 'gemini_tts' | 'gemini_gw';
  voice: string;
  pitch: number;
  speed: number;
  gemini_voice?: string;
}

export interface TheaterLine {
  speaker: string;
  text: string;
  emotion: string;
  pause: number;
}

export interface TheaterScene {
  title: string;
  lines: TheaterLine[];
}

export interface DirectResult {
  ok: boolean;
  title: string;
  characters: Character[];
  scenes: TheaterScene[];
  info: AnnotateInfo;
  drama3_available: boolean;
  gemini_available: boolean;
  gemini_gw_available: boolean;
}

export interface VoiceOptionEntry {
  engine: string;
  engine_name: string;
  voice: string;
  voice_name: string;
  reason: string;
}

export interface VoiceRecommendation extends VoiceOptionEntry {
  source: 'ai' | 'rules';
  model?: string | null;
  note?: string;
  genre: string;
  tone: string;
  speed: number;
  style: string;
  emotions: string[];
  mode_hint: 'single' | 'scene' | 'theater';
  alternatives: VoiceOptionEntry[];
}

export interface SynthesizeResult {
  ok: boolean;
  folder: string;
  engine: string;
  filename: string;
  audio_url: string;
  voice: string;
  duration: string;
  duration_sec: number;
  size_bytes: number;
  process_time_sec: number;
  warnings: string[];
}

export interface JobResult extends SynthesizeResult {}

export interface QueueJob {
  id: string;
  status: 'queued' | 'running' | 'done' | 'error' | 'cancelled';
  type: string;
  created_at: number;
  started_at: number | null;
  finished_at: number | null;
  message: string;
  title: string;
  engine: string;
  result: JobResult | null;
  error: string | null;
}

export interface QueueList {
  ok: boolean;
  items: QueueJob[];
  queued: number;
}

export interface HistoryFile {
  filename: string;
  url: string;
  size: number;
  mtime: number;
  time: string;
  engine: string;
  voice: string;
}

export interface HistoryFolder {
  folder: string;
  count: number;
  files: Array<{ name: string; url: string }>;
  mtime: number;
  time: string;
}

export interface HistoryResponse {
  files: HistoryFile[];
  folders: HistoryFolder[];
}
