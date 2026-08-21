import { forwardRef, useRef, useEffect } from 'react';

const Textarea = forwardRef<HTMLTextAreaElement, {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    rows?: number;
    className?: string;
    disabled?: boolean;
  }>(({
    value,
    onChange,
    placeholder,
    rows = 20,
    className = '',
    disabled = false,
  }, ref) => {
    const innerRef = useRef<HTMLTextAreaElement>(null);
    // ref 병합
    const setRefs = (el: HTMLTextAreaElement) => {
      if (typeof ref === 'function') ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
      innerRef.current = el;
    };

    useEffect(() => {
      const textarea = innerRef.current;
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      }
    }, [value]);

    return (
      <textarea
        ref={setRefs}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={`w-full h-fit p-6 min-h-[60vh] overflow-hidden max-h-none text-base leading-10 antialiased font-sans font-normal text-black focus:outline-none transition-[background-color,border-color,box-shadow] duration-150 ease-out resize-none placeholder:text-muted caret-stone-900 ${className}`}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
