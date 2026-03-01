'use client';

import { clsx as cn } from 'clsx';
import React, { forwardRef, useRef, ButtonHTMLAttributes } from 'react';

import LoadingDots from '@/components/ui/LoadingDots';

import styles from './Button.module.css';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'slim' | 'flat';
  active?: boolean;
  width?: number;
  loading?: boolean;
  Component?: React.ElementType;
}

// Simple ref merging function
function mergeRefs<T = any>(refs: Array<React.MutableRefObject<T> | React.LegacyRef<T> | undefined | null>): React.RefCallback<T> {
  return (value) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref != null) {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    });
  };
}

const Button = forwardRef<HTMLButtonElement, Props>((props, buttonRef) => {
  const {
    className,
    variant = 'flat',
    children,
    active,
    width,
    loading = false,
    disabled = false,
    style = {},
    Component = 'button',
    ...rest
  } = props;
  const ref = useRef(null);
  const rootClassName = cn(
    styles.root,
    className,
    variant === 'slim' && styles.slim,
    loading && styles.loading,
    disabled && styles.disabled
  );
  return (
    <Component
      aria-pressed={active}
      data-variant={variant}
      ref={mergeRefs([ref, buttonRef])}
      className={rootClassName}
      disabled={disabled}
      style={{
        width,
        ...style
      }}
      {...rest}
    >
      {children}
      {loading && (
        <i className="flex pl-2 m-0">
          <LoadingDots />
        </i>
      )}
    </Component>
  );
});
Button.displayName = 'Button';

export default Button;
