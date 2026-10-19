import React, { useState, useRef } from 'react';
import apiClient from '../api/apiClient';
import { UserProfile } from '../api/types';
import { Heart, ImagePlus, Loader2, ArrowRight } from 'lucide-react';

interface AuthScreenProps {
  onAuthSuccess: (profile: UserProfile) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onAuthSuccess,
}) => {
  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Login inputs
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register inputs
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState('MALE');
  const [interestedIn, setInterestedIn] = useState('EVERYONE');
  const [city, setCity] = useState('Mumbai, India');
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setErrorMessage('Please fill in email and password');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const auth = await apiClient.login({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      const profile = auth.profile || await apiClient.getMyProfile();
      onAuthSuccess(profile);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setErrorMessage('Please provide your name, email, and password.');
      return;
    }
    if (password.length < 3) {
      setErrorMessage('Password must be at least 3 characters.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      let initialPhotoUrl: string | undefined = undefined;

      // Upload registration photo if provided
      if (selectedPhotoFile) {
        try {
          const up = await apiClient.uploadRegistrationPhoto(selectedPhotoFile);
          initialPhotoUrl = up.photoUrl;
        } catch {
          // fallback to stock photo
        }
      }

      if (!initialPhotoUrl) {
        initialPhotoUrl = gender === 'MALE'
          ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800'
          : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800';
      }

      const auth = await apiClient.register({
        displayName: name.trim(),
        email: email.trim(),
        password,
        gender,
        interestedIn,
        birthDate: '2000-01-01',
        city: city.trim() || 'Mumbai, India',
        initialPhotoUrl,
        interestIds: [1, 2, 3],
      });

      const profile = auth.profile || await apiClient.getMyProfile();
      onAuthSuccess(profile);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      flex: 1,
      height: '100%',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '24px 16px',
      background: 'radial-gradient(circle at 50% 20%, rgba(255, 51, 102, 0.12) 0%, transparent 60%), radial-gradient(circle at 80% 80%, rgba(121, 40, 202, 0.1) 0%, transparent 60%), var(--bg-dark)',
      position: 'relative',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        margin: 'auto 0',
        backgroundColor: 'var(--surface-dark)',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(255, 51, 102, 0.1)',
        padding: '24px 20px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', margin: '8px 0 24px' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          background: 'var(--flame-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 14px',
          boxShadow: '0 8px 30px rgba(255, 51, 102, 0.45)',
        }}>
          <Heart size={34} fill="#ffffff" color="#ffffff" />
        </div>
        <h1 style={{
          fontSize: '34px',
          fontWeight: 900,
          letterSpacing: '3px',
          fontFamily: 'var(--font-family-display)',
        }} className="gradient-text-flame">
          VIBLY
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Discover genuine dating & social connections
        </p>
      </div>

      {/* Mode Switch Tabs */}
      <div style={{
        display: 'flex',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--surface-card)',
        padding: '4px',
        marginBottom: '20px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}>
        <button
          onClick={() => { setIsRegister(false); setErrorMessage(null); }}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: !isRegister ? 'var(--primary-pink)' : 'transparent',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '14px',
            transition: 'all 0.2s ease',
          }}
        >
          Sign In
        </button>
        <button
          onClick={() => { setIsRegister(true); setErrorMessage(null); }}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: isRegister ? 'var(--primary-pink)' : 'transparent',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '14px',
            transition: 'all 0.2s ease',
          }}
        >
          Create Account
        </button>
      </div>

      {errorMessage && (
        <div style={{
          backgroundColor: 'rgba(255, 69, 58, 0.12)',
          border: '1px solid rgba(255, 69, 58, 0.35)',
          color: 'var(--pass-red)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          fontSize: '13px',
          marginBottom: '16px',
          textAlign: 'center',
        }}>
          {errorMessage}
        </div>
      )}

      {/* Login Form */}
      {!isRegister ? (
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="user@datingsocial.com"
              required
              style={{
                width: '100%',
                padding: '13px 14px',
                fontSize: '14px',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '13px 14px',
                fontSize: '14px',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '15px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--flame-gradient)',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 6px 20px rgba(255, 51, 102, 0.4)',
              marginTop: '8px',
            }}
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <span>Sign In to Vibly</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      ) : (
        /* Register Form */
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Photo Picker */}
          <input
            type="file"
            ref={photoInputRef}
            accept="image/*"
            onChange={handlePhotoSelect}
            style={{ display: 'none' }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
            <div
              onClick={() => photoInputRef.current?.click()}
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                backgroundColor: 'var(--surface-card)',
                border: '2px dashed var(--primary-pink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <ImagePlus size={24} color="var(--primary-pink)" />
                  <div style={{ fontSize: '10px', marginTop: '2px' }}>Add Photo</div>
                </div>
              )}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Profile Photo (Optional)
            </span>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              FULL NAME
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maya Patel"
              required
              style={{ width: '100%', padding: '12px 14px', fontSize: '14px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="maya@example.com"
              required
              style={{ width: '100%', padding: '12px 14px', fontSize: '14px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ width: '100%', padding: '12px 14px', fontSize: '14px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                I AM A
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                style={{ width: '100%', padding: '12px', fontSize: '13px' }}
              >
                <option value="MALE" style={{ background: '#1E2130' }}>Man</option>
                <option value="FEMALE" style={{ background: '#1E2130' }}>Woman</option>
                <option value="NON_BINARY" style={{ background: '#1E2130' }}>Non-Binary</option>
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                SEEKING
              </label>
              <select
                value={interestedIn}
                onChange={(e) => setInterestedIn(e.target.value)}
                style={{ width: '100%', padding: '12px', fontSize: '13px' }}
              >
                <option value="EVERYONE" style={{ background: '#1E2130' }}>Everyone</option>
                <option value="FEMALE" style={{ background: '#1E2130' }}>Women</option>
                <option value="MALE" style={{ background: '#1E2130' }}>Men</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              CITY / LOCATION
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Mumbai, India"
              style={{ width: '100%', padding: '12px 14px', fontSize: '14px' }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '15px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--flame-gradient)',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 6px 20px rgba(255, 51, 102, 0.4)',
              marginTop: '10px',
            }}
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <span>Create Account & Join</span>
            )}
          </button>
        </form>
      )}
      </div>
    </div>
  );
};

