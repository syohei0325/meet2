import { 
  createBrowserRouter, 
  RouterProvider,
  Navigate,
  RouteObject
} from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthCallback } from './pages/AuthCallback';
import { AuthRedirect } from './components/auth/AuthRedirect';
import { LoginForm } from './components/auth/LoginForm';
import { SignUpForm } from './components/auth/SignUpForm';
import { MapView } from './components/MapView';
import { ProfilePage } from './components/ProfilePage';
import { CommunityPage } from './components/CommunityPage';
import { CreateCommunityForm } from './components/CreateCommunityForm';

// 認証が必要なルートを保護するためのコンポーネント
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>読み込み中...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

// ルート定義
const routes: RouteObject[] = [
  {
    path: '/login',
    element: <AuthRedirect><LoginForm /></AuthRedirect>
  },
  {
    path: '/signup',
    element: <AuthRedirect><SignUpForm /></AuthRedirect>
  },
  {
    path: '/',
    element: <ProtectedRoute><MapView /></ProtectedRoute>
  },
  {
    path: '/profile/:userId',
    element: <ProtectedRoute><ProfilePage /></ProtectedRoute>
  },
  {
    path: '/community/:communityId',
    element: <CommunityPage />
  },
  {
    path: '/create-community',
    element: <CreateCommunityForm />
  },
  {
    path: '/auth/callback',
    element: <AuthCallback />
  }
];

// ルーターの作成
const router = createBrowserRouter(routes, {
  future: {
    v7_relativeSplatPath: true
  }
});

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App; 