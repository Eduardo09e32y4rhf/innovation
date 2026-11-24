import { redirect } from 'next/navigation';

type SearchParamValue = string | string[] | undefined;
type SearchParams = Record<string, SearchParamValue>;

interface CriarContaPageProps {
  searchParams?: Promise<SearchParams>;
}

function buildQueryString(searchParams: SearchParams | undefined): string {
  if (!searchParams) return '';

  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (!key || value === undefined) continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== '') {
          query.append(key, item);
        }
      }
    } else if (value !== '') {
      query.set(key, value);
    }
  }

  return query.toString();
}

export default async function CriarContaPage({ searchParams }: CriarContaPageProps) {
  const resolvedParams = await searchParams;
  const queryString = buildQueryString(resolvedParams);
  const destination = queryString ? `/cadastro?${queryString}` : '/cadastro';

  redirect(destination);
}
