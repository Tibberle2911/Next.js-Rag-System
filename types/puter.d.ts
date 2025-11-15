declare module 'puter' {
  const puter: any
  export default puter
}

declare global {
  interface Window {
    puter: any
  }
}

export {}
