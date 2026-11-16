import type { Incident, Session } from "../types.ts";

/** Ссылка на заявку: 5, З-5, з-5, z-5, Z-005 → З-005. */
export const normalizeRef = (ref: string): string => {
  const s = ref.trim().toUpperCase().replace(/\s+/g, "");
  const m = /^(?:З|Z)?-?0*(\d{1,3})$/.exec(s);
  if (!m) return s;
  return "З-" + String(Number.parseInt(m[1] as string, 10)).padStart(3, "0");
};

/** Поиск заявки по гибкой ссылке: id или порядковый номер. */
export const findIncidentByRef = (session: Session, ref: string): Incident | undefined => {
  const byId = session.incidents.find((i) => i.id === normalizeRef(ref));
  if (byId) return byId;
  const num = Number.parseInt(ref, 10);
  if (Number.isFinite(num) && num >= 1 && num <= session.incidents.length) return session.incidents[num - 1];
  return undefined;
};

/** То же, плюс дружелюбная ошибка. */
export const resolveIncident = (
  session: Session,
  ref: string,
): { readonly ok: true; readonly incident: Incident } | { readonly ok: false; readonly error: string } => {
  const incident = findIncidentByRef(session, ref);
  return incident ? { ok: true, incident } : { ok: false, error: "заявка не найдена: " + ref };
};
