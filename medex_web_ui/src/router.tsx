import { createBrowserRouter, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import BrandsPage from './pages/BrandsPage'
import BrandDetailPage from './pages/BrandDetailPage'
import GenericsPage from './pages/GenericsPage'
import GenericDetailPage from './pages/GenericDetailPage'
import GenericBrandsPage from './pages/GenericBrandsPage'
import CompaniesPage from './pages/CompaniesPage'
import CompanyDetailPage from './pages/CompanyDetailPage'
import DrugClassesPage from './pages/DrugClassesPage'
import DrugClassDetailPage from './pages/DrugClassDetailPage'
import DosageFormsPage from './pages/DosageFormsPage'
import DosageFormDetailPage from './pages/DosageFormDetailPage'
import IndicationsPage from './pages/IndicationsPage'
import IndicationDetailPage from './pages/IndicationDetailPage'
import SearchPage from './pages/SearchPage'
import { JobsPage, JobDetailPage } from './pages/JobsPage'
import App from './App'  // existing API Explorer

export const router = createBrowserRouter([
  /* ── API Explorer (existing) ── */
  { path: '/', element: <App /> },

  /* ── MedEx web app ── */
  {
    path: '/app',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },

      /* Search */
      { path: 'search', element: <SearchPage /> },

      /* Brands */
      { path: 'brands',     element: <BrandsPage /> },
      { path: 'brands/:id', element: <BrandDetailPage /> },

      /* Generics */
      { path: 'generics',           element: <GenericsPage /> },
      { path: 'generics/:id',       element: <GenericDetailPage /> },
      { path: 'generics/:id/brands', element: <GenericBrandsPage /> },

      /* Herbal & Veterinary — reuse GenericsPage with forced type */
      { path: 'herbal',     element: <GenericsPage type="herbal" /> },
      { path: 'veterinary', element: <GenericsPage type="veterinary" /> },

      /* Companies */
      { path: 'companies',     element: <CompaniesPage /> },
      { path: 'companies/:id', element: <CompanyDetailPage /> },

      /* Drug Classes */
      { path: 'drug-classes',     element: <DrugClassesPage /> },
      { path: 'drug-classes/:id', element: <DrugClassDetailPage /> },

      /* Dosage Forms */
      { path: 'dosage-forms',     element: <DosageFormsPage /> },
      { path: 'dosage-forms/:id', element: <DosageFormDetailPage /> },

      /* Indications */
      { path: 'indications',     element: <IndicationsPage /> },
      { path: 'indications/:id', element: <IndicationDetailPage /> },

      /* Jobs */
      { path: 'jobs',     element: <JobsPage /> },
      { path: 'jobs/:id', element: <JobDetailPage /> },

      /* Fallback */
      { path: '*', element: <Navigate to="/app" replace /> },
    ],
  },

  /* Root fallback */
  { path: '*', element: <Navigate to="/" replace /> },
])
