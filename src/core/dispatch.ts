export interface Fighter {
  id: string;
  model: string;
  position: string;
}

export function dispatch(
  positions: string[],
  availableModels: string[],
  override?: string[],
): Fighter[] {
  if (positions.length === 0) throw new Error("positions cannot be empty");
  if (availableModels.length === 0) throw new Error("no available models");

  if (override?.length) {
    const unavailable = override.filter((m) => !availableModels.includes(m));
    if (unavailable.length) {
      throw new Error(`override contains unavailable models: ${unavailable.join(", ")}`);
    }
  }

  const pool = override?.length ? override : availableModels;

  return positions.map((position, i) => {
    const model = pool[i % pool.length];
    return { id: `${model}#${i}`, model, position };
  });
}
