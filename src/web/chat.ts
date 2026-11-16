import type { RoleId } from "../types.ts";

export interface ChatMessage {
  readonly lane: RoleId;
  readonly author: string;
  readonly text: string;
  readonly kind: "user" | "system" | "auto";
}

export interface ChatStep {
  readonly nodeId: string;
  readonly title: string;
  readonly role: RoleId;
  readonly icon: string;
  readonly system?: string;
  readonly messages: readonly ChatMessage[];
  readonly card?: "sla" | "contractor";
}

export interface ChatState {
  readonly step: number;
  readonly roleOverride: RoleId | null;
}

/** Демо-заявка модуля «Переписка по ролям». */
export const CHAT_INCIDENT_ID = "З-015";
export const CHAT_INCIDENT_TITLE = "Разбита дверь подъезда";
export const CHAT_INCIDENT_ADDRESS = "ул. Ленина, 10";
export const CHAT_CONTRACTOR = "УК «Дом-Сервис»";

const resident = (text: string): ChatMessage => ({ lane: "resident", author: "Житель", text, kind: "user" });
const deputy = (text: string): ChatMessage => ({ lane: "deputy", author: "Депутат-диспетчер", text, kind: "user" });
const contractor = (text: string): ChatMessage => ({ lane: "contractor", author: "Подрядчик", text, kind: "auto" });

/** Маршрут демо-сценария: U1 → U6 → U7 → U19, роль беседы меняется по узлу. */
export const CHAT_SCENARIO: readonly ChatStep[] = [
  {
    nodeId: "U1",
    title: "Подача обращения",
    role: "resident",
    icon: "📝",
    messages: [resident("Во дворе разбита дверь подъезда, не вывозят крупногабарит.")],
  },
  {
    nodeId: "U6",
    title: "Назначение подрядчика",
    role: "deputy",
    icon: "🎛",
    system: "Заявка З-015 передана в работу. Требуется назначить подрядчика.",
    messages: [deputy("Кто может выехать на З-015?")],
  },
  {
    nodeId: "U7",
    title: "Передача подрядчику",
    role: "contractor",
    icon: "🚗",
    card: "sla",
    system: "Заявка ушла подрядчику: нужно подтверждение выезда.",
    messages: [
      deputy("Подтвердите выезд на ул. Ленина, 10."),
      contractor("Принято. Бригада выехала, ожидаемое время — 40 минут."),
    ],
  },
  {
    nodeId: "U19",
    title: "Ответ жителю",
    role: "resident",
    icon: "✅",
    system: "По вашей заявке З-015 выполнены работы. Подтвердите, пожалуйста, результат.",
    messages: [resident("Спасибо, сейчас посмотрю.")],
  },
];

export const stepCount = (): number => CHAT_SCENARIO.length;
export const chatStart = (): ChatState => ({ step: 0, roleOverride: null });
export const clampStep = (step: number): number => Math.max(0, Math.min(CHAT_SCENARIO.length - 1, step));
export const nextStep = (state: ChatState): ChatState => ({ ...state, step: clampStep(state.step + 1) });
export const prevStep = (state: ChatState): ChatState => ({ ...state, step: clampStep(state.step - 1) });
export const setStep = (state: ChatState, step: number): ChatState => ({ ...state, step: clampStep(step) });
export const setRoleOverride = (state: ChatState, role: RoleId | null): ChatState => ({ ...state, roleOverride: role });
export const currentStep = (scenario: readonly ChatStep[], state: ChatState): ChatStep =>
  scenario[clampStep(state.step)] as ChatStep;
export const activeRole = (scenario: readonly ChatStep[], state: ChatState): RoleId =>
  state.roleOverride ?? currentStep(scenario, state).role;

/** Все сообщения от первого шага до текущего, включая системные. */
export const visibleMessages = (scenario: readonly ChatStep[], state: ChatState): readonly ChatMessage[] => {
  const out: ChatMessage[] = [];
  for (let index = 0; index <= clampStep(state.step); index += 1) {
    const step = scenario[index] as ChatStep;
    if (step.system) out.push({ lane: "system", author: "Система", text: step.system, kind: "system" });
    out.push(...step.messages);
  }
  return out;
};
