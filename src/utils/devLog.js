/**
 * Logger condicionado a modo DEV.
 * En producción, devLog/devInfo/devDebug son no-ops para evitar ruido en consola
 * y fuga de información interna. Los console.warn/error se dejan intactos en los
 * sitios de uso porque sí son útiles en prod.
 */

const isDev = import.meta.env.DEV;

export const devLog = (...args) => {
  if (isDev) console.log(...args);
};

export const devInfo = (...args) => {
  if (isDev) console.info(...args);
};

export const devDebug = (...args) => {
  if (isDev) console.debug(...args);
};
