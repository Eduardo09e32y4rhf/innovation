'use client';

import { useEffect, useState } from 'react';

export function UserAvatar({ name, email, imageUrl, className = '' }: {
  name?: string; email?: string; imageUrl?: string | null; className?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [imageUrl]);
  const initials = (name?.trim() || email || 'Usuário').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return <span aria-hidden="true" className={'inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand text-sm font-semibold text-white ' + className}>
    {imageUrl && !failed ? <img src={imageUrl} alt="" width={36} height={36} onError={() => setFailed(true)} className="h-full w-full object-cover" /> : initials}
  </span>;
}
