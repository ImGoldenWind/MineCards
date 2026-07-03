import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: Array<{ label: string; value: string }>;
}

export function Select({ label, options, id, ...props }: SelectProps) {
  const selectId = id ?? props.name ?? label;

  return (
    <label className="field" htmlFor={selectId}>
      <span>{label}</span>
      <select id={selectId} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
