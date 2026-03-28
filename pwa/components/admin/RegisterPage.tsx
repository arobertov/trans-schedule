import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { login, register } from '../../jwt-frontend-auth/src/auth/authService';

const metroImageUrl =
  'https://trud.bg/storage/media/2021-01/1101448/03-1_8594952365477869556_original.jpg';

const companyLogoUrl =
  'https://scontent.fsof10-1.fna.fbcdn.net/v/t39.30808-1/366338516_691192243052724_3658434502454811407_n.jpg?stp=c22.24.2000.2000a_dst-jpg_s200x200_tt6&_nc_cat=107&ccb=1-7&_nc_sid=2d3e12&_nc_ohc=bUvPkvQUp7YQ7kNvwFvixi7&_nc_oc=AdqwuzVVRiQwpfZHjOfCfEcWTQSfmy-KTut3K8Pn22_ZuKsAjq51ibXM9B6ZqCs05Gs&_nc_zt=24&_nc_ht=scontent.fsof10-1.fna&_nc_gid=_Gwcsv_kHw38NVbObAlGdw&_nc_ss=7a30f&oh=00_AfwPdmyuxz_rgmeap69BwMzQ0I7iWStYAe8SxZajFppiTw&oe=69CD67D0';

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 460,
  borderRadius: 22,
  padding: '28px 26px',
  border: '1px solid rgba(255, 255, 255, 0.32)',
  background: 'linear-gradient(180deg, rgba(14, 27, 45, 0.74), rgba(7, 16, 30, 0.9))',
  boxShadow: '0 30px 80px rgba(5, 10, 20, 0.45)',
  color: '#f8fbff',
  backdropFilter: 'blur(8px)',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
  letterSpacing: '0.02em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 12,
  border: '1px solid rgba(255, 255, 255, 0.25)',
  background: 'rgba(255, 255, 255, 0.12)',
  color: '#ffffff',
  padding: '12px 14px',
  outline: 'none',
  fontSize: 16,
};

const buttonStyle: React.CSSProperties = {
  marginTop: 10,
  width: '100%',
  border: 'none',
  borderRadius: 12,
  padding: '12px 16px',
  background: 'linear-gradient(135deg, #3da5ff, #00c6a4)',
  color: '#001426',
  fontWeight: 800,
  fontSize: 16,
  cursor: 'pointer',
};

export const RegisterPage = () => {
  const router = useRouter();
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (username.trim().length < 3) {
      setError('Потребителското име трябва да е поне 3 символа.');
      return;
    }

    if (password.length < 6) {
      setError('Паролата трябва да е поне 6 символа.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Паролите не съвпадат.');
      return;
    }

    setIsSubmitting(true);

    try {
      await register(username.trim(), password, firstName.trim(), lastName.trim());
      setSuccess('Регистрацията е успешна. Влизане в системата...');

      await login(username.trim(), password);
      router.push('/admin');
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Възникна грешка при регистрацията. Моля, опитайте отново.';
      setError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 18,
        fontFamily: '"Sofia Sans", "Poppins", sans-serif',
        backgroundImage: `linear-gradient(130deg, rgba(2, 20, 42, 0.88), rgba(23, 16, 53, 0.6)), url(${metroImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <section style={cardStyle}>
        <p style={{ margin: 0, color: '#9fd6ff', fontSize: 36, fontWeight: 'bold', letterSpacing: '0.05em' }}>
          МЕТРОПОЛИТЕН ЕАД
        </p>
        <h1
          style={{
            margin: '10px 0 6px',
            fontSize: 32,
            lineHeight: 1.05,
            fontWeight: 900,
            letterSpacing: '-0.02em',
          }}
        >
          Създай профил
        </h1>
        <img
          src={companyLogoUrl}
          alt="Лого"
          style={{
            width: 92,
            height: 92,
            borderRadius: '50%',
            objectFit: 'cover',
            display: 'block',
            margin: '8px auto 14px',
            border: '2px solid rgba(255, 255, 255, 0.6)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
          }}
        />

        <p style={{ margin: '0 0 20px', color: '#d7e8ff', fontSize: 15 }}>
          Въведете имената си, изберете потребителско име и задайте парола.
        </p>

        {error && (
          <p style={{ margin: '0 0 12px', color: '#ffb4b4', fontSize: 14 }} role="alert">
            {error}
          </p>
        )}
        {success && (
          <p style={{ margin: '0 0 12px', color: '#b7ffd8', fontSize: 14 }}>
            {success}
          </p>
        )}

        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="register-first-name" style={labelStyle}>
              Първо име
            </label>
            <input
              id="register-first-name"
              name="firstName"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label htmlFor="register-last-name" style={labelStyle}>
              Фамилия
            </label>
            <input
              id="register-last-name"
              name="lastName"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label htmlFor="register-username" style={labelStyle}>
              Потребителско име
            </label>
            <input
              id="register-username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label htmlFor="register-password" style={labelStyle}>
              Парола
            </label>
            <input
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label htmlFor="register-password-confirm" style={labelStyle}>
              Потвърди паролата
            </label>
            <input
              id="register-password-confirm"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          <button type="submit" style={buttonStyle} disabled={isSubmitting || !!success}>
            {isSubmitting ? 'Регистриране...' : 'Регистрация'}
          </button>

          <p style={{ margin: '14px 0 0', textAlign: 'center', color: '#d7e8ff', fontSize: 13 }}>
            Вече имате акаунт?{' '}
            <Link href="/admin" style={{ color: '#78d8ff', textDecoration: 'none', fontWeight: 700 }}>
              Влезте
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
};

export default RegisterPage;
