import pkg from '../../package.json';

/** Single source of truth for the visible product version. */
export const APP_VERSION = `v${pkg.version.split('.').slice(0, 2).join('.')}`;
