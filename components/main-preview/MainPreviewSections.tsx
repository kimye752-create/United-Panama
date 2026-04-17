"use client";

import { useState } from "react";

import { Phase1Section } from "./Phase1Section";
import { Phase2Section } from "./Phase2Section";
import { Phase3Section } from "./Phase3Section";

export function MainPreviewSections() {
  const [phase1Done, setPhase1Done] = useState(false);
  const [phase2Done, setPhase2Done] = useState(false);

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

