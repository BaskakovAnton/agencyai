/** SVG-иллюстрации пустых состояний (C2): без внешних ресурсов, декоративные. */
const wrap = (body: string): string =>
  '<svg class="empty-art" viewBox="0 0 48 48" width="48" height="48" aria-hidden="true" focusable="false">' + body + "</svg>";

const stroke = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';

export const EMPTY_ART: Readonly<Record<string, string>> = {
  search: wrap('<circle cx="21" cy="21" r="11" ' + stroke + '/><path d="M29 29l9 9" ' + stroke + '/>'),
  "no-data": wrap('<rect x="9" y="12" width="30" height="24" rx="3" ' + stroke + '/><path d="M9 20h30M15 28h8" ' + stroke + '/>'),
  department: wrap('<path d="M8 38h32M13 38V16l11-7 11 7v22" ' + stroke + '/><path d="M20 38v-8h8v8" ' + stroke + '/>'),
  unassigned: wrap('<circle cx="24" cy="19" r="7" ' + stroke + '/><path d="M11 39c2-6 7-9 13-9s11 3 13 9" ' + stroke + '/><path d="M33 12l6 6M39 12l-6 6" ' + stroke + '/>'),
  view: wrap('<rect x="8" y="11" width="32" height="26" rx="3" ' + stroke + '/><path d="M8 19h32M18 19v18" ' + stroke + '/>'),
  combination: wrap('<path d="M10 12h12l4 12H14zM26 24h12l-4 12H22z" ' + stroke + '/>'),
  chat: wrap('<path d="M10 13h28v18H22l-8 7v-7h-4z" ' + stroke + '/><path d="M17 22h14" ' + stroke + '/>'),
  attention: wrap('<path d="M24 11l14 24H10z" ' + stroke + '/><path d="M24 20v7M24 31h.01" ' + stroke + '/>'),
  done: wrap('<circle cx="24" cy="24" r="14" ' + stroke + '/><path d="M17 25l5 5 10-11" ' + stroke + '/>'),
  missing: wrap('<circle cx="24" cy="24" r="14" ' + stroke + '/><path d="M24 17v8M24 30h.01" ' + stroke + '/>'),
};

export const artFor = (key: string): string => EMPTY_ART[key] ?? EMPTY_ART["no-data"]!;
