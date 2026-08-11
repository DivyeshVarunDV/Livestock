'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ComponentType<{ size?: number; className?: string }> | string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  icon,
  children,
  footer,
  maxWidth = '700px',
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && mounted) {
      triggerRef.current = document.activeElement as HTMLElement;

      // 1. Disable body & html scrolling while modal is open
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      // Autofocus first input field in the modal body
      const timer = setTimeout(() => {
        if (modalRef.current) {
          const firstInput = modalRef.current.querySelector<HTMLElement>(
            'input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
          );
          if (firstInput) {
            firstInput.focus();
          } else {
            const firstFocusable = modalRef.current.querySelector<HTMLElement>(
              'button, [href], [tabindex]:not([tabindex="-1"])'
            );
            if (firstFocusable) {
              firstFocusable.focus();
            } else {
              modalRef.current.focus();
            }
          }
        }
      }, 50);

      // ESC closes the modal & Tab focus trap
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
          return;
        }

        // Trap keyboard focus inside modal
        if (e.key === 'Tab' && modalRef.current) {
          const focusables = modalRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusables.length === 0) return;

          const first = focusables[0];
          const last = focusables[focusables.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === first) {
              last.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === last) {
              first.focus();
              e.preventDefault();
            }
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        window.removeEventListener('keydown', handleKeyDown);
        if (triggerRef.current) {
          triggerRef.current.focus();
        }
      };
    }
  }, [isOpen, mounted, onClose]);

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  const modalElement = (
    // Fixed fullscreen overlay (rgba(0,0,0,0.45)); clicking outside closes the modal
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {/* Standalone floating dialog without any outer border, card wrapper, or gray outline */}
      <div
        ref={modalRef}
        className="modal-content"
        style={{
          width: `min(${maxWidth}, 95vw)`,
          maxHeight: 'calc(100vh - 48px)',
        }}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 id={titleId} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
            {icon && (
              typeof icon === 'string' ? (
                <i className={`fa ${icon}`} style={{ color: 'var(--accent-primary)', marginRight: '8px' }}></i>
              ) : (
                <span style={{ marginRight: '8px', display: 'inline-flex', alignItems: 'center' }}>
                  {React.createElement(icon, { size: 20, className: "text-green-700" })}
                </span>
              )
            )}
            {title}
          </h3>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body (only scrollable section) */}
        <div className="modal-body">{children}</div>

        {/* Footer */}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );

  // Mounted directly under document.body via createPortal
  return createPortal(modalElement, document.body);
}
