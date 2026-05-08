import { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LogIn } from 'lucide-react-native';
import { z } from 'zod';
import {
  TVCheckbox,
  TVPressable,
  TVScreen,
  TVText,
  TVTextField,
} from '@/components/tv';
import { TVFocusColumn } from '@/components/tv/TVFocusRow';
import { Logo } from '@/components/Logo';
import { tokens } from '@/design/tokens';
import { prefs } from '@/lib/storage';
import { clearCredentials, loadCredentials } from '@/lib/secure-store';
import { classifyLoginError, useLogin } from '@/features/auth/use-login';

const formSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

type InitialFocus = 'email' | 'password' | 'submit';

export default function LoginScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(prefs.getRememberMe());
  const [validationError, setValidationError] = useState<{ email?: string; password?: string }>(
    {},
  );
  const [bootstrapped, setBootstrapped] = useState(false);
  const initialFocusRef = useRef<InitialFocus>('email');

  const passwordRef = useRef<TextInput>(null);
  const login = useLogin();

  useEffect(() => {
    void (async () => {
      const stored = await loadCredentials();
      if (stored) {
        setEmail(stored.email);
        setPassword(stored.password);
        setRememberMe(true);
        initialFocusRef.current = 'submit';
      } else {
        initialFocusRef.current = 'email';
      }
      setBootstrapped(true);
    })();
  }, []);

  useEffect(() => {
    if (!bootstrapped || rememberMe) return;
    void clearCredentials();
    prefs.setRememberMe(false);
  }, [bootstrapped, rememberMe]);

  const submit = () => {
    const parsed = formSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errs: { email?: string; password?: string } = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === 'email') errs.email = t('auth.login.errors.invalidCredentials');
        if (issue.path[0] === 'password') errs.password = t('auth.login.errors.invalidCredentials');
      }
      setValidationError(errs);
      return;
    }
    setValidationError({});
    login.mutate({ email: parsed.data.email, password: parsed.data.password, rememberMe });
  };

  const errorKind = login.error ? classifyLoginError(login.error) : null;
  const errorMessage = errorKind ? t(`auth.login.errors.${errorKind}`) : null;

  const initialFocus = initialFocusRef.current;

  return (
    <TVScreen fullBleed className="bg-bg px-safe-x pb-safe-y pt-16">
      <View className="flex-row items-center justify-center gap-6">
        <Logo height={110} />
        <TVText variant="display">
          <Text style={{ color: '#35B6B0' }}>Tractive</Text>
          {' On '}
          <Text style={{ color: '#35B6B0' }}>TV</Text>
        </TVText>
      </View>

      {bootstrapped ? (
      <View className="flex-1 flex-row gap-16 mt-8 items-start">
        <View className="flex-1">
          <TVFocusColumn gap="md" trapEdges>
            <TVTextField
              label={t('auth.login.email')}
              placeholder={t('auth.login.emailPlaceholder')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              hasTVPreferredFocus={initialFocus === 'email'}
              error={validationError.email}
            />

            <TVTextField
              inputRef={passwordRef}
              label={t('auth.login.password')}
              placeholder={t('auth.login.passwordPlaceholder')}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoComplete="password"
              autoCorrect={false}
              secureTextEntry
              returnKeyType="go"
              onSubmitEditing={submit}
              hasTVPreferredFocus={initialFocus === 'password'}
              error={validationError.password}
            />

            {errorMessage ? (
              <View className="rounded-xl border border-danger bg-danger/10 p-3">
                <TVText variant="body" tone="danger">
                  {errorMessage}
                </TVText>
              </View>
            ) : null}

            <TVPressable
              variant="primary"
              size="lg"
              onPress={submit}
              hasTVPreferredFocus={initialFocus === 'submit'}
              disabled={login.isPending}
            >
              <LogIn color={tokens.colors.text.DEFAULT} size={24} strokeWidth={2.5} />
              <TVText variant="label">
                {login.isPending ? t('auth.login.submitting') : t('auth.login.submit')}
              </TVText>
            </TVPressable>
          </TVFocusColumn>
        </View>

        <View className="flex-1">
          <TVText variant="micro" className="mb-2 opacity-0">
            {' '}
          </TVText>
          <TVCheckbox
            checked={rememberMe}
            onChange={setRememberMe}
            label={t('auth.login.rememberMe')}
            hint={t('auth.login.rememberMeHint')}
          />
          <TVText variant="caption" tone="subtle" className="text-center mt-6">
            {t('auth.login.forgotPassword')}
          </TVText>
        </View>
      </View>
      ) : null}
    </TVScreen>
  );
}
