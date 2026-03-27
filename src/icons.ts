import { icons, createElement } from 'lucide';

/**
 * Returns an SVG element for the given Lucide icon name.
 * Falls back to a text span if the icon isn't found.
 */
export function getIconSvg(name: string, size = 16): string {
  const iconData = (icons as Record<string, any>)[toPascalCase(name)];
  if (!iconData) {
    return `<span class="icon-fallback">${name}</span>`;
  }
  const el = createElement(iconData) as SVGElement;
  el.setAttribute('width', String(size));
  el.setAttribute('height', String(size));
  el.style.flexShrink = '0';
  // Return the outer HTML string
  const wrapper = document.createElement('div');
  wrapper.appendChild(el);
  return wrapper.innerHTML;
}

/** Convert kebab-case to PascalCase: "chevron-down-circle" -> "ChevronDownCircle" */
function toPascalCase(str: string): string {
  return str
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}
