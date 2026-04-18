"use client";

import { useEffect, useState } from "react";

import { Phase1Section } from "./Phase1Section";
import { Phase2Section } from "./Phase2Section";
import { Phase3Section } from "./Phase3Section";

const PHASE1_DONE_KEY = "pa_phase1_done_v1";
const PHASE2_DONE_KEY = "pa_phase2_done_v1";

export function MainPreviewSections() {
  const [phase1Done, setPhase1Done] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.sessionStorage.getItem(PHASE1_DONE_KEY) === "true";
  });
  const [phase2Done, setPhase2Done] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.sessionStorage.getItem(PHASE2_DONE_KEY) === "true";
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.sessionStorage.setItem(PHASE1_DONE_KEY, String(phase1Done));
  }, [phase1Done]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.sessionStorage.setItem(PHASE2_DONE_KEY, String(phase2Done));
  }, [phase2Done]);

  return (
    <section className="space-y-3.5">
      <Phase1Section
        onCompleted={() => {
          setPhase1Done(true);
        }}
      />
      <Phase2Section
        onCompleted={() => {
          setPhase2Done(true);
        }}
      />
      <Phase3Section isActive={phase1Done && phase2Done} />
    </section>
  );
}

