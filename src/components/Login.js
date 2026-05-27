import React, { useState } from 'react';
import '../styles/Login.css';
import Logo from './Logo';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    const success = await onLogin(username, password);
    if (!success) {
      setError('Invalid credentials. Please try again.');
      return;
    }

    setError('');
  };

  const bg = process.env.PUBLIC_URL + '/login-bg.jpg';

  return (
    <div
      className="login-screen"
      style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.35), rgba(255,255,255,0.35)), url(${bg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundBlendMode: 'normal'
      }}
    >
      <div className="login-card">
        <Logo />
        <h1>AgriTrack</h1>
        <p className="login-subtitle">Welcome back, Farmer!</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Enter username"
            autoComplete="username"
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter password"
            autoComplete="current-password"
            required
          />

          {error && <p className="login-error">{error}</p>}

          <button type="submit">Login</button>
        </form>

      </div>
    </div>
  );
}

export default Login;
