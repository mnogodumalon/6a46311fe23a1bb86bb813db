import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import VertraegePage from '@/pages/VertraegePage';
import VertraegeDetailPage from '@/pages/VertraegeDetailPage';
import PartnerPage from '@/pages/PartnerPage';
import PartnerDetailPage from '@/pages/PartnerDetailPage';
import AnsprechpartnerPage from '@/pages/AnsprechpartnerPage';
import AnsprechpartnerDetailPage from '@/pages/AnsprechpartnerDetailPage';
import PublicFormVertraege from '@/pages/public/PublicForm_Vertraege';
import PublicFormPartner from '@/pages/public/PublicForm_Partner';
import PublicFormAnsprechpartner from '@/pages/public/PublicForm_Ansprechpartner';
// <public:imports>
// </public:imports>
// <custom:imports>
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/6a46310befb6490de8bc48c2" element={<PublicFormVertraege />} />
              <Route path="public/6a463107a68c98dae897d235" element={<PublicFormPartner />} />
              <Route path="public/6a46310a1a639283f3347b68" element={<PublicFormAnsprechpartner />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="vertraege" element={<VertraegePage />} />
                <Route path="vertraege/:id" element={<VertraegeDetailPage />} />
                <Route path="partner" element={<PartnerPage />} />
                <Route path="partner/:id" element={<PartnerDetailPage />} />
                <Route path="ansprechpartner" element={<AnsprechpartnerPage />} />
                <Route path="ansprechpartner/:id" element={<AnsprechpartnerDetailPage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
