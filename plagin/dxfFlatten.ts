export function flattenDxfEntities(entities: any[]) {
  return entities.map(e => ({ ...e, flattened: true }));
}