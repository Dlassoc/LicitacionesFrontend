import { test, expect } from '@playwright/test';

const API_BASE = process.env.E2E_API_BASE || 'http://localhost:5000';

function json(route, status, body) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

test.describe('Critical Path', () => {
  test('login, preferencias, busqueda y apertura de proyecto', async ({ page }) => {
    let loggedIn = false;

    await page.route(`${API_BASE}/**`, async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname;
      const method = req.method();

      if (path === '/auth/me' && method === 'GET') {
        if (!loggedIn) {
          return json(route, 401, { ok: false, error: 'No autenticado' });
        }
        return json(route, 200, { ok: true, email: 'qa@example.com', name: 'QA User' });
      }

      if (path === '/auth/login' && method === 'POST') {
        loggedIn = true;
        return json(route, 200, { ok: true });
      }

      if (path === '/auth/logout' && method === 'POST') {
        loggedIn = false;
        return json(route, 200, { ok: true });
      }

      if (path === '/subscriptions/me/preferences' && method === 'GET') {
        return json(route, 200, {
          ok: true,
          palabras_clave: 'energia solar',
          departamento: '',
          ciudad: '',
        });
      }

      if (path === '/subscriptions' && method === 'GET') {
        return json(route, 200, { ok: true, subscriptions: [] });
      }

      if (path === '/finanzas/indicadores' && method === 'GET') {
        return json(route, 200, { ok: true, data: {} });
      }

      if (path === '/analysis/batch/cache/stats' && method === 'GET') {
        return json(route, 200, {
          ok: true,
          total_analisis: 1,
          completados: 1,
          errores: 0,
          recientes_24h: 1,
        });
      }

      if (path === '/saved/discarded' && method === 'GET') {
        return json(route, 200, { ok: true, licitaciones: [] });
      }

      if (path === '/saved/discarded' && method === 'POST') {
        return json(route, 200, { ok: true });
      }

      if (path.startsWith('/saved/discarded/') && method === 'DELETE') {
        return json(route, 200, { ok: true });
      }

      if (path === '/saved/matched' && method === 'GET') {
        return json(route, 200, { ok: true, licitaciones: [] });
      }

      if (path === '/saved/analyzed' && (method === 'GET' || method === 'POST')) {
        return json(route, 200, { ok: true, licitaciones: [] });
      }

      if (path === '/analysis/batch/existing' && method === 'POST') {
        return json(route, 200, { ok: true, data: {} });
      }

      if (path === '/analysis/batch/trigger-batch' && method === 'POST') {
        return json(route, 200, { ok: true, total: 1 });
      }

      if (path.startsWith('/analysis/batch/status/') && method === 'GET') {
        return json(route, 200, {
          ok: true,
          estado: 'completado',
          porcentaje_cumplimiento: 91,
          cumple: true,
          requisitos_extraidos: {
            indicadores_financieros: {
              liquidez: { valor: 1.8, condicion: '>= 1.5' },
            },
          },
        });
      }

      if (path === '/secop/mis-licitaciones' && method === 'GET') {
        return json(route, 200, { ok: true, resultados: [], total: 0, limit: 50, offset: 0 });
      }

      if (path === '/secop/buscar' && method === 'GET') {
        return json(route, 200, {
          ok: true,
          resultados: [
            {
              ID_Portafolio: 'LP-2026-0001',
              Entidad: 'Entidad Demo S.A.S.',
              Referencia_del_proceso: 'REF-001',
              Nombre: 'Suministro de paneles solares',
              Departamento: 'Antioquia',
              Ciudad: 'Medellin',
              Estado: 'Abierto',
              URL_Proceso: 'https://www.colombiacompra.gov.co/',
              Cuantia: '250000000',
              Fecha_publicacion: '2026-04-10',
            },
          ],
          total: 1,
          limit: 21,
          offset: 0,
          smart_search: false,
          analyzed_count: 0,
          pending_count: 1,
        });
      }

      return json(route, 200, { ok: true });
    });

    await page.goto('/login');

    await page.getByPlaceholder('Ej. usuario@dominio.com').fill('qa@example.com');
    await page.getByPlaceholder('Tu contraseña').fill('123456');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page).toHaveURL(/\/app/);
    await expect(page.locator('.user-chip')).toContainText('QA User');

    await page.locator('.avatar-btn').click();
    await page.getByRole('menuitem', { name: 'Preferencias' }).click();
    await page.goto('/app/preferences');

    await expect(page).toHaveURL(/\/app\/preferences/);
    await expect(page.getByText(/Emergente Energía Sostenible/)).toBeVisible();

    await page.goto('/app?q=paneles%20solares');
    await expect(page).toHaveURL(/\/app$/);

    await expect(page.getByText('Entidad Demo S.A.S.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Descartar licitación' }).first()).toBeVisible();

    await page.getByText('Entidad Demo S.A.S.').first().click();
    await expect(page.getByRole('button', { name: 'Cerrar' })).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar' }).click();
    await expect(page.getByRole('button', { name: 'Cerrar' })).toHaveCount(0);
  });
});
