import * as React from 'react';
import type { JSX } from 'react';
import { useLogin, useNotify } from 'react-admin';
import Link from 'next/link';
import { getRegistrationAllowed, registrationToggleEvent } from '../../helpers/registrationSettings';

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

export const CustomLoginPage = () => {
  const login = useLogin();
  const notify = useNotify();
  const defaultAllowRegistration = process.env.NEXT_PUBLIC_ALLOW_REGISTRATION === 'true';

  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [allowRegistration, setAllowRegistration] = React.useState<boolean>(defaultAllowRegistration);

  React.useEffect(() => {
    let active = true;

    getRegistrationAllowed(defaultAllowRegistration).then((enabled) => {
      if (active) {
        setAllowRegistration(enabled);
      }
    });

    const onRegistrationToggleChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ enabled: boolean }>;
      if (typeof customEvent.detail?.enabled === 'boolean') {
        setAllowRegistration(customEvent.detail.enabled);
      } else {
        getRegistrationAllowed(defaultAllowRegistration).then((enabled) => {
          if (active) {
            setAllowRegistration(enabled);
          }
        });
      }
    };

    window.addEventListener(registrationToggleEvent, onRegistrationToggleChange as EventListener);

    return () => {
      active = false;
      window.removeEventListener(registrationToggleEvent, onRegistrationToggleChange as EventListener);
    };
  }, [defaultAllowRegistration]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await login({ username, password });
    } catch {
      notify('Невалидно потребителско име или парола', { type: 'error' });
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

        <p style={{ margin: '0 0 20px', color: '#d7e8ff', fontSize: 18, fontWeight: 500 }}>
          Платформа за планиране, графици и оперативен контрол.
        </p>
        <img
          src={companyLogoUrl}
          alt="Лого"
          style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            objectFit: 'cover',
            display: 'block',
            margin: '8px auto 14px',
            border: '2px solid rgba(255, 255, 255, 0.6)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
          }}
        />
        <h2
          style={{
            margin: '10px 0 6px',
            fontSize: 32,
            lineHeight: 1.05,
            fontWeight: 900,
            letterSpacing: '-0.02em',
          }}
        > Вход в системата
        </h2>


        <div>
          <form onSubmit={onSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="login-username" style={labelStyle}>
              Потребителско име
            </label>
            <input
              id="login-username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label htmlFor="login-password" style={labelStyle}>
              Парола
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          <button type="submit" style={buttonStyle} disabled={isSubmitting}>
            {isSubmitting ? 'Влизане...' : 'Влез'}
          </button>

          {allowRegistration && (
            <p
              style={{
                margin: '14px 0 0',
                textAlign: 'center',
                color: '#d7e8ff',
                fontSize: 13,
              }}
            >
              Нямате акаунт?{' '}
              <Link
                href="/admin/register"
                style={{ color: '#78d8ff', textDecoration: 'none', fontWeight: 700 }}
              >
                Регистрирайте се
              </Link>
            </p>
          )}
        </form>
        </div>
      </section>
    </main>
  );
};

export default CustomLoginPage;
