export interface ButtonProps {
  children?: React.ReactNode;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export function Button({ children, disabled, type = 'button' }: ButtonProps) {
  return (
    <button type={type} disabled={disabled}>
      {children}
    </button>
  );
}
