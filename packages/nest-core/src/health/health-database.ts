export const HEALTH_DATABASE = Symbol('HEALTH_DATABASE')

export interface HealthDatabase {
  $queryRaw(query: TemplateStringsArray, ...values: unknown[]): unknown
}
