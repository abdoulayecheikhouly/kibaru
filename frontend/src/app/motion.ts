import {
  afterNextRender,
  DestroyRef,
  Directive,
  ElementRef,
  effect,
  inject,
  input,
  numberAttribute,
} from '@angular/core';

@Directive({ selector: '[appReveal]' })
export class Reveal {
  appReveal = input(0, { transform: numberAttribute });
  constructor() {
    const element = inject(ElementRef<HTMLElement>).nativeElement;
    const destroy = inject(DestroyRef);
    afterNextRender(() => {
      const preference = matchMedia('(prefers-reduced-motion: reduce)');
      if (preference.matches || !('IntersectionObserver' in window) || !element.animate) return;
      let animation: Animation | undefined;
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer.disconnect();
          if (preference.matches) return;
          animation = element.animate(
            [
              { opacity: 0, transform: 'translateY(20px)' },
              { opacity: 1, transform: 'translateY(0)' },
            ],
            {
              duration: 550,
              delay: Math.min(240, Math.max(0, this.appReveal() || 0)),
              easing: 'cubic-bezier(.2,.7,.2,1)',
              fill: 'backwards',
            },
          );
        },
        { threshold: 0.08 },
      );
      const stop = () => {
        if (preference.matches) {
          observer.disconnect();
          animation?.cancel();
        }
      };
      preference.addEventListener('change', stop);
      observer.observe(element);
      destroy.onDestroy(() => {
        observer.disconnect();
        animation?.cancel();
        preference.removeEventListener('change', stop);
      });
    });
  }
}

@Directive({ selector: '[basketPulse]' })
export class BasketPulse {
  basketPulse = input(0);
  private previous: number | undefined;
  constructor() {
    const element = inject(ElementRef<HTMLElement>).nativeElement;
    let animation: Animation | undefined;
    inject(DestroyRef).onDestroy(() => animation?.cancel());
    effect(() => {
      const count = this.basketPulse();
      const changed = this.previous !== undefined && count !== this.previous;
      this.previous = count;
      if (!changed || matchMedia('(prefers-reduced-motion: reduce)').matches || !element.animate)
        return;
      animation?.cancel();
      animation = element.animate(
        [
          { transform: 'scale(1)' },
          { transform: 'scale(1.22)', offset: 0.45 },
          { transform: 'scale(1)' },
        ],
        { duration: 360, easing: 'ease-out' },
      );
    });
  }
}
