export interface Fighter {
  id: string;
  model: string;
  position: string;
}

export function dispatch(positions: string[], models: string[]): Fighter[] {
  if (positions.length === 0) throw new Error("positions cannot be empty");
  if (models.length !== positions.length) {
    throw new Error(`models length (${models.length}) must equal positions length (${positions.length})`);
  }
  return positions.map((position, i) => ({ id: `${models[i]}#${i}`, model: models[i], position }));
}

export function roundRobin(count: number, pool: string[]): string[] {
  if (pool.length === 0) throw new Error("no models in pool");
  return Array.from({ length: count }, (_, i) => pool[i % pool.length]);
}
