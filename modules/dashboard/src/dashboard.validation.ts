export function isDashboardEnvironment(value: string): value is 'development' | 'production' {
  return value === 'development' || value === 'production';
}
