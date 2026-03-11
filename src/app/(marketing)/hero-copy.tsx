"use client";

import { useEffect, useState } from "react";

type HeroVariant = {
  headline: string;
  highlight: string;
  description: string;
};

const HERO_VARIANTS: HeroVariant[] = [
  {
    headline: "From service request",
    highlight: "to proof of work.",
    description:
      "DispatchToGo helps hospitality and property operators triage issues, dispatch qualified vendors, track progress, and close every job with clear documentation.",
  },
  {
    headline: "Dispatch faster.",
    highlight: "Verify everything.",
    description:
      "Coordinate vendors, monitor work in real time, and finish every job with photos, timestamps, and records your team can trust.",
  },
  {
    headline: "Replace phone calls",
    highlight: "with a better dispatch workflow.",
    description:
      "Move maintenance coordination out of texts and spreadsheets and into one system for triage, vendor updates, proof of service, and billing support.",
  },
];

function getRandomVariant(excludeIndex?: number) {
  if (HERO_VARIANTS.length === 1) return HERO_VARIANTS[0];

  let nextIndex = Math.floor(Math.random() * HERO_VARIANTS.length);
  if (excludeIndex == null) return HERO_VARIANTS[nextIndex];

  while (nextIndex === excludeIndex) {
    nextIndex = Math.floor(Math.random() * HERO_VARIANTS.length);
  }

  return HERO_VARIANTS[nextIndex];
}

export function HeroCopy() {
  const [variant, setVariant] = useState(HERO_VARIANTS[0]);

  useEffect(() => {
    setVariant((current) => {
      const currentIndex = HERO_VARIANTS.findIndex(
        (entry) =>
          entry.headline === current.headline &&
          entry.highlight === current.highlight
      );

      return getRandomVariant(currentIndex >= 0 ? currentIndex : undefined);
    });
  }, []);

  return (
    <>
      <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
        {variant.headline}{" "}
        <span className="text-blue-600">{variant.highlight}</span>
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600 sm:text-xl">
        {variant.description}
      </p>
    </>
  );
}
