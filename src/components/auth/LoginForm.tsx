import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FcGoogle } from 'react-icons/fc';
import { getAuthErrorMessage } from '../../utils/errorMessages';

export const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { signIn, signInWithGoogle } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signIn(email, password);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">ログイン</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            パスワード
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              または
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-md py-2 px-4 hover:bg-gray-50"
        >
          <FcGoogle className="text-xl" />
          Googleでログイン
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <p className="mt-4 text-center text-sm text-gray-600">
        アカウントをお持ちでないですか？{' '}
        <a href="/signup" className="text-blue-500 hover:text-blue-600">
          新規登録
        </a>
      </p>
    </div>
  );
}; 