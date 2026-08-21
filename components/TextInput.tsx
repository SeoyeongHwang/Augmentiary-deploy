import { forwardRef } from 'react';

const TextInput = forwardRef<HTMLInputElement, {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    type?: string;
    className?: string;
  }>(({
    value,
    onChange,
    placeholder,
    type = 'text',
    className = '',
  }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border border-gray-300 px-6 py-4 transition-[background-color,border-color,box-shadow] duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-highlight ${className}`}
      />
    );
  }
);

TextInput.displayName = 'TextInput';

export default TextInput;
