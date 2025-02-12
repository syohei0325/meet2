import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getAuthErrorMessage } from '../../utils/errorMessages';

export const SignUpForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // パスワードバリデーション
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      setError(passwordErrors.join('\n'));
      return;
    }

    try {
      await signUp(email, password, username);
      navigate('/');
    } catch (err) {
      setError(getAuthErrorMessage(err));
    }
  };

  const validatePassword = (password: string) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);

    const errors = [];
    if (password.length < minLength) {
      errors.push(`パスワードは${minLength}文字以上である必要があります`);
    }
    if (!hasUpperCase) {
      errors.push('大文字を含める必要があります');
    }
    if (!hasLowerCase) {
      errors.push('小文字を含める必要があります');
    }
    if (!hasNumbers) {
      errors.push('数字を含める必要があります');
    }

    return errors;
  };

  // パスワードの入力時にリアルタイムでバリデーション
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    
    if (newPassword) {
      const errors = validatePassword(newPassword);
      if (errors.length > 0) {
        setError(errors.join('\n'));
      } else {
        setError('');
      }
    } else {
      setError('');
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">アカウント作成</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium">
            ユーザー名
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>
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
            onChange={handlePasswordChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
          {error && (
            <div className="mt-2 text-sm text-red-600 whitespace-pre-line">
              {error}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="w-full bg-blue-500 text-white rounded-md py-2 hover:bg-blue-600"
        >
          アカウントを作成
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        すでにアカウントをお持ちですか？{' '}
        <a href="/login" className="text-blue-500 hover:text-blue-600">
          ログイン
        </a>
      </p>
    </div>
  );
}; 