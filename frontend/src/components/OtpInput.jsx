import { useRef } from "react";

export default function OtpInput({ value, onChange, length = 6, disabled = false }) {
  const inputsRef = useRef([]);

  function handleChange(index, e) {
    const digits = e.target.value.replace(/\D/g, "");
    if (!digits) {
      const chars = value.split("");
      chars[index] = "";
      onChange(chars.join(""));
      return;
    }
    // Handles fast typing/autofill where multiple digits land in one box.
    const chars = value.split("");
    digits.split("").forEach((digit, offset) => {
      if (index + offset < length) chars[index + offset] = digit;
    });
    const next = chars.join("").slice(0, length);
    onChange(next);
    const nextIndex = Math.min(index + digits.length, length - 1);
    inputsRef.current[nextIndex]?.focus();
    inputsRef.current[nextIndex]?.select();
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!text) return;
    e.preventDefault();
    onChange(text);
    inputsRef.current[Math.min(text.length, length - 1)]?.focus();
  }

  return (
    <div className="flex gap-2 justify-between">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className="w-11 h-12 text-center text-lg font-semibold rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
        />
      ))}
    </div>
  );
}