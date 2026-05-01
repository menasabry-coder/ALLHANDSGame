"use client";

import { useState } from "react";

interface Props {
  options: string[];
  onVote: (optionIndex: number) => void;
  disabled?: boolean;
}

export default function VoteButtons({ options, onVote, disabled }: Props) {
  const [selected, setSelected] = useState<number | null>(null);

  const handleClick = (idx: number) => {
    if (disabled || selected !== null) return;
    setSelected(idx);
    onVote(idx);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {options.map((option, idx) => (
        <button
          key={idx}
          onClick={() => handleClick(idx)}
          disabled={disabled || selected !== null}
          className={`py-4 px-6 rounded-xl text-lg font-semibold transition-all duration-200 border-2 ${
            selected === idx
              ? "bg-green-600 border-green-400 text-white scale-105"
              : selected !== null
                ? "bg-gray-700 border-gray-600 text-gray-400 opacity-50 cursor-not-allowed"
                : "bg-gray-800 border-gray-600 text-white hover:bg-gray-700 hover:border-blue-400 hover:scale-[1.02] active:scale-95"
          }`}
        >
          {option}
          {selected === idx && " ✓"}
        </button>
      ))}
    </div>
  );
}
