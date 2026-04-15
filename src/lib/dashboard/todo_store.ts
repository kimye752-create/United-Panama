export type TodoBadge = "자동" | "예정" | "사용자";

export interface TodoItem {
  id: string;
  label: string;
  badge: TodoBadge;
  checked: boolean;
  isDefault: boolean;
  createdAt: string;
}

const KEY_PREFIX = "pa_upharma_todos_v1_";

const DEFAULT_TODOS: TodoItem[] = [
  {
    id: "default-p1",
    label: "1공정 · 시장조사 분석",
    badge: "자동",
    checked: false,
    isDefault: true,
    createdAt: "",
  },
  {
    id: "default-rep",
    label: "보고서 생성",
    badge: "자동",
    checked: false,
    isDefault: true,
    createdAt: "",
  },
  {
    id: "default-p2",
    label: "2공정 · 수출전략 수립",
    badge: "예정",
    checked: false,
    isDefault: true,
    createdAt: "",
  },
  {
    id: "default-p3",
    label: "3공정 · 바이어 발굴",
    badge: "예정",
    checked: false,
    isDefault: true,
    createdAt: "",
  },
];

export function loadTodos(countryCode: string): TodoItem[] {
  if (typeof window === "undefined") {
    return DEFAULT_TODOS;
  }
  try {
    const raw = localStorage.getItem(KEY_PREFIX + countryCode);
    if (raw === null) {
      return DEFAULT_TODOS;
    }
    const parsed = JSON.parse(raw) as TodoItem[];
    const hasAllDefaults = DEFAULT_TODOS.every((d) => parsed.some((p) => p.id === d.id));
    if (hasAllDefaults) {
      return parsed;
    }
    return [...DEFAULT_TODOS, ...parsed.filter((p) => !p.isDefault)];
  } catch {
    return DEFAULT_TODOS;
  }
}

export function saveTodos(countryCode: string, todos: TodoItem[]): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(KEY_PREFIX + countryCode, JSON.stringify(todos));
}

export function addCustomTodo(countryCode: string, label: string): TodoItem[] {
  const existing = loadTodos(countryCode);
  const newItem: TodoItem = {
    id: `custom-${Date.now()}`,
    label,
    badge: "사용자",
    checked: false,
    isDefault: false,
    createdAt: new Date().toISOString(),
  };
  const updated = [...existing, newItem];
  saveTodos(countryCode, updated);
  return updated;
}
