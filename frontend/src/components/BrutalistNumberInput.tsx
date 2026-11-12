import React, { useState, useEffect } from 'react';

interface BrutalistNumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number | string;
  allowDecimals?: boolean;
}

export const BrutalistNumberInput: React.FC<BrutalistNumberInputProps> = ({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  allowDecimals = false,
  className = '',
  ...props
}) => {
  const [localStr, setLocalStr] = useState<string>(value !== undefined && value !== null ? String(value) : '');

  useEffect(() => {
    // Only sync if parsed value differs from numeric prop
    const parsed = parseFloat(localStr);
    if (parsed !== value && !isNaN(value)) {
      setLocalStr(String(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalStr(raw);
    if (raw === '' || raw === '-') {
      onChange(0);
      return;
    }
    const parsed = allowDecimals ? parseFloat(raw) : parseInt(raw, 10);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    if (localStr === '' || isNaN(parseFloat(localStr))) {
      setLocalStr(String(min));
      onChange(min);
    } else {
      const parsed = allowDecimals ? parseFloat(localStr) : parseInt(localStr, 10);
      let clamped = parsed;
      if (min !== undefined && clamped < min) clamped = min;
      if (max !== undefined && clamped > max) clamped = max;
      setLocalStr(String(clamped));
      onChange(clamped);
    }
  };

  return (
    <input
      type="number"
      value={localStr}
      min={min}
      max={max}
      step={step}
      onFocus={(e) => e.target.select()}
      onChange={handleChange}
      onBlur={handleBlur}
      className={`border border-slate-900 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-400 ${className}`}
      {...props}
    />
  );
};
