import packageJson from "../package.json";

// Static JSON import — bundled at compile time, works in bun --compile bunfs.
export const VERSION: string = packageJson.version;
