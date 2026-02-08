/*
Copyright (c) 2025 Tethys Plex

This file is part of Veloera.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
*/

const SUPPRESSED_PATTERNS = [
  /findDOMNode is deprecated and will be removed in the next major release/i,
  /ReactDOM\.render is no longer supported in React 18/i,
];

function patchConsoleMethod(method) {
  const original = console[method];
  if (typeof original !== 'function' || original.__veloPatched) {
    return;
  }

  const wrapped = (...args) => {
    const first = args[0];
    if (typeof first === 'string') {
      const shouldSuppress = SUPPRESSED_PATTERNS.some((pattern) =>
        pattern.test(first),
      );
      if (shouldSuppress) {
        return;
      }
    }
    original(...args);
  };

  wrapped.__veloPatched = true;
  console[method] = wrapped;
}

export function suppressReactLegacyWarningsInDev() {
  if (!import.meta.env.DEV) {
    return;
  }
  patchConsoleMethod('error');
  patchConsoleMethod('warn');
}

