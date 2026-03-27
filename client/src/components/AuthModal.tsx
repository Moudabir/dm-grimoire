import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

interface AuthModalProps {
  onClose: () => void;
  isOpen: boolean;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotPass, setForgotPass] = useState(false);

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (forgotPass) {
        await sendPasswordResetEmail(auth, email);
        setError('Password reset email sent! Check your inbox.');
        setForgotPass(false);
      } else if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        onClose();
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await updateProfile(userCred.user, { displayName });
        }
        onClose();
      }
    } catch (err: any) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err: any) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-bg glass" style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-box glass" style={{ maxWidth: 400, width: '90%', padding: '24px', border: '1.5px solid var(--gold)' }}>
        <div className="modal-hdr">
          <span className="modal-ttl" style={{ fontFamily: 'Cinzel Decorative' }}>
            {forgotPass ? "RECOVER GRIMOIRE" : (isLogin ? "SIGN INTO GRIMOIRE" : "JOIN THE CIRCLE")}
          </span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
          {!isLogin && !forgotPass && (
            <input 
              className="ninput" 
              placeholder="Display Name" 
              value={displayName} 
              onChange={e => setDisplayName(e.target.value)}
              required 
            />
          )}
          <input 
            className="ninput" 
            type="email" 
            placeholder="Email Address" 
            value={email} 
            onChange={e => setEmail(e.target.value)}
            required 
          />
          {!forgotPass && (
            <input 
              className="ninput" 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              required 
            />
          )}

          {error && <div style={{ color: '#ff6b6b', fontSize: '0.8rem', textAlign: 'center' }}>{error}</div>}

          <button className="cbtn btn-gld" disabled={loading} type="submit" style={{ marginTop: 8 }}>
            {loading ? "COMMUNING..." : (forgotPass ? "SEND RESET LINK" : (isLogin ? "DESCEND" : "ASCEND"))}
          </button>
        </form>

        {!forgotPass && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(201,162,39,0.2)' }} />
              <span style={{ fontSize: '0.65rem', color: 'rgba(244,228,193,0.4)', fontFamily: 'Cinzel' }}>OR CONTINUE WITH</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(201,162,39,0.2)' }} />
            </div>

            <button className="cbtn btn-ol" onClick={handleGoogle} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115z" />
                <path fill="#34A853" d="M16.04 18.013c-1.09.603-2.404.603-3.497 0l-4.03 3.116c2.043 1.56 4.61 2.477 7.427 2.477 4.73 0 8.802-2.698 10.76-6.65L22.674 13.5c-.876 2.417-3.085 4.091-5.634 4.513z" />
                <path fill="#4285F4" d="M23.49 12.273c0-.818-.073-1.609-.21-2.373H12v4.5h6.489c-.291 1.564-1.173 2.882-2.489 3.736l4.03 3.116C22.043 19.56 24 16.477 24 12.273z" />
                <path fill="#FBBC05" d="M5.266 14.235L1.24 17.35c1.958 3.952 6.03 6.65 10.76 6.65 2.817 0 5.384-.917 7.427-2.477l-4.03-3.116c-1.093.603-2.407.603-3.5 0-2.549-.422-4.758-2.096-5.634-4.513z" />
              </svg>
              Google Account
            </button>
          </>
        )}

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: '0.75rem', color: 'rgba(244,228,193,0.6)' }}>
          {forgotPass ? (
            <span style={{ cursor: 'pointer', color: 'var(--gold)' }} onClick={() => setForgotPass(false)}>Back to Login</span>
          ) : (
            <>
              {isLogin ? "New to the Grimoire? " : "Already have a key? "}
              <span style={{ cursor: 'pointer', color: 'var(--gold)', textDecoration: 'underline' }} onClick={() => setIsLogin(!isLogin)}>
                {isLogin ? "Join the Circle" : "Sign In"}
              </span>
              <br />
              {isLogin && (
                <span style={{ cursor: 'pointer', color: 'rgba(244,228,193,0.4)', fontSize: '0.65rem', marginTop: 8, display: 'inline-block' }} onClick={() => setForgotPass(true)}>
                  Lost your key?
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
