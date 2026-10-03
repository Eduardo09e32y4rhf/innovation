import { redirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

export default function CriarContaPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const query = new URLSearchParams();

  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, item));
    } else if (value !== undefined) {
      query.set(key, value);
    }
  });

  const suffix = query.toString();
  redirect(suffix ? `/cadastro?${suffix}` : '/cadastro');
}
