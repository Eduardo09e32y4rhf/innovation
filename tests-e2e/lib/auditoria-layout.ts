import type { Page } from '@playwright/test';

export interface Achado { tipo: string; detalhe: string }

/** Auditoria de layout executada dentro da página (compartilhada pelo robô de tamanhos de tela e pelo autoteste). */
export async function auditar(page: Page): Promise<{ falhas: Achado[]; avisos: Achado[] }> {
  return page.evaluate(() => {
    const falhas: Array<{ tipo: string; detalhe: string }> = [];
    const avisos: Array<{ tipo: string; detalhe: string }> = [];
    const larguraTela = window.innerWidth;
    const nome = (el: Element) => {
      const h = el as HTMLElement;
      const texto = (h.innerText || h.getAttribute('aria-label') || h.getAttribute('placeholder') || h.getAttribute('title') || '').replace(/\s+/g, ' ').trim().slice(0, 40);
      return `<${el.tagName.toLowerCase()}${h.id ? `#${h.id}` : ''}> ${texto}`.trim();
    };
    const visivel = (el: Element) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0';
    };
    /** O elemento está dentro de uma área que rola na horizontal de propósito (tabela, carrossel)? */
    const emAreaQueRola = (el: Element) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const s = getComputedStyle(p);
        if (/(auto|scroll)/.test(s.overflowX) && p.scrollWidth > p.clientWidth) return true;
        if (s.overflowX === 'hidden' && p.getBoundingClientRect().right <= larguraTela + 1) return true; // recortado pelo próprio pai: não vaza da tela
      }
      return false;
    };

    if (!document.querySelector('meta[name="viewport"]')) falhas.push({ tipo: 'sem meta viewport', detalhe: 'sem <meta name="viewport">: no celular a página aparece minúscula' });
    if ((document.body.innerText || '').replace(/\s+/g, ' ').trim().length < 15) falhas.push({ tipo: 'tela em branco', detalhe: 'quase nenhum texto visível' });

    const largura = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    if (largura > larguraTela + 1) {
      const culpados = [...document.querySelectorAll('body *')].filter((el) => visivel(el) && el.getBoundingClientRect().right > larguraTela + 1 && !emAreaQueRola(el))
        .slice(0, 4).map(nome).join(' | ');
      falhas.push({ tipo: 'rolagem lateral', detalhe: `a página tem ${largura}px de largura numa tela de ${larguraTela}px. Possíveis culpados: ${culpados || 'não identificado'}` });
    }

    const interativos = [...document.querySelectorAll('button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="tab"]')].filter(visivel);
    const cortados = interativos.filter((el) => { const r = el.getBoundingClientRect(); return (r.right > larguraTela + 1 || r.left < -1) && !emAreaQueRola(el); });
    if (cortados.length) falhas.push({ tipo: 'controle cortado', detalhe: `${cortados.length} controle(s) saem da tela: ${cortados.slice(0, 5).map(nome).join(' | ')}` });

    if (larguraTela <= 820) {
      const pequenos = interativos.filter((el) => { const r = el.getBoundingClientRect(); const bloco = getComputedStyle(el).display; return bloco !== 'inline' && (r.width < 24 || r.height < 24); });
      if (pequenos.length) falhas.push({ tipo: 'alvo de toque minúsculo', detalhe: `${pequenos.length} controle(s) menores que 24x24 px: ${pequenos.slice(0, 5).map(nome).join(' | ')}` });
      const medios = interativos.filter((el) => { const r = el.getBoundingClientRect(); return getComputedStyle(el).display !== 'inline' && r.width >= 24 && r.height >= 24 && (r.width < 44 || r.height < 44); });
      if (medios.length) avisos.push({ tipo: 'alvo de toque abaixo de 44 px', detalhe: `${medios.length} controle(s), ex.: ${medios.slice(0, 3).map(nome).join(' | ')}` });
    }
    return { falhas, avisos };
  });
}

