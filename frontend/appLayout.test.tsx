import React from 'react';
import { render } from '@testing-library/react';
import AppLayout from '../components/AppLayout';

// Just mock Next navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/dashboard',
}));

// Provide a mock user so it renders
jest.mock('../services/api', () => ({
  AuthService: {
    me: jest.fn().mockResolvedValue({ id: 1, name: 'Test User', email: 't@t.com', role: 'admin', subscription_status: 'active' }),
  },
  NotificationService: {
    getNotifications: jest.fn().mockResolvedValue([]),
  }
}));

test('AppLayout renders buttons with aria-label', async () => {
  const { container, findByRole, findAllByRole } = render(<AppLayout><div>Test</div></AppLayout>);

  // Wait for the layout to render the TopBar and Sidebar
  const buttons = await findAllByRole('button');

  const ariaLabels = buttons.map(b => b.getAttribute('aria-label')).filter(Boolean);

  console.log("Found ARIA labels:", ariaLabels);

  expect(ariaLabels).toContain('Abrir menu');
  expect(ariaLabels).toContain('Notificações');
});
