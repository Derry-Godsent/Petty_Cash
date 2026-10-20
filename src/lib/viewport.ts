/** Size controls to the drawable viewport, never to the physical screen.
 * Some older iOS Home Screen shells exclude a bottom strip while still reporting
 * a bottom safe-area inset. Account for that strip in padding, not app height. */
export interface ViewportMeasurements {
  layoutHeight: number;
  visualHeight: number;
  visualOffsetTop: number;
  screenHeight: number;
  screenWidth: number;
  width: number;
  safeTop: number;
  standaloneIOS: boolean;
}
export function appViewportHeight(m: ViewportMeasurements): number {
  const visibleBottom = m.visualHeight + m.visualOffsetTop;
  return Math.max(1, Math.min(m.layoutHeight, visibleBottom || m.layoutHeight));
}

export function appBottomInset(m: ViewportMeasurements, safeBottom: number): number {
  const excluded = m.screenHeight - m.layoutHeight;
  const keyboard = m.visualHeight > 0 && m.layoutHeight - m.visualHeight > 120;
  const alreadyReserved = m.standaloneIOS && !keyboard
    && Math.abs(m.width - m.screenWidth) <= 1
    && excluded > 1 && excluded <= m.safeTop + 1;
  // Keep the bar inside the viewport. Never add safe-area space twice when the
  // legacy installed shell already leaves at least that much space below it.
  return Math.max(0, safeBottom - (alreadyReserved ? excluded : 0));
}

export const LAYOUT_VERSION = 'viewport-5';
export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}
export function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function installViewportSizing(): () => void {
  const root = document.documentElement;
  const probe = document.createElement('div');
  probe.className = 'viewport-safe-area-probe';
  probe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(probe);
  let frame = 0;
  const measure = () => {
    const visual = window.visualViewport;
    // Do not resize the entire layout during accessibility pinch zoom.
    if (visual && Math.abs(visual.scale - 1) > 0.01) return;
    const insets = getComputedStyle(probe);
    const safeTop = parseFloat(insets.paddingTop) || 0;
    const safeBottom = parseFloat(insets.paddingBottom) || 0;
    const shortSide = Math.min(screen.width, screen.height);
    const longSide = Math.max(screen.width, screen.height);
    const landscape = window.innerWidth > shortSide + 1;
    const measurements: ViewportMeasurements = {
      layoutHeight: window.innerHeight, visualHeight: visual?.height || window.innerHeight,
      visualOffsetTop: visual?.offsetTop || 0,
      screenHeight: landscape ? shortSide : longSide,
      screenWidth: landscape ? longSide : shortSide,
      width: window.innerWidth, safeTop,
      standaloneIOS: isIOS() && isStandalone() && window.self === window.top,
    };
    const height = appViewportHeight(measurements);
    const bottomInset = appBottomInset(measurements, safeBottom);
    root.style.setProperty('--app-viewport-height', `${Math.round(height * 100) / 100}px`);
    root.style.setProperty('--app-bottom-inset', `${bottomInset}px`);
    root.style.setProperty('--app-safe-top', `${safeTop}px`);
    root.style.setProperty('--app-safe-bottom', `${safeBottom}px`);
    root.dataset.layoutVersion = LAYOUT_VERSION;
  };
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(measure);
  };
  measure();
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);
  window.addEventListener('pageshow', schedule);
  document.addEventListener('visibilitychange', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('scroll', schedule);
  return () => {
    cancelAnimationFrame(frame);
    probe.remove();
    window.removeEventListener('resize', schedule);
    window.removeEventListener('orientationchange', schedule);
    window.removeEventListener('pageshow', schedule);
    document.removeEventListener('visibilitychange', schedule);
    window.visualViewport?.removeEventListener('resize', schedule);
    window.visualViewport?.removeEventListener('scroll', schedule);
    root.style.removeProperty('--app-viewport-height');
    root.style.removeProperty('--app-bottom-inset');
  };
}

export function layoutDiagnostics() {
  const root = document.getElementById('root');
  const nav = document.querySelector('.bottom-nav');
  const css = getComputedStyle(document.documentElement);
  return {
    layout: LAYOUT_VERSION,
    mode: isStandalone() ? 'standalone' : 'browser',
    viewport: `${window.innerWidth} × ${window.innerHeight}`,
    visualViewport: window.visualViewport ? `${Math.round(window.visualViewport.width)} × ${Math.round(window.visualViewport.height)}` : 'unavailable',
    screen: `${screen.width} × ${screen.height}`,
    safeArea: `${css.getPropertyValue('--app-safe-top').trim()} / ${css.getPropertyValue('--app-safe-bottom').trim()}`,
    appBottom: Math.round(root?.getBoundingClientRect().bottom || 0),
    navigationBottom: Math.round(nav?.getBoundingClientRect().bottom || 0),
    effectiveBottomInset: css.getPropertyValue('--app-bottom-inset').trim(),
    navigationPadding: nav ? getComputedStyle(nav).paddingBottom : '',
  };
}
