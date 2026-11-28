// Data files are read through Vite's "?raw" import, which gives the text of the file.
// The physics package has no Node types, so the tests cannot use node:fs.
declare module "*?raw" {
  const text: string;
  export default text;
}
