"use client";

import { useEffect, useMemo, useState } from "react";

import { Card } from "../shared/Card";
import {
  addCustomTodo,
  loadTodos,
  saveTodos,
  type TodoItem,
} from "@/src/lib/dashboard/todo_store";

const COUNTRY_CODE = "PA";

export function ProgressChecklistCard() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [lastAddSignature, setLastAddSignature] = useState<string>("");

  useEffect(() => {
    setTodos(loadTodos(COUNTRY_CODE));
  }, []);

  const doneCount = useMemo(() => todos.filter((t) => t.checked).length, [todos]);

  const toggle = (id: string) => {
    const updated = todos.map((todo) =>
      todo.id === id ? { ...todo, checked: !todo.checked } : todo,
    );
    setTodos(updated);
    saveTodos(COUNTRY_CODE, updated);
  };

  const addItem = () => {
    const label = inputValue.trim();
    if (label === "") {
      return;
    }
    const signature = `${label}::${String(Math.floor(Date.now() / 400))}`;
    if (signature === lastAddSignature) {
      return;
    }
    setLastAddSignature(signature);
    setTodos(addCustomTodo(COUNTRY_CODE, label));
    setInputValue("");
  };

  return (
    <Card
      title="단계 진행 체크리스트"
      subtitle={`진행 ${doneCount}/${todos.length}`}
    >
      <div className="space-y-2">
        {todos.map((todo) => (
          <button
            type="button"
            key={todo.id}
            onClick={() => toggle(todo.id)}
            className={`flex w-full cursor-pointer items-center gap-3 rounded-[13px] bg-inner px-3.5 py-3 text-left transition-opacity ${
              todo.checked ? "opacity-50" : ""
            }`}
          >
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full text-xs transition-all ${
                todo.checked ? "bg-green text-white" : "bg-white text-transparent shadow-sh3"
              }`}
            >
              ✓
            </div>
            <span
              className={`flex-1 text-[13px] font-bold ${
                todo.checked ? "text-muted line-through" : "text-navy"
              }`}
            >
              {todo.label}
            </span>
            <span className="rounded-full bg-navy/10 px-2 py-1 text-[10px] font-extrabold text-navy">
              {todo.badge}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing || e.repeat) {
              return;
            }
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder="기타 업무 추가 입력란"
          className="h-10 flex-1 rounded-[10px] bg-inner px-3.5 text-[13px] font-medium text-navy placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-navy/20"
        />
        <button
          type="button"
          onClick={addItem}
          className="h-10 rounded-[10px] bg-navy px-4 text-[12px] font-extrabold text-white transition-colors hover:bg-navy2"
        >
          + 추가
        </button>
      </div>
    </Card>
  );
}
