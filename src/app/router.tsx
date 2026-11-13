import { createBrowserRouter, Navigate } from 'react-router'
import { CapturePage } from '../features/capture/CapturePage'
import { LibraryPage } from '../features/library/LibraryPage'
import { EditQuestionPage } from '../features/library/EditQuestionPage'
import { QuestionDetailPage } from '../features/library/QuestionDetailPage'
import { WelcomePage } from '../features/onboarding/WelcomePage'
import { HomePage } from '../features/review/HomePage'
import { ReviewPage } from '../features/review/ReviewPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { TagsPage } from '../features/settings/TagsPage'
import { FullLayout } from './FullLayout'
import { TabLayout } from './TabLayout'

// 路由見 docs/PRD.md 第 2 節
export const router = createBrowserRouter([
  {
    element: <TabLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/library', element: <LibraryPage /> },
    ],
  },
  {
    element: <FullLayout />,
    children: [
      { path: '/review', element: <ReviewPage /> },
      { path: '/capture', element: <CapturePage /> },
      { path: '/library/:id', element: <QuestionDetailPage /> },
      { path: '/library/:id/edit', element: <EditQuestionPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/settings/tags', element: <TagsPage /> },
      { path: '/welcome', element: <WelcomePage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
