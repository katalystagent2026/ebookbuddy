import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        // Get the token from URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type') || queryParams.get('type');
        const tokenHash = queryParams.get('token_hash');
        const error = hashParams.get('error') || queryParams.get('error');
        const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');

        if (error) {
          setStatus('error');
          setMessage(errorDescription || 'An error occurred during verification');
          return;
        }

        // Handle PKCE flow (token_hash in query params)
        if (tokenHash && type) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as 'email' | 'recovery' | 'invite' | 'magiclink' | 'signup' | 'email_change',
          });

          if (verifyError) {
            setStatus('error');
            setMessage(verifyError.message);
            return;
          }

          if (type === 'recovery') {
            // Navigate immediately so session is still active for password update
            navigate('/reset-password');
            return;
          }
          setStatus('success');
          if (type !== 'recovery') {
            setMessage('Email verified successfully! Redirecting to login...');
            setTimeout(() => navigate('/login'), 2000);
          }
          return;
        }

        // Handle implicit flow (tokens in hash)
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            setStatus('error');
            setMessage(sessionError.message);
            return;
          }

          if (type === 'recovery') {
            navigate('/reset-password');
            return;
          }
          setStatus('success');
          setMessage('Email verified successfully! Redirecting...');
          setTimeout(() => navigate('/'), 2000);
          return;
        }

        // No valid tokens found
        setStatus('error');
        setMessage('Invalid or expired verification link');
      } catch (err) {
        console.error('Auth callback error:', err);
        setStatus('error');
        setMessage('An unexpected error occurred');
      }
    };

    handleEmailVerification();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex flex-col items-center gap-4">
            {status === 'loading' && (
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
            )}
            {status === 'success' && (
              <CheckCircle className="w-12 h-12 text-green-500" />
            )}
            {status === 'error' && (
              <XCircle className="w-12 h-12 text-destructive" />
            )}
            <span>
              {status === 'loading' && 'Verifying...'}
              {status === 'success' && 'Success!'}
              {status === 'error' && 'Verification Failed'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{message}</p>
          {status === 'error' && (
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate('/login')}>
                Go to Login
              </Button>
              <Button variant="outline" onClick={() => navigate('/signup')}>
                Sign Up Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
